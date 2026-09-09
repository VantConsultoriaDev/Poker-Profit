"use client";

import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Globe,
  Plus,
  Trash2,
  DollarSign,
  RefreshCw,
  ShieldCheck,
  Users,
  Target,
  TrendingDown,
  History,
  Archive,
  FolderOpen,
  Loader2,
  Upload
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';

const PLO_LIMITS = [
  "PLO20", "PLO40", "PLO60", "PLO80", "PLO100", "PLO200", "PLO400", "PLO600", "PLO1000"
];

const IMPORTED_LIMIT_NAME = 'IMPORTADO HH';
const IMPORT_DEFAULT_GAP_MINUTES = 15;
const IMPORT_SENSITIVITY_GAPS = [5, 10, 15, 20, 30] as const;
const MAX_UPLOAD_FILE_BYTES = 100 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 5000;
const MAX_EXTRACTED_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_EXTRACTED_BYTES = 250 * 1024 * 1024;

type UploadedTextFile = {
  name: string;
  content: string;
};

type ParsedImportedSession = {
  accountExternalId: string;
  accountExternalIds: string[];
  startTime: string;
  endTime: string;
  hands: number;
};

type ParsedHandRecord = {
  uniqueKey: string;
  handId: string | null;
  fileName: string;
  start: Date;
  end: Date;
  accountExternalId: string;
  primaryAccountExternalId: string;
  tableName: string | null;
  stake: string | null;
  participantIds: string[];
};

type FileImportAnalysis = {
  name: string;
  handsInFile: number;
  matchingHandsInFile: number;
  duplicateMatchingHandsInFile: number;
  idsFound: string[];
  occurrencesById: Record<string, number>;
  firstHandAt: string | null;
  lastHandAt: string | null;
  duplicateOf: string | null;
};

type ImportIdRow = {
  accountId: string;
  found: boolean;
  hands: number;
  firstHandAt: string | null;
  lastHandAt: string | null;
  estimatedHours: number;
};

type ImportDayRow = {
  date: string;
  hands: number;
  accountIds: string[];
  startTime: string | null;
  endTime: string | null;
  estimatedHours: number;
};

type ImportSummary = {
  configuredAccountIds: string[];
  matchedAccountIds: string[];
  missingAccountIds: string[];
  handsByAccountId: Record<string, number>;
  hoursByAccountId: Record<string, number>;
  idRows: ImportIdRow[];
  dayRows: ImportDayRow[];
  fileAnalyses: FileImportAnalysis[];
  sensitivityHours: Record<number, number>;
  duplicateFiles: Array<{ name: string; duplicateOf: string }>;
  filesProcessed: number;
  handsFound: number;
  duplicateHandsIgnored: number;
  totalHours: number;
  chosenGapMinutes: number;
  firstHandAt: string | null;
  lastHandAt: string | null;
  sessionsFound: number;
  sessionsImported: number;
  sessionsSkipped: number;
};

type DatabaseUpload = {
  id: string;
  source_name: string | null;
  file_count: number;
  hands_found: number;
  total_hours: number;
  sessions_found: number;
  sessions_imported: number;
  account_external_ids: string[] | null;
  matched_account_external_ids: string[] | null;
  missing_account_external_ids: string[] | null;
  hands_by_account_id: Record<string, number> | null;
  hours_by_account_id: Record<string, number> | null;
  created_at: string;
};

const normalizeAccountExternalId = (value: string) => value.trim();

const parseUtcTimestamp = (raw: string) => {
  const match = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ));
  return Number.isNaN(date.getTime()) ? null : date;
};

const sanitizeHandHistoryText = (value: string) => {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
};

const decodeHandHistoryBuffer = (buffer: ArrayBuffer) => {
  const candidates = ['utf-8', 'utf-16le', 'utf-16be'] as const;
  let bestText = '';
  let bestScore = -1;

  for (const encoding of candidates) {
    try {
      const decoded = sanitizeHandHistoryText(new TextDecoder(encoding).decode(buffer));
      const handHeaders = (decoded.match(/SupremaPoker Hand #\d+/g) || []).length;
      const dealtToCount = (decoded.match(/Dealt\s*to\s*\d+\b/g) || []).length;
      const score = handHeaders * 10 + dealtToCount;

      if (score > bestScore) {
        bestScore = score;
        bestText = decoded;
      }
    } catch {
      // Ignore unsupported encodings and keep the best successful decode.
    }
  }

  return bestText || sanitizeHandHistoryText(new TextDecoder().decode(buffer));
};

const looksLikeHandHistory = (content: string) => {
  const normalized = sanitizeHandHistoryText(content);
  return /SupremaPoker Hand #\d+/i.test(normalized) || /Dealt\s*to\s*\d+\b/i.test(normalized);
};

const splitHandBlocks = (content: string) => {
  const normalized = sanitizeHandHistoryText(content);
  return normalized
    .split(/(?=SupremaPoker Hand #\d+:)/g)
    .map((block) => block.trim())
    .filter((block) => block.startsWith('SupremaPoker Hand #'));
};

const extractDealtToAccountId = (block: string) => {
  const dealtMatch = block.replace(/[\u00A0\t]+/g, ' ').match(/Dealt\s*to\s*(\d+)\b/i);
  return dealtMatch?.[1] ? normalizeAccountExternalId(dealtMatch[1]) : '';
};

const extractParticipantIds = (block: string) => {
  const ids = new Set<string>();
  for (const match of block.matchAll(/^Seat\s+\d+:\s+(\d+)\b/gm)) {
    ids.add(normalizeAccountExternalId(match[1]));
  }

  const dealtToAccountId = extractDealtToAccountId(block);
  if (dealtToAccountId) ids.add(dealtToAccountId);

  return Array.from(ids);
};

const extractHeroAccountId = (block: string) => {
  return extractDealtToAccountId(block);
};

const computeSimpleHash = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return String(hash >>> 0);
};

const generateUploadId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  const fallback = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
  return fallback;
};

const parseMatchedHand = (block: string, fileName: string, configuredIds: Set<string>): ParsedHandRecord | null => {
  const handIdMatch = block.match(/SupremaPoker Hand #(\d+)/);
  const handId = handIdMatch?.[1] || null;
  const heroAccountId = extractHeroAccountId(block);
  if (!heroAccountId || !configuredIds.has(heroAccountId)) return null;
  const participantIds = extractParticipantIds(block);

  const headerLine = block.split('\n')[0] || '';
  const startMatch = headerLine.match(/-\s*(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}:\d{2})(?:\s+UTC)?/);
  const endMatch = block.match(/Hand ended at\s+(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}:\d{2})(?:\s+UTC)?/);
  const parsedStart = startMatch ? parseUtcTimestamp(startMatch[1]) : null;
  const parsedEnd = endMatch ? parseUtcTimestamp(endMatch[1]) : null;
  const start = parsedStart || parsedEnd;
  const end = parsedEnd || parsedStart;
  if (!start || !end) return null;

  const tableMatch = block.match(/Table '([^']+)'/);
  const stakeMatch = block.match(/5 Card Omaha Pot Limit \(([^)]+)\)/);

  return {
    uniqueKey: handId || `${computeSimpleHash(block)}|${fileName}`,
    handId,
    fileName,
    start,
    end: end < start ? start : end,
    accountExternalId: heroAccountId,
    primaryAccountExternalId: heroAccountId,
    tableName: tableMatch?.[1] || null,
    stake: stakeMatch?.[1] || null,
    participantIds,
  };
};

