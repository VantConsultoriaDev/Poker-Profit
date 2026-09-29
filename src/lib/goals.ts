import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  subWeeks, 
  startOfMonth, endOfMonth, getDaysInMonth, 
  startOfYear, endOfYear, 
  differenceInCalendarDays, parseISO, isLeapYear,
  format
} from 'date-fns';

export interface FilterPeriodRange {
  startDate: Date;
  endDate: Date;
  daysCount: number;
  periodLabel: string;
}

export const formatHoursMinutes = (hours: number): string => {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const formattedHours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const formattedMinutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${formattedHours}:${formattedMinutes}`;
};

/**
 * Retorna o intervalo de datas, a quantidade de dias e o rótulo descritivo para qualquer período de filtro.
 */
export function getFilterPeriodRange(
  period: string = 'this_week', 
  customRange?: { start: string; end: string },
  earliestDate?: Date
): FilterPeriodRange {
  const now = new Date();

  if (period === 'day') {
    return {
      startDate: startOfDay(now),
      endDate: endOfDay(now),
      daysCount: 1,
      periodLabel: 'hoje',
    };
  }

  if (period === 'this_week') {
    return {
      startDate: startOfWeek(now, { weekStartsOn: 1 }),
      endDate: endOfWeek(now, { weekStartsOn: 1 }),
      daysCount: 7,
      periodLabel: 'nesta semana',
    };
  }

  if (period === 'last_week') {
    const lastWeek = subWeeks(now, 1);
    return {
      startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
      endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      daysCount: 7,
      periodLabel: 'na semana passada',
    };
  }

  if (period === 'month') {
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
      daysCount: getDaysInMonth(now),
      periodLabel: 'neste mês',
    };
  }

  if (period === 'year') {
    return {
      startDate: startOfYear(now),
      endDate: endOfYear(now),
      daysCount: isLeapYear(now) ? 366 : 365,
      periodLabel: 'neste ano',
    };
  }

  if (period === 'custom' && customRange?.start && customRange?.end) {
    const start = startOfDay(parseISO(customRange.start));
    const end = endOfDay(parseISO(customRange.end));
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    return {
      startDate: start,
      endDate: end,
      daysCount: days,
      periodLabel: `no período (${days} ${days === 1 ? 'dia' : 'dias'})`,
    };
  }

  if (period === 'all') {
    const start = earliestDate ? startOfDay(earliestDate) : startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfDay(now);
    const days = Math.max(7, differenceInCalendarDays(end, start) + 1);
    return {
      startDate: start,
      endDate: end,
      daysCount: days,
      periodLabel: `no total (${days} dias)`,
    };
  }

  // fallback para esta semana
  return {
    startDate: startOfWeek(now, { weekStartsOn: 1 }),
    endDate: endOfWeek(now, { weekStartsOn: 1 }),
    daysCount: 7,
    periodLabel: 'nesta semana',
  };
}

/**
 * Calcula o total de minutos de estudo dentro de um intervalo de datas [startDate, endDate],
 * considerando tanto as paradas pontuais (one_off) quanto as aulas fixas semanais (fixed)
 * computadas de acordo com as ocorrências dos seus dias da semana no intervalo.
 */
export function calculateStudyMinutesInInterval(
  studyRecords: Array<{
    study_type: 'fixed' | 'one_off';
    weekday: number | null;
    study_date: string | null;
    duration_minutes: number;
    active?: boolean;
  }>,
  startDate: Date,
  endDate: Date
): number {
  let totalMinutes = 0;

  for (const record of studyRecords) {
    if (record.active === false) continue;
    const duration = Number(record.duration_minutes || 0);
    if (duration <= 0) continue;

    if (record.study_type === 'one_off') {
      if (!record.study_date) continue;
      // Garante parsing considerando a data local (meio-dia evita desvios de fuso)
      const date = new Date(`${record.study_date}T12:00:00`);
      if (date >= startDate && date <= endDate) {
        totalMinutes += duration;
      }
    } else if (record.study_type === 'fixed') {
      if (record.weekday === null || record.weekday === undefined) continue;
      const targetWeekday = Number(record.weekday);
      
      // Contar ocorrências do dia da semana entre startDate e endDate
      let count = 0;
      const cur = new Date(startDate);
      // Ajusta hora para meio-dia para comparações consistentes de dias
      cur.setHours(12, 0, 0, 0);
      const limit = new Date(endDate);
      limit.setHours(23, 59, 59, 999);

      while (cur <= limit) {
        if (cur.getDay() === targetWeekday) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }

      totalMinutes += count * duration;
    }
  }

  return totalMinutes;
}

export interface BuyinBankrollConfig {
  enabled: boolean;
  target: number;
  manualValue?: number;
  isManual?: boolean;
  current?: number;
}

export interface WeekChainItem {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  rawResult: number;
  carryOverIn: number;
  buyinBankrollIn: number;
  buyinBankrollOut: number;
  buyinBankrollAllocated: number;
  buyinBankrollAbsorbed: number;
  totalWithRakeDeal: number;
  totalLiquido: number;
  carryOverOut: number;
  isClosed: boolean;
}

/**
 * Calcula a cadeia financeira de semanas sequenciais considerando:
 * 1. Importação de Makeup negativo da semana anterior (Carry-over de semanas que encerraram negativas).
 * 2. Dedução ou abastecimento da Banca de Buy-in quando habilitada.
 * 3. Total Líquido zerado se o resultado total for negativo.
 */
export function calculateWeekChain(
  orderedWeeks: Array<{
    weekKey: string;
    weekStart: string;
    weekEnd: string;
    rawResult: number;
    isClosed?: boolean;
    isCurrent?: boolean;
  }>,
  initialMakeup: number = 0,
  buyinConfig?: BuyinBankrollConfig,
  profitDealPct: number = 100
): Map<string, WeekChainItem> {
  const result = new Map<string, WeekChainItem>();

  const target = buyinConfig?.enabled ? Math.max(0, Number(buyinConfig.target) || 0) : 0;
  // O saldo inicial da banca de buy-in:
  // - Se "Banca manual" estiver ativa: usa o valor informado pelo usuário.
  // - Caso contrário: SEMPRE começa em 0. Nunca lê `current` para evitar reaproveitamento de semanas anteriores.
  const configuredBuyinStart = buyinConfig?.enabled && buyinConfig.isManual && buyinConfig.manualValue !== undefined
    ? Math.min(target, Math.max(0, Number(buyinConfig.manualValue) || 0))
    : 0;

  let currentBuyin = configuredBuyinStart;
  let currentMakeup = initialMakeup < 0 ? initialMakeup : 0;

  // Identificar a semana do calendário atual (hoje)
  const now = new Date();
  const currentCalendarWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentCalendarWeekStartStr = format(currentCalendarWeekStart, 'yyyy-MM-dd');

  for (const week of orderedWeeks) {
    const raw = week.rawResult;
    const mIn = currentMakeup;

    // A banca de buy-in NUNCA retroage a semanas passadas.
    // Qualquer semana anterior à semana atual do calendário (weekStart < currentCalendarWeekStartStr)
    // é estritamente livre de banca de buy-in (esquecer qualquer retroativo).
    const isPastWeek = week.weekStart < currentCalendarWeekStartStr;
    const isWeekWithBuyin = buyinConfig?.enabled && target > 0 && !isPastWeek;
    const bIn = isWeekWithBuyin ? currentBuyin : 0;

    let bAllocated = 0;
    let bAbsorbed = 0;
    let bOut = bIn;
    let effectiveTotal = 0;

    if (isWeekWithBuyin) {
      if (mIn < 0) {
        // Player está com dívida de makeup acumulado da semana anterior:
        // O resultado bruto da semana (raw) serve primeiro para amortizar a dívida de makeup!
        const netWeek = mIn + raw;
        if (netWeek <= 0) {
          // O lucro da semana não cobriu o makeup (ou ampliou a dívida):
          // Nenhum valor sobra para a banca de buy-in! A banca permanece intacta (0 se vazia).
          bOut = bIn;
          effectiveTotal = netWeek;
        } else {
          // O lucro pagou 100% da dívida de makeup e sobrou excedente:
          // Apenas o excedente (netWeek) vai para completar a banca de buy-in!
          const surplus = netWeek;
          const deficit = Math.max(0, target - bIn);
          bAllocated = Math.min(surplus, deficit);
          bOut = bIn + bAllocated;
          effectiveTotal = surplus - bAllocated;
        }
      } else {
        // Sem dívida de makeup (mIn === 0):
        if (raw > 0) {
          // Lucro na semana: completa primeiro a banca de buy-in até 100%
          const deficit = Math.max(0, target - bIn);
          bAllocated = Math.min(raw, deficit);
          bOut = bIn + bAllocated;
          effectiveTotal = raw - bAllocated;
        } else if (raw < 0) {
          // Prejuízo na semana: a banca de buy-in absorve primeiro
          const loss = Math.abs(raw);
          bAbsorbed = Math.min(bIn, loss);
          bOut = bIn - bAbsorbed;
          const uncoveredLoss = loss - bAbsorbed;
          effectiveTotal = -uncoveredLoss;
        } else {
          bOut = bIn;
          effectiveTotal = 0;
        }
      }
    } else {
      // Sem banca de buy-in ativa:
      effectiveTotal = mIn + raw;
    }

    const totalWithRakeDeal = effectiveTotal;
    const totalLiquido = totalWithRakeDeal > 0 ? (totalWithRakeDeal * profitDealPct) / 100 : 0;
    // Se a semana terminar negativa, o saldo devedor segue como makeup para a próxima
    const mOut = totalWithRakeDeal < 0 ? totalWithRakeDeal : 0;

    result.set(week.weekKey, {
      weekKey: week.weekKey,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      rawResult: raw,
      carryOverIn: mIn,
      buyinBankrollIn: bIn,
      buyinBankrollOut: bOut,
      buyinBankrollAllocated: bAllocated,
      buyinBankrollAbsorbed: bAbsorbed,
      totalWithRakeDeal,
      totalLiquido,
      carryOverOut: mOut,
      isClosed: !!week.isClosed,
    });

    currentBuyin = bOut;
    currentMakeup = mOut;
  }

  return result;
}

