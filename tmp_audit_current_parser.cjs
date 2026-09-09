const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || "C:/Users/vinic/Desktop/3m";
const IDS = ["1633154", "1718028", "1703956", "1704477"];
const CONFIGURED = new Set(IDS);

const sanitizeHandHistoryText = (value) =>
  value
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

const decodeHandHistoryBuffer = (buffer) => {
  const candidates = ["utf-8", "utf-16le", "utf-16be"];
  let bestText = "";
  let bestScore = -1;

  for (const encoding of candidates) {
    try {
      const decoded = sanitizeHandHistoryText(new TextDecoder(encoding).decode(buffer));
      const headers = (decoded.match(/SupremaPoker Hand #\d+/g) || []).length;
      const dealt = (decoded.match(/Dealt\s+to\s+\d+/gi) || []).length;
      const score = (headers * 10) + dealt;
      if (score > bestScore) {
        bestScore = score;
        bestText = decoded;
      }
    } catch {
      // Ignore decode attempts that fail.
    }
  }

  return bestText || sanitizeHandHistoryText(new TextDecoder().decode(buffer));
};

const splitHandBlocksCurrent = (content) =>
  sanitizeHandHistoryText(content)
    .split(/(?=SupremaPoker Hand #\d+:)/g)
    .map((block) => block.trim())
    .filter((block) => block.startsWith("SupremaPoker Hand #"));

const splitHandBlocksTolerant = (content) => {
  const normalized = sanitizeHandHistoryText(content);
  const matches = normalized.match(/SupremaPoker Hand #\d+:[\s\S]*?(?=\nSupremaPoker Hand #\d+:|$)/g);
  return (matches || []).map((block) => block.trim()).filter(Boolean);
};

const extractHeroAccountIdCurrent = (block) =>
  (block.match(/Dealt\s+to\s+(\d+)\s+\[/i)?.[1] || "").trim();

const extractHeroAccountIdTolerant = (block) => {
  const normalized = block.replace(/[\u00A0\t]+/g, " ");
  const match = normalized.match(/Dealt\s*to\s*(\d+)\b/i);
  return (match?.[1] || "").trim();
};

const parseUtcTimestamp = (raw) => {
  const normalized = raw.replace(/\//g, "-").replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseUtcTimestampLoose = (raw) => {
  const match = raw.match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseTimestampsCurrent = (block) => {
  const headerLine = block.split("\n")[0] || "";
  const startMatch = headerLine.match(
    /-\s*(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}:\d{2})(?:\s+UTC)?/
  );
  const endMatch = block.match(
    /Hand ended at\s+(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}:\d{2})(?:\s+UTC)?/
  );
  const parsedStart = startMatch ? parseUtcTimestamp(startMatch[1]) : null;
  const parsedEnd = endMatch ? parseUtcTimestamp(endMatch[1]) : null;
  return {
    start: parsedStart || parsedEnd,
    end: parsedEnd || parsedStart,
    headerLine,
    endLine: endMatch?.[0] || null,
  };
};

const parseTimestampsTolerant = (block) => {
  const normalized = block.replace(/[\u00A0\t]+/g, " ");
  const headerLine = normalized.split("\n")[0] || "";
  const allTimestampMatches = Array.from(
    normalized.matchAll(/(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}:\d{2})(?:\s+UTC)?/g)
  );
  const start = allTimestampMatches[0]?.[1] ? parseUtcTimestampLoose(allTimestampMatches[0][1]) : null;
  const end = allTimestampMatches[allTimestampMatches.length - 1]?.[1]
    ? parseUtcTimestampLoose(allTimestampMatches[allTimestampMatches.length - 1][1])
    : null;
  return {
    start: start || end,
    end: end || start,
    headerLine,
    endLine: allTimestampMatches[allTimestampMatches.length - 1]?.[1] || null,
  };
};

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/^SupremaPoker_.*\.txt$/i.test(entry.name)) {
      out.push(full);
    }
  }
}

const createModeCounters = () => ({
  total_blocks: 0,
  unique_hand_ids_any_block: new Set(),
  dealt_to_by_id: Object.fromEntries(IDS.map((id) => [id, 0])),
  discarded_no_dealt_to: 0,
  discarded_unconfigured_dealt_to: 0,
  discarded_hand_id_parse: 0,
  discarded_timestamp: 0,
  discarded_other: 0,
  matched_blocks_before_dedup: 0,
  unique_matched_hand_ids: new Set(),
  duplicate_matched_hand_ids: 0,
  files_with_target_ids: new Set(),
  examples: {
    no_dealt_to: [],
    unconfigured_dealt_to: [],
    hand_id_parse: [],
    timestamp: [],
  },
});

const pushExample = (bucket, value) => {
  if (bucket.length < 5) bucket.push(value);
};

const sumSessionHours = (sessions) =>
  sessions.reduce((total, session) => {
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    return total + Math.max(0, end - start) / (1000 * 60 * 60);
  }, 0);

const buildImportedSessionsAppStyle = (hands, gapMinutes) => {
  const groups = new Map();

  for (const hand of hands) {
    const tableKey = hand.tableName || "mesa-desconhecida";
    const stakeKey = hand.stake || "stake-desconhecido";
    const key = `${hand.accountExternalId}||${tableKey}||${stakeKey}`;
    const list = groups.get(key) || [];
    list.push(hand);
    groups.set(key, list);
  }

  const sessions = [];

  for (const groupHands of groups.values()) {
    const sortedHands = [...groupHands].sort((a, b) => a.start.getTime() - b.start.getTime());
    let current = null;

    for (const hand of sortedHands) {
      if (!current) {
        current = {
          accountExternalId: hand.accountExternalId,
          startTime: hand.start.toISOString(),
          endTime: hand.end.toISOString(),
          hands: 1,
        };
        sessions.push(current);
        continue;
      }

      const currentEnd = new Date(current.endTime).getTime();
      const gap = (hand.start.getTime() - currentEnd) / (1000 * 60);
      if (gap <= gapMinutes) {
        current.endTime = new Date(Math.max(currentEnd, hand.end.getTime())).toISOString();
        current.hands += 1;
        continue;
      }

      current = {
        accountExternalId: hand.accountExternalId,
        startTime: hand.start.toISOString(),
        endTime: hand.end.toISOString(),
        hands: 1,
      };
      sessions.push(current);
    }
  }

  return sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

const buildPersonIntervals = (hands, gapMinutes) => {
  const groups = new Map();

  for (const hand of hands) {
    const tableKey = hand.tableName || "mesa-desconhecida";
    const stakeKey = hand.stake || "stake-desconhecido";
    const key = `${tableKey}||${stakeKey}`;
    const list = groups.get(key) || [];
    list.push(hand);
    groups.set(key, list);
  }

  const intervals = [];

  for (const groupHands of groups.values()) {
    const sortedHands = [...groupHands].sort((a, b) => a.start.getTime() - b.start.getTime());
    let current = null;

    for (const hand of sortedHands) {
      if (!current) {
        current = { start: hand.start, end: hand.end };
        intervals.push(current);
        continue;
      }

      const gap = (hand.start.getTime() - current.end.getTime()) / (1000 * 60);
      if (gap <= gapMinutes) {
        if (hand.end.getTime() > current.end.getTime()) current.end = hand.end;
        continue;
      }

      current = { start: hand.start, end: hand.end };
      intervals.push(current);
    }
  }

  return intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
};

const mergeIntervals = (intervals) => {
  if (intervals.length === 0) return [];
  const merged = [{ start: intervals[0].start, end: intervals[0].end }];

  for (const interval of intervals.slice(1)) {
    const last = merged[merged.length - 1];
    if (interval.start.getTime() <= last.end.getTime()) {
      if (interval.end.getTime() > last.end.getTime()) last.end = interval.end;
      continue;
    }
    merged.push({ start: interval.start, end: interval.end });
  }

  return merged;
};

const sumIntervalHours = (intervals) =>
  intervals.reduce((total, interval) => total + ((interval.end.getTime() - interval.start.getTime()) / (1000 * 60 * 60)), 0);

const buildSensitivityHours = (hands) => {
  const gaps = [5, 10, 15, 20, 30];
  return Object.fromEntries(
    gaps.map((gap) => {
      const appHours = sumSessionHours(buildImportedSessionsAppStyle(hands, gap));
      const personHours = sumIntervalHours(mergeIntervals(buildPersonIntervals(hands, gap)));
      return [gap, { app_style_hours: appHours, person_union_hours: personHours }];
    })
  );
};

const auditMode = (label, files, options) => {
  const counters = createModeCounters();
  const matchedById = new Map(IDS.map((id) => [id, new Set()]));
  const records = [];

  for (const file of files) {
    const content = decodeHandHistoryBuffer(fs.readFileSync(file));
    const blocks = options.splitHandBlocks(content);
    counters.total_blocks += blocks.length;

    for (const block of blocks) {
      const handIdMatch = block.match(/SupremaPoker Hand #(\d+)/);
      const handId = handIdMatch?.[1] || null;
      if (handId) counters.unique_hand_ids_any_block.add(handId);

      const heroId = options.extractHeroAccountId(block);
      if (!heroId) {
        counters.discarded_no_dealt_to += 1;
        pushExample(counters.examples.no_dealt_to, {
          file: path.basename(file),
          head: block.split("\n").slice(0, 6),
        });
        continue;
      }

      if (counters.dealt_to_by_id[heroId] !== undefined) {
        counters.dealt_to_by_id[heroId] += 1;
      }

      if (!CONFIGURED.has(heroId)) {
        counters.discarded_unconfigured_dealt_to += 1;
        pushExample(counters.examples.unconfigured_dealt_to, {
          file: path.basename(file),
          heroId,
          handId,
        });
        continue;
      }

      counters.files_with_target_ids.add(file);

      if (!handId) {
        counters.discarded_hand_id_parse += 1;
        pushExample(counters.examples.hand_id_parse, {
          file: path.basename(file),
          heroId,
          head: block.split("\n")[0],
        });
        continue;
      }

      const timestamps = options.parseTimestamps(block);
      if (!timestamps.start || !timestamps.end) {
        counters.discarded_timestamp += 1;
        pushExample(counters.examples.timestamp, {
          file: path.basename(file),
          heroId,
          handId,
          headerLine: timestamps.headerLine,
          endLine: timestamps.endLine,
        });
        continue;
      }

      counters.matched_blocks_before_dedup += 1;
      matchedById.get(heroId).add(handId);
      const tableName = block.match(/Table '([^']+)'/)?.[1] || null;
      const stake = block.match(/5 Card Omaha Pot Limit \(([^)]+)\)/)?.[1] || null;
      records.push({
        handId,
        accountExternalId: heroId,
        start: timestamps.start,
        end: timestamps.end.getTime() < timestamps.start.getTime() ? timestamps.start : timestamps.end,
        tableName,
        stake,
      });
      if (counters.unique_matched_hand_ids.has(handId)) {
        counters.duplicate_matched_hand_ids += 1;
      } else {
        counters.unique_matched_hand_ids.add(handId);
      }
    }
  }

  return {
    mode: label,
    total_blocks: counters.total_blocks,
    unique_hand_ids_any_block: counters.unique_hand_ids_any_block.size,
    dealt_to_by_id: counters.dealt_to_by_id,
    discarded_no_dealt_to: counters.discarded_no_dealt_to,
    discarded_unconfigured_dealt_to: counters.discarded_unconfigured_dealt_to,
    discarded_hand_id_parse: counters.discarded_hand_id_parse,
    discarded_timestamp: counters.discarded_timestamp,
    discarded_other: counters.discarded_other,
    matched_blocks_before_dedup: counters.matched_blocks_before_dedup,
    unique_matched_hand_ids: counters.unique_matched_hand_ids.size,
    duplicate_matched_hand_ids: counters.duplicate_matched_hand_ids,
    files_with_target_ids: counters.files_with_target_ids.size,
    matched_unique_by_id: Object.fromEntries(
      Array.from(matchedById.entries()).map(([id, set]) => [id, set.size])
    ),
    hand_ids: counters.unique_matched_hand_ids,
    records,
    examples: counters.examples,
  };
};

const files = [];
walk(ROOT, files);
files.sort();

const rawHeaderOccurrences = files.reduce((count, file) => {
  const content = decodeHandHistoryBuffer(fs.readFileSync(file));
  return count + (content.match(/SupremaPoker Hand #\d+:/g) || []).length;
}, 0);

const current = auditMode("current_app_logic", files, {
  splitHandBlocks: splitHandBlocksCurrent,
  extractHeroAccountId: extractHeroAccountIdCurrent,
  parseTimestamps: parseTimestampsCurrent,
});

const tolerant = auditMode("tolerant_audit_logic", files, {
  splitHandBlocks: splitHandBlocksTolerant,
  extractHeroAccountId: extractHeroAccountIdTolerant,
  parseTimestamps: parseTimestampsTolerant,
});

const recoveredHandIds = Array.from(tolerant.hand_ids).filter((handId) => !current.hand_ids.has(handId));
const recoveredById = Object.fromEntries(
  IDS.map((id) => {
    const tolerantIdSet = new Set();
    const currentIdSet = new Set();

    for (const file of files) {
      const content = decodeHandHistoryBuffer(fs.readFileSync(file));
      const blocks = splitHandBlocksTolerant(content);
      for (const block of blocks) {
        const handId = block.match(/SupremaPoker Hand #(\d+)/)?.[1];
        if (!handId) continue;
        const tolerantHeroId = extractHeroAccountIdTolerant(block);
        const currentHeroId = extractHeroAccountIdCurrent(block);
        if (tolerantHeroId === id) tolerantIdSet.add(handId);
        if (currentHeroId === id) currentIdSet.add(handId);
      }
    }

    return [id, Array.from(tolerantIdSet).filter((handId) => !currentIdSet.has(handId)).length];
  })
);

const result = {
  root: ROOT,
  files_scanned: files.length,
  raw_hand_header_occurrences: rawHeaderOccurrences,
  current: {
    ...current,
    hand_ids: undefined,
    records: undefined,
    app_style_hours_15m: sumSessionHours(buildImportedSessionsAppStyle(current.records, 15)),
    person_union_hours_15m: sumIntervalHours(mergeIntervals(buildPersonIntervals(current.records, 15))),
  },
  tolerant: {
    ...tolerant,
    hand_ids: undefined,
    records: undefined,
    app_style_hours_15m: sumSessionHours(buildImportedSessionsAppStyle(tolerant.records, 15)),
    person_union_hours_15m: sumIntervalHours(mergeIntervals(buildPersonIntervals(tolerant.records, 15))),
    sensitivity_hours: buildSensitivityHours(tolerant.records),
  },
  comparison: {
    split_loss_vs_raw_headers: rawHeaderOccurrences - current.total_blocks,
    additional_unique_hands_recovered: tolerant.unique_matched_hand_ids - current.unique_matched_hand_ids,
    recovered_unique_hands_sample: recoveredHandIds.slice(0, 20),
    recovered_unique_hands_by_id: recoveredById,
  },
};

console.log(JSON.stringify(result, null, 2));