const buildImportedSessions = (hands: ParsedHandRecord[], gapMinutes: number): ParsedImportedSession[] => {
  const groups = new Map<string, ParsedHandRecord[]>();
  hands.forEach((hand) => {
    const tableKey = hand.tableName || 'mesa-desconhecida';
    const stakeKey = hand.stake || 'stake-desconhecido';
    const key = `${hand.accountExternalId}||${tableKey}||${stakeKey}`;
    const list = groups.get(key) || [];
    list.push(hand);
    groups.set(key, list);
  });

  const sessions: ParsedImportedSession[] = [];
  groups.forEach((groupHands) => {
    const sortedHands = [...groupHands].sort((a, b) => a.start.getTime() - b.start.getTime());
    let current: ParsedImportedSession | null = null;

    sortedHands.forEach((hand) => {
      if (!current) {
        current = {
          accountExternalId: hand.accountExternalId,
          accountExternalIds: [hand.accountExternalId],
          startTime: hand.start.toISOString(),
          endTime: hand.end.toISOString(),
          hands: 1,
        };
        sessions.push(current);
        return;
      }

      const currentEnd = new Date(current.endTime).getTime();
      const gap = (hand.start.getTime() - currentEnd) / (1000 * 60);
      if (gap <= gapMinutes) {
        current.endTime = new Date(Math.max(currentEnd, hand.end.getTime())).toISOString();
        current.hands += 1;
        return;
      }

      current = {
        accountExternalId: hand.accountExternalId,
        accountExternalIds: [hand.accountExternalId],
        startTime: hand.start.toISOString(),
        endTime: hand.end.toISOString(),
        hands: 1,
      };
      sessions.push(current);
    });
  });

  return sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

const sumSessionHours = (sessions: ParsedImportedSession[]) => {
  const intervals = sessions
    .map((session) => ({
      start: new Date(session.startTime).getTime(),
      end: new Date(session.endTime).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  intervals.forEach((interval) => {
    const normalized = { start: interval.start, end: Math.max(interval.start, interval.end) };
    const last = merged[merged.length - 1];
    if (!last || normalized.start > last.end) {
      merged.push(normalized);
      return;
    }

    last.end = Math.max(last.end, normalized.end);
  });

  return merged.reduce((acc, interval) => {
    return acc + Math.max(0, (interval.end - interval.start) / (1000 * 60 * 60));
  }, 0);
};

const buildDayRows = (hands: ParsedHandRecord[], gapMinutes: number): ImportDayRow[] => {
  const days = new Map<string, ParsedHandRecord[]>();
  hands.forEach((hand) => {
    const dayKey = hand.start.toISOString().slice(0, 10);
    const list = days.get(dayKey) || [];
    list.push(hand);
    days.set(dayKey, list);
  });

  return Array.from(days.entries())
    .map(([date, dayHands]) => {
      const sessions = buildImportedSessions(dayHands, gapMinutes);
      const ids = Array.from(new Set(dayHands.map((hand) => hand.accountExternalId))).sort();
      return {
        date,
        hands: dayHands.length,
        accountIds: ids,
        startTime: sessions[0]?.startTime || null,
        endTime: sessions[sessions.length - 1]?.endTime || null,
        estimatedHours: sumSessionHours(sessions),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
};

const analyzeImportedDatabase = (files: UploadedTextFile[], configuredAccountIds: string[]) => {
  const configuredIds = new Set(configuredAccountIds.map(normalizeAccountExternalId).filter(Boolean));
  const uniqueHands = new Map<string, ParsedHandRecord>();
  const matchedIds = new Set<string>();
  const handsByAccountId: Record<string, number> = {};
  const firstHandByAccountId: Record<string, string | null> = {};
  const lastHandByAccountId: Record<string, string | null> = {};
  const fileAnalyses: FileImportAnalysis[] = [];
  const fingerprintToFile = new Map<string, string>();
  let duplicateHandsIgnored = 0;

  for (const file of files) {
    const normalizedContent = file.content.replace(/\r\n/g, '\n');
    const fingerprint = computeSimpleHash(normalizedContent);
    const duplicateOf = fingerprintToFile.get(fingerprint) || null;
    if (!duplicateOf) fingerprintToFile.set(fingerprint, file.name);

    const blocks = splitHandBlocks(normalizedContent);
    const occurrencesById: Record<string, number> = {};
    const idsFound = new Set<string>();
    let matchingHandsInFile = 0;
    let duplicateMatchingHandsInFile = 0;
    let firstHandAt: string | null = null;
    let lastHandAt: string | null = null;

    for (const block of blocks) {
      const parsed = parseMatchedHand(block, file.name, configuredIds);
      if (!parsed) continue;

      matchingHandsInFile += 1;
      occurrencesById[parsed.accountExternalId] = (occurrencesById[parsed.accountExternalId] || 0) + 1;
      idsFound.add(parsed.accountExternalId);

      const startIso = parsed.start.toISOString();
      if (!firstHandAt || startIso < firstHandAt) firstHandAt = startIso;
      if (!lastHandAt || startIso > lastHandAt) lastHandAt = startIso;

      if (uniqueHands.has(parsed.uniqueKey)) {
        duplicateMatchingHandsInFile += 1;
        duplicateHandsIgnored += 1;
        continue;
      }

      uniqueHands.set(parsed.uniqueKey, parsed);
      const accountId = parsed.accountExternalId;
      matchedIds.add(accountId);
      handsByAccountId[accountId] = (handsByAccountId[accountId] || 0) + 1;
      const handStartIso = parsed.start.toISOString();
      if (!firstHandByAccountId[accountId] || handStartIso < (firstHandByAccountId[accountId] || '')) {
        firstHandByAccountId[accountId] = handStartIso;
      }
      if (!lastHandByAccountId[accountId] || handStartIso > (lastHandByAccountId[accountId] || '')) {
        lastHandByAccountId[accountId] = handStartIso;
      }
    }

    fileAnalyses.push({
      name: file.name,
      handsInFile: blocks.length,
      matchingHandsInFile,
      duplicateMatchingHandsInFile,
      idsFound: Array.from(idsFound).sort(),
      occurrencesById,
      firstHandAt,
      lastHandAt,
      duplicateOf,
    });
  }

  const uniqueMatchedHands = Array.from(uniqueHands.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
  const chosenSessions = buildImportedSessions(uniqueMatchedHands, IMPORT_DEFAULT_GAP_MINUTES);
  const sensitivityHours = Object.fromEntries(
    IMPORT_SENSITIVITY_GAPS.map((gap) => [gap, sumSessionHours(buildImportedSessions(uniqueMatchedHands, gap))])
  ) as Record<number, number>;

  const hoursByAccountId = Object.fromEntries(
    configuredAccountIds.map((accountId) => {
      const normalizedAccountId = normalizeAccountExternalId(accountId);
      const accountHands = uniqueMatchedHands.filter((hand) => hand.accountExternalId === normalizedAccountId);
      return [normalizedAccountId, sumSessionHours(buildImportedSessions(accountHands, IMPORT_DEFAULT_GAP_MINUTES))];
    })
  ) as Record<string, number>;

  const idRows: ImportIdRow[] = configuredAccountIds.map((accountId) => {
    const normalizedAccountId = normalizeAccountExternalId(accountId);
    return {
      accountId: normalizedAccountId,
      found: Boolean(handsByAccountId[normalizedAccountId]),
      hands: handsByAccountId[normalizedAccountId] || 0,
      firstHandAt: firstHandByAccountId[normalizedAccountId] || null,
      lastHandAt: lastHandByAccountId[normalizedAccountId] || null,
      estimatedHours: hoursByAccountId[normalizedAccountId] || 0,
    };
  });

  return {
    sessions: chosenSessions,
    handsFound: uniqueMatchedHands.length,
    duplicateHandsIgnored,
    totalHours: sumSessionHours(chosenSessions),
    chosenGapMinutes: IMPORT_DEFAULT_GAP_MINUTES,
    matchedAccountIds: idRows.filter((row) => row.found).map((row) => row.accountId),
    missingAccountIds: idRows.filter((row) => !row.found).map((row) => row.accountId),
    handsByAccountId,
    hoursByAccountId,
    idRows,
    dayRows: buildDayRows(uniqueMatchedHands, IMPORT_DEFAULT_GAP_MINUTES),
    fileAnalyses,
    sensitivityHours,
    duplicateFiles: fileAnalyses
      .filter((fileAnalysis) => fileAnalysis.duplicateOf)
      .map((fileAnalysis) => ({ name: fileAnalysis.name, duplicateOf: fileAnalysis.duplicateOf || '' })),
    firstHandAt: uniqueMatchedHands[0]?.start.toISOString() || null,
    lastHandAt: uniqueMatchedHands[uniqueMatchedHands.length - 1]?.end.toISOString() || null,
  };
};

const Profile = () => {
  const { usdToBrlRate, setUsdToBrlRate } = useCurrency();
  const [fetchingRate, setFetchingRate] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [uploads, setUploads] = useState<DatabaseUpload[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  
  const [newSite, setNewSite] = useState({ name: '', currency: 'BRL' });
  const [newAccount, setNewAccount] = useState({ site_id: '', nickname: '', account_external_id: '' });
  const [tempRate, setTempRate] = useState(usdToBrlRate.toString());
  const [tempMakeup, setTempMakeup] = useState('0');
  const [weeklyGoals, setWeeklyGoals] = useState({ grind: '0', study: '0' });
  
  const [retroData, setRetroData] = useState({
    hours: '0',
    hands: '0',
    rakeTotal: '0',
    rakeDeal: '0',
    result: '0'
  });
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: sitesData } = await supabase.from('sites').select('*').order('name');
    const { data: accountsData } = await supabase.from('site_accounts').select('*, sites(name)');
    const { data: uploadsData } = await supabase.from('database_uploads').select('*').order('created_at', { ascending: false });
    
    setProfile(profileData);
    setTempMakeup(String(profileData?.makeup_value ?? 0));
    setWeeklyGoals({
      grind: String(profileData?.weekly_grind_goal_hours ?? 0),
      study: String(profileData?.weekly_study_goal_hours ?? 0),
    });
    setRetroData({
      hours: String(profileData?.retro_hours ?? 0),
      hands: String(profileData?.retro_hands ?? 0),
      rakeTotal: String(profileData?.retro_rake_total ?? 0),
      rakeDeal: String(profileData?.retro_rake_deal ?? 0),
      result: String(profileData?.retro_result ?? 0),
    });
    setSites(sitesData || []);
    setAccounts(accountsData || []);
    setUploads((uploadsData || []) as DatabaseUpload[]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveDefaultLimit = async (limit: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ default_limit: limit })
      .eq('id', user.id);

    if (error) showError("Erro ao salvar limite padrão.");
    else {
      showSuccess("Limite padrão atualizado!");
      setProfile({ ...profile, default_limit: limit });
    }
  };

  const handleSaveWeeklyGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const grind = Math.max(0, Number(weeklyGoals.grind) || 0);
    const study = Math.max(0, Number(weeklyGoals.study) || 0);
    const payload = { weekly_grind_goal_hours: grind, weekly_study_goal_hours: study };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (error) {
      showError(error.code === '42703'
        ? 'As colunas de metas ainda não existem no Supabase. Execute a migration 20260909_add_weekly_goals_and_studies.sql.'
        : 'Erro ao salvar metas semanais.');
      return;
    }

    setProfile({ ...profile, ...payload });
    setWeeklyGoals({ grind: String(grind), study: String(study) });
    showSuccess('Metas semanais atualizadas!');
  };

  const handleSaveMakeup = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const parsedValue = Number(tempMakeup);
    if (Number.isNaN(parsedValue)) {
      showError("Valor de makeup inválido.");
      return;
    }

    const normalizedMakeup = parsedValue === 0 ? 0 : -Math.abs(parsedValue);

    const { error } = await supabase
      .from('profiles')
      .update({ makeup_value: normalizedMakeup })
      .eq('id', user.id);

    if (error) {
      showError("Erro ao salvar makeup.");
      return;
    }

    setProfile({ ...profile, makeup_value: normalizedMakeup });
    setTempMakeup(String(normalizedMakeup));
    showSuccess("Makeup atualizado!");
  };

  const handleDeleteMakeup = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ makeup_value: 0 })
      .eq('id', user.id);

    if (error) {
      showError("Erro ao remover makeup.");
      return;
    }

    setProfile({ ...profile, makeup_value: 0 });
    setTempMakeup('0');
    showSuccess("Makeup removido!");
  };

  const handleSaveRetroData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      retro_hours: Number(retroData.hours) || 0,
      retro_hands: Number(retroData.hands) || 0,
      retro_rake_total: Number(retroData.rakeTotal) || 0,
      retro_rake_deal: Number(retroData.rakeDeal) || 0,
      retro_result: Number(retroData.result) || 0,
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    if (error) {
      showError("Erro ao salvar dados retroativos.");
      return;
    }

    setProfile({ ...profile, ...payload });
    showSuccess("Dados retroativos atualizados!");
  };

  const fetchCurrentRate = async () => {
    setFetchingRate(true);
    try {
      const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      const data = await response.json();
      const rate = parseFloat(data.USDBRL.bid);
      setTempRate(rate.toFixed(2));
      showSuccess(`Cotação atualizada: R$ ${rate.toFixed(2)}`);
    } catch (err) {
      showError("Erro ao buscar cotação.");
    } finally {
      setFetchingRate(false);
    }
  };

  const handleSaveRate = () => {
    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate <= 0) return showError("Taxa inválida.");
    setUsdToBrlRate(rate);
    showSuccess("Taxa de conversão atualizada!");
  };

  const addSite = async () => {
    if (!newSite.name) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sites').insert([{ ...newSite, user_id: user?.id }]);
    if (error) showError("Erro ao adicionar site.");
    else {
      showSuccess("Site adicionado!");
      setNewSite({ name: '', currency: 'BRL' });
      fetchData();
    }
  };

  const addAccount = async () => {
    const normalizedExternalId = normalizeAccountExternalId(newAccount.account_external_id);
    if (!newAccount.site_id || !newAccount.nickname || !normalizedExternalId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('site_accounts').insert([{
      ...newAccount,
      account_external_id: normalizedExternalId,
      user_id: user?.id
    }]);
    if (error) showError("Erro ao adicionar conta.");
    else {
      showSuccess("Conta adicionada!");
      setNewAccount({ site_id: '', nickname: '', account_external_id: '' });
      fetchData();
    }
  };

  const removeSite = async (id: string) => {
    const { error } = await supabase.from('sites').delete().eq('id', id);
    if (error) showError("Erro ao remover site.");
    else { showSuccess("Site removido."); fetchData(); }
  };

  const removeAccount = async (id: string) => {
    const { error } = await supabase.from('site_accounts').delete().eq('id', id);
    if (error) showError("Erro ao remover conta.");
    else { showSuccess("Conta removida."); fetchData(); }
  };

  const extractTextFilesFromUpload = async (files: File[]) => {
    const extracted: UploadedTextFile[] = [];
    let totalExtractedBytes = 0;

    for (const file of files) {
      if (file.size > MAX_UPLOAD_FILE_BYTES) {
        throw new Error('O arquivo excede o limite de 100 MB.');
      }

      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const entries = Object.values(zip.files);
        if (entries.length > MAX_ARCHIVE_ENTRIES) {
          throw new Error('O arquivo ZIP contém itens demais para ser importado.');
        }
        for (const entry of entries) {
          if (entry.dir || !entry.name.toLowerCase().endsWith('.txt')) continue;
          const estimatedSize = Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0);
          if (estimatedSize > MAX_EXTRACTED_FILE_BYTES) {
            throw new Error('Um arquivo do ZIP excede o limite de 25 MB descompactado.');
          }
          const arrayBuffer = await entry.async('arraybuffer');
          totalExtractedBytes += arrayBuffer.byteLength;
          if (totalExtractedBytes > MAX_TOTAL_EXTRACTED_BYTES) {
            throw new Error('O conteúdo descompactado excede o limite permitido.');
          }
          const decodedFromBuffer = decodeHandHistoryBuffer(arrayBuffer);
          const fallbackText = sanitizeHandHistoryText(await entry.async('text'));
          extracted.push({
            name: entry.name,
            content: looksLikeHandHistory(decodedFromBuffer) ? decodedFromBuffer : fallbackText,
          });
        }
        continue;
      }

      if (file.name.toLowerCase().endsWith('.txt')) {
        const arrayBuffer = await file.arrayBuffer();
        const decodedFromBuffer = decodeHandHistoryBuffer(arrayBuffer);
        const fallbackText = sanitizeHandHistoryText(await file.text());
        extracted.push({
          name: file.webkitRelativePath || file.name,
          content: looksLikeHandHistory(decodedFromBuffer) ? decodedFromBuffer : fallbackText,
        });
      }
    }

    return extracted;
  };

  const handleImportDatabase = async (inputFiles: FileList | null) => {
    if (!inputFiles || inputFiles.length === 0) return;

    setIsImportingDatabase(true);
    try {
      const files = Array.from(inputFiles);
      const textFiles = await extractTextFilesFromUpload(files);
      if (textFiles.length === 0) {
        showError('Nenhum arquivo .txt válido foi encontrado no upload.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const accountsWithIds = accounts.filter((account) => normalizeAccountExternalId(account.account_external_id || ''));
      const configuredAccountIds = Array.from(new Set(
        accountsWithIds.map((account) => normalizeAccountExternalId(account.account_external_id))
      ));

      if (configuredAccountIds.length === 0) {
        showError('Cadastre pelo menos uma conta com ID antes de importar a database.');
        return;
      }

      const parsed = analyzeImportedDatabase(textFiles, configuredAccountIds);
      if (parsed.sessions.length === 0) {
        showError('Nenhuma mão com `Dealt to` para os IDs cadastrados foi identificada nos arquivos enviados.');
        return;
      }

      const accountByExternalId = new Map(
        accountsWithIds.map((account) => [normalizeAccountExternalId(account.account_external_id), account] as const)
      );

      const matchedAccounts = parsed.matchedAccountIds
        .map((id) => accountByExternalId.get(id))
        .filter(Boolean) as any[];

      const matchedAccountDbIds = matchedAccounts.map((account) => account.id);
      const { data: existingSessions, error: existingError } = await supabase
        .from('sessions')
        .select('account_id, start_time, end_time, end_hands')
        .eq('user_id', user.id)
        .eq('limit_name', IMPORTED_LIMIT_NAME)
        .in('account_id', matchedAccountDbIds);

      if (existingError) throw existingError;

      const existingKeys = new Set(
        (existingSessions || []).map((session) => `${session.account_id}|${session.start_time}|${session.end_time}|${session.end_hands}`)
      );

      const uploadId = generateUploadId();
      const sourceName = files.length === 1 ? files[0].name : `${files.length} arquivos`;

      const rows = parsed.sessions
        .map((session) => {
          const account = accountByExternalId.get(session.accountExternalId);
          if (!account) return null;

          const key = `${account.id}|${session.startTime}|${session.endTime}|${session.hands}`;
          if (existingKeys.has(key)) return null;

          return {
          user_id: user.id,
          site_id: account.site_id,
          account_id: account.id,
          limit_name: IMPORTED_LIMIT_NAME,
          status: 'completed',
          start_time: session.startTime,
          end_time: session.endTime,
          start_hands: 0,
          end_hands: session.hands,
          start_balance: 0,
          end_balance: 0,
          result: 0,
          rake: 0,
          import_upload_id: uploadId,
          };
        })
        .filter(Boolean);

      const uploadPayload = {
        id: uploadId,
        user_id: user.id,
        source_name: sourceName,
        file_count: textFiles.length,
        hands_found: parsed.handsFound,
        total_hours: parsed.totalHours,
        sessions_found: parsed.sessions.length,
        sessions_imported: rows.length,
        account_external_ids: configuredAccountIds,
        matched_account_external_ids: parsed.matchedAccountIds,
        missing_account_external_ids: parsed.missingAccountIds,
        hands_by_account_id: parsed.handsByAccountId,
        hours_by_account_id: parsed.hoursByAccountId,
      };

      const { error: uploadError } = await supabase.from('database_uploads').insert([uploadPayload]);
      if (uploadError) throw uploadError;

      if (rows.length > 0) {
        const { error } = await supabase.from('sessions').insert(rows);
        if (error) throw error;
      }

      setImportSummary({
        configuredAccountIds,
        matchedAccountIds: parsed.matchedAccountIds,
        missingAccountIds: parsed.missingAccountIds,
        handsByAccountId: parsed.handsByAccountId,
        hoursByAccountId: parsed.hoursByAccountId,
        idRows: parsed.idRows,
        dayRows: parsed.dayRows,
        fileAnalyses: parsed.fileAnalyses,
        sensitivityHours: parsed.sensitivityHours,
        duplicateFiles: parsed.duplicateFiles,
        filesProcessed: textFiles.length,
        handsFound: parsed.handsFound,
        duplicateHandsIgnored: parsed.duplicateHandsIgnored,
        totalHours: parsed.totalHours,
        chosenGapMinutes: parsed.chosenGapMinutes,
        firstHandAt: parsed.firstHandAt,
        lastHandAt: parsed.lastHandAt,
        sessionsFound: parsed.sessions.length,
        sessionsImported: rows.length,
        sessionsSkipped: parsed.sessions.length - rows.length,
      });

      await fetchData();
      showSuccess(rows.length > 0 ? 'Database importada com sucesso!' : 'Upload registrado. Nenhuma sessão nova precisava ser criada.');
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith('O arquivo')
        ? error.message
        : error instanceof Error && error.message.startsWith('Um arquivo')
          ? error.message
          : error instanceof Error && error.message.startsWith('O conteúdo')
            ? error.message
            : 'Não foi possível importar a database. Verifique os arquivos e tente novamente.';
      showError(message);
    } finally {
      setIsImportingDatabase(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    setDeletingUploadId(uploadId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('import_upload_id', uploadId);

      if (sessionError) throw sessionError;

      const { error: uploadError } = await supabase
        .from('database_uploads')
        .delete()
        .eq('user_id', user.id)
        .eq('id', uploadId);

      if (uploadError) throw uploadError;

      setUploads((current) => current.filter((upload) => upload.id !== uploadId));
      showSuccess('Upload removido e sessões importadas excluídas.');
    } catch {
      showError('Não foi possível remover o upload.');
    } finally {
      setDeletingUploadId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Verificado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-500" /> Preferências de Jogo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Limite Padrão</Label>
                    <Select 
                      value={profile?.default_limit || ''} 
                      onValueChange={handleSaveDefaultLimit}
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Selecione o limite padrão" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLO_LIMITS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Este limite será selecionado automaticamente ao abrir o modal de sessão.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-500" /> Metas Semanais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Meta de horas semanais (grind)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        value={weeklyGoals.grind}
                        onChange={(event) => setWeeklyGoals({ ...weeklyGoals, grind: event.target.value })}
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Meta de estudo (horas)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        value={weeklyGoals.study}
                        onChange={(event) => setWeeklyGoals({ ...weeklyGoals, study: event.target.value })}
                        className="bg-background border-input"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveWeeklyGoals} className="bg-amber-600 hover:bg-amber-500 text-white">
                    Salvar metas
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    A meta de estudo e as horas jogadas serão somadas na barra semanal do dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-rose-500" /> Makeup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Valor atual do makeup (R$)</Label>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={tempMakeup}
                          onChange={(e) => setTempMakeup(e.target.value)}
                          className="bg-background border-input"
                        />
                      </div>
                      <Button onClick={handleSaveMakeup} className="bg-rose-600 hover:bg-rose-500 text-white">Salvar</Button>
                      {(profile?.makeup_value || 0) < 0 && (
                        <Button variant="outline" onClick={handleDeleteMakeup} className="text-muted-foreground hover:text-rose-500 border-border px-3" title="Zerar Makeup">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Use este campo para começar com um resultado acumulado negativo sem precisar cadastrar sessões antigas.
                      O valor salvo entra no resultado total do dashboard como dívida de makeup.
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Se você informar um valor positivo, ele será salvo automaticamente como negativo.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Archive className="w-5 h-5 text-sky-500" /> Upload de Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      disabled={isImportingDatabase}
                      onClick={() => uploadInputRef.current?.click()}
                      className="justify-start"
                    >
                      {isImportingDatabase ? <Loader2 className="animate-spin" /> : <Upload />}
                      Enviar .zip ou .txt
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isImportingDatabase}
                      onClick={() => folderInputRef.current?.click()}
                      className="justify-start"
                    >
                      {isImportingDatabase ? <Loader2 className="animate-spin" /> : <FolderOpen />}
                      Enviar pasta
                    </Button>
                  </div>

                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    accept=".zip,.txt"
                    className="hidden"
                    onChange={(e) => handleImportDatabase(e.target.files)}
                  />
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    {...({ webkitdirectory: '', directory: '' } as any)}
                    onChange={(e) => handleImportDatabase(e.target.files)}
                  />

                  <p className="text-[10px] text-muted-foreground">
                    Aceita pasta zipada, pasta com arquivos de texto ou varios arquivos `.txt`. A leitura agora
                    considera a mao quando existir `Dealt to &lt;ID&gt;` para um dos IDs cadastrados, deduplica por `Hand #`,
                    consolida todos os IDs como uma unica pessoa e reconstrui o tempo por atividade em mesas com gap padrao de 15 minutos.
                  </p>

                  {importSummary ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                      <div className="font-semibold text-foreground">Analise da ultima importacao</div>
                      <div className="text-muted-foreground">IDs consolidados: <span className="font-medium text-foreground">{importSummary.configuredAccountIds.join(', ')}</span></div>
                      <div className="text-muted-foreground">IDs encontrados: <span className="font-medium text-foreground">{importSummary.matchedAccountIds.length > 0 ? importSummary.matchedAccountIds.join(', ') : 'nenhum'}</span></div>
                      {importSummary.missingAccountIds.length > 0 ? (
                        <div className="text-muted-foreground">IDs nao encontrados no upload: <span className="font-medium text-foreground">{importSummary.missingAccountIds.join(', ')}</span></div>
                      ) : null}
                      <div className="text-muted-foreground">Arquivos lidos: <span className="font-medium text-foreground">{importSummary.filesProcessed}</span></div>
                      <div className="text-muted-foreground">Maos unicas da pessoa (`Dealt to`): <span className="font-medium text-foreground">{importSummary.handsFound}</span></div>
                      <div className="text-muted-foreground">Maos duplicadas descartadas: <span className="font-medium text-foreground">{importSummary.duplicateHandsIgnored}</span></div>
                      <div className="text-muted-foreground">Arquivos duplicados identicos: <span className="font-medium text-foreground">{importSummary.duplicateFiles.length}</span></div>
                      <div className="text-muted-foreground">Horas estimadas (gap {importSummary.chosenGapMinutes} min): <span className="font-medium text-foreground">{importSummary.totalHours.toFixed(2)}</span></div>
                      {importSummary.firstHandAt ? (
                        <div className="text-muted-foreground">Primeira mao: <span className="font-medium text-foreground">{new Date(importSummary.firstHandAt).toLocaleString('pt-BR')}</span></div>
                      ) : null}
                      {importSummary.lastHandAt ? (
                        <div className="text-muted-foreground">Ultima mao: <span className="font-medium text-foreground">{new Date(importSummary.lastHandAt).toLocaleString('pt-BR')}</span></div>
                      ) : null}
                      <div className="text-muted-foreground">Sessoes reconstruidas: <span className="font-medium text-foreground">{importSummary.sessionsFound}</span></div>
                      <div className="text-muted-foreground">Sessoes criadas: <span className="font-medium text-foreground">{importSummary.sessionsImported}</span></div>
                      {importSummary.sessionsSkipped > 0 ? (
                        <div className="text-muted-foreground">Sessoes ignoradas por ja existirem: <span className="font-medium text-foreground">{importSummary.sessionsSkipped}</span></div>
                      ) : null}
                      {importSummary.idRows.length > 0 ? (
                        <div className="pt-2 border-t border-border/50 space-y-1">
                          <div className="text-muted-foreground">Tabela por ID</div>
                          <div className="max-h-48 overflow-y-auto rounded border border-border/50">
                            {importSummary.idRows.map((row) => (
                              <div key={row.accountId} className="grid grid-cols-[100px_70px_80px_1fr_1fr] gap-2 border-b border-border/30 px-3 py-2 text-xs last:border-b-0">
                                <div className="font-medium text-foreground">{row.accountId}</div>
                                <div className={row.found ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>{row.found ? 'Sim' : 'Nao'}</div>
                                <div className="text-foreground">{row.hands}</div>
                                <div className="text-muted-foreground">{row.firstHandAt ? new Date(row.firstHandAt).toLocaleString('pt-BR') : '-'}</div>
                                <div className="text-muted-foreground">{row.lastHandAt ? new Date(row.lastHandAt).toLocaleString('pt-BR') : '-'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="pt-2 border-t border-border/50 space-y-1">
                        <div className="text-muted-foreground">Sensibilidade de tempo</div>
                        {Object.entries(importSummary.sensitivityHours).map(([gap, hours]) => (
                          <div key={gap} className="text-muted-foreground">
                            gap {gap} min: <span className="font-medium text-foreground">{Number(hours).toFixed(2)}</span> horas
                          </div>
                        ))}
                      </div>
                      {importSummary.dayRows.length > 0 ? (
                        <div className="pt-2 border-t border-border/50 space-y-1">
                          <div className="text-muted-foreground">Tabela por dia</div>
                          <div className="max-h-56 overflow-y-auto rounded border border-border/50">
                            {importSummary.dayRows.map((row) => (
                              <div key={row.date} className="grid grid-cols-[88px_72px_1fr_140px_140px_80px] gap-2 border-b border-border/30 px-3 py-2 text-xs last:border-b-0">
                                <div className="font-medium text-foreground">{new Date(`${row.date}T00:00:00Z`).toLocaleDateString('pt-BR')}</div>
                                <div className="text-foreground">{row.hands}</div>
                                <div className="text-muted-foreground">{row.accountIds.join(', ')}</div>
                                <div className="text-muted-foreground">{row.startTime ? new Date(row.startTime).toLocaleString('pt-BR') : '-'}</div>
                                <div className="text-muted-foreground">{row.endTime ? new Date(row.endTime).toLocaleString('pt-BR') : '-'}</div>
                                <div className="text-foreground">{row.estimatedHours.toFixed(2)}h</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {importSummary.fileAnalyses.length > 0 ? (
                        <div className="pt-2 border-t border-border/50 space-y-1">
                          <div className="text-muted-foreground">Arquivos analisados</div>
                          <div className="max-h-56 overflow-y-auto rounded border border-border/50">
                            {importSummary.fileAnalyses.map((fileAnalysis) => (
                              <div key={fileAnalysis.name} className="border-b border-border/30 px-3 py-2 text-xs last:border-b-0">
                                <div className="font-medium text-foreground">{fileAnalysis.name}</div>
                                <div className="text-muted-foreground">
                                  Maos no arquivo: <span className="font-medium text-foreground">{fileAnalysis.handsInFile}</span> •
                                  Maos da pessoa: <span className="font-medium text-foreground">{fileAnalysis.matchingHandsInFile}</span> •
                                  Duplicadas: <span className="font-medium text-foreground">{fileAnalysis.duplicateMatchingHandsInFile}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  IDs encontrados: <span className="font-medium text-foreground">{fileAnalysis.idsFound.join(', ') || 'nenhum'}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  Ocorrencias por ID: <span className="font-medium text-foreground">
                                    {Object.entries(fileAnalysis.occurrencesById).length > 0
                                      ? Object.entries(fileAnalysis.occurrencesById).map(([accountId, count]) => `${accountId}: ${count}`).join(', ')
                                      : 'nenhuma'}
                                  </span>
                                </div>
                                <div className="text-muted-foreground">
                                  Primeira mao: <span className="font-medium text-foreground">{fileAnalysis.firstHandAt ? new Date(fileAnalysis.firstHandAt).toLocaleString('pt-BR') : '-'}</span> •
                                  Ultima mao: <span className="font-medium text-foreground">{fileAnalysis.lastHandAt ? new Date(fileAnalysis.lastHandAt).toLocaleString('pt-BR') : '-'}</span>
                                </div>
                                {fileAnalysis.duplicateOf ? (
                                  <div className="text-amber-600 dark:text-amber-400">
                                    Arquivo duplicado de <span className="font-medium">{fileAnalysis.duplicateOf}</span>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">Uploads realizados</div>
                    {uploads.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        Nenhum upload registrado ainda.
                      </div>
                    ) : (
                      uploads.map((upload) => (
                        <div key={upload.id} className="rounded-lg border border-border bg-muted/30 p-4 flex items-start justify-between gap-4">
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-foreground">{upload.source_name || 'Upload sem nome'}</div>
                            <div className="text-muted-foreground">Criado em {new Date(upload.created_at).toLocaleString('pt-BR')}</div>
                            <div className="text-muted-foreground">IDs consolidados: {(upload.account_external_ids || []).join(', ') || '—'}</div>
                            <div className="text-muted-foreground">IDs encontrados: {(upload.matched_account_external_ids || []).join(', ') || 'nenhum'}</div>
                            {(upload.missing_account_external_ids || []).length > 0 ? (
                              <div className="text-muted-foreground">IDs nao encontrados: {(upload.missing_account_external_ids || []).join(', ')}</div>
                            ) : null}
                            <div className="text-muted-foreground">Arquivos: <span className="font-medium text-foreground">{upload.file_count}</span> • Maos unicas: <span className="font-medium text-foreground">{upload.hands_found}</span> • Horas (gap 15): <span className="font-medium text-foreground">{Number(upload.total_hours || 0).toFixed(2)}</span></div>
                            <div className="text-muted-foreground">Sessoes reconstruidas: <span className="font-medium text-foreground">{upload.sessions_found}</span> • Sessoes criadas: <span className="font-medium text-foreground">{upload.sessions_imported}</span></div>
                            {(upload.matched_account_external_ids || []).length > 0 ? (
                              <div className="pt-1 space-y-1">
                                {(upload.matched_account_external_ids || []).map((accountId) => (
                                  <div key={accountId} className="text-muted-foreground">
                                    {accountId}: <span className="font-medium text-foreground">{Number(upload.hands_by_account_id?.[accountId] || 0)}</span> maos • <span className="font-medium text-foreground">{Number(upload.hours_by_account_id?.[accountId] || 0).toFixed(2)}</span> horas
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={deletingUploadId === upload.id}
                            onClick={() => handleDeleteUpload(upload.id)}
                            className="text-muted-foreground hover:text-rose-500"
                            title="Excluir upload"
                          >
                            {deletingUploadId === upload.id ? <Loader2 className="animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" /> Câmbio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-muted-foreground">Taxa USD/BRL</Label>
                      <Input type="number" step="0.01" value={tempRate} onChange={(e) => setTempRate(e.target.value)} className="bg-background border-input" />
                    </div>
                    <Button variant="outline" onClick={fetchCurrentRate} disabled={fetchingRate}>
                      <RefreshCw className={cn("w-4 h-4", fetchingRate && "animate-spin")} />
                    </Button>
                    <Button onClick={handleSaveRate} className="bg-emerald-600 hover:bg-emerald-500 text-white">Salvar</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-500" /> Dados Retroativos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Horas Jogadas</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={retroData.hours}
                        onChange={(e) => setRetroData({ ...retroData, hours: e.target.value })}
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Total de Mãos</Label>
                      <Input
                        type="number"
                        value={retroData.hands}
                        onChange={(e) => setRetroData({ ...retroData, hands: e.target.value })}
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Rake Total (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={retroData.rakeTotal}
                        onChange={(e) => setRetroData({ ...retroData, rakeTotal: e.target.value })}
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Rake Deal (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={retroData.rakeDeal}
                        onChange={(e) => setRetroData({ ...retroData, rakeDeal: e.target.value })}
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-muted-foreground">Resultado S/ Rake (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={retroData.result}
                        onChange={(e) => setRetroData({ ...retroData, result: e.target.value })}
                        className="bg-background border-input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveRetroData} className="bg-purple-600 hover:bg-purple-500 text-white">Salvar Dados</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Depois do upload da database, horas e maos passam a vir das sessoes importadas automaticamente.
                    Aqui voce precisa preencher somente os valores financeiros retroativos.
                  </p>
                </CardContent>
              </Card>

            </div>

            <div className="space-y-8">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" /> Sites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="Nome do Site" value={newSite.name} onChange={(e) => setNewSite({...newSite, name: e.target.value})} className="bg-background border-input" />
                    <Select value={newSite.currency} onValueChange={(v) => setNewSite({...newSite, currency: v})}>
                      <SelectTrigger className="w-24 bg-background border-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addSite} className="bg-blue-600 text-white hover:bg-blue-500"><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    {sites.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                        <span className="text-sm font-medium text-foreground">{s.name} ({s.currency})</span>
                        <Button variant="ghost" size="icon" onClick={() => removeSite(s.id)} className="text-muted-foreground hover:text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" /> Contas (Nicknames + IDs)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Select value={newAccount.site_id} onValueChange={(v) => setNewAccount({...newAccount, site_id: v})}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Selecione o Site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-1 gap-2">
                      <Input placeholder="Nickname / Conta" value={newAccount.nickname} onChange={(e) => setNewAccount({...newAccount, nickname: e.target.value})} className="bg-background border-input" />
                      <Input placeholder="ID da conta" value={newAccount.account_external_id} onChange={(e) => setNewAccount({...newAccount, account_external_id: e.target.value})} className="bg-background border-input" />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={addAccount} className="bg-amber-600 text-white hover:bg-amber-500"><Plus className="w-4 h-4" /></Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      O ID da conta e obrigatorio para a importacao localizar todas as maos do player, mesmo quando ele joga em mais de uma conta.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {accounts.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                        <div>
                          <span className="text-sm font-medium text-foreground">{a.nickname}</span>
                          <p className="text-[10px] text-muted-foreground">ID: {a.account_external_id || 'nao informado'}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{a.sites?.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeAccount(a.id)} className="text-muted-foreground hover:text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
