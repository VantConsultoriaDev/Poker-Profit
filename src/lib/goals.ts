import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  subWeeks, 
  startOfMonth, endOfMonth, getDaysInMonth, 
  startOfYear, endOfYear, 
  differenceInCalendarDays, parseISO, isLeapYear,
  format
} from 'date-fns';

export interface DashboardRange {
  start: string; end: string;
  kind?: 'anticipated' | 'current' | 'total' | 'regular';
  cutoff?: string;
}

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
  customRange?: DashboardRange,
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

  if (['custom', 'selected_week', 'last_days'].includes(period) && customRange?.start && customRange?.end) {
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
  startWeek?: string;
}

export interface WeekChainItem {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  rawResult: number;
  availableResult: number;
  carryOverIn: number;
  buyinBankrollIn: number;
  buyinBankrollOut: number;
  buyinBankrollAllocated: number;
  buyinBankrollAbsorbed: number;
  totalWithRakeDeal: number;
  totalLiquido: number;
  carryOverOut: number;
  isClosed: boolean;
  anticipatedState?: ClosingState;
}

/**
 * Calcula a cadeia financeira de semanas sequenciais considerando:
 * 1. Importação de Makeup negativo da semana anterior (Carry-over de semanas que encerraram negativas).
 * 2. Dedução ou abastecimento da Banca de Buy-in quando habilitada.
 * 3. Total Líquido zerado se o resultado total for negativo.
 */
export interface ClosingState {
  distributionVersion?: number;
  rawResult?: number;
  carryOverIn: number;
  carryOverOut: number;
  buyinBankrollIn: number;
  buyinBankrollOut: number;
  buyinBankrollAllocated: number;
  buyinBankrollAbsorbed: number;
  availableResult: number;
  totalLiquido: number;
}

export function calculateSettlement(raw: number, makeup: number, bank: number, target: number, deal: number): ClosingState {
  const carryOverIn = Math.min(0, makeup);
  const buyinBankrollIn = Math.max(0, bank);
  const afterMakeup = raw + carryOverIn;
  const buyinBankrollAbsorbed = afterMakeup < 0 ? Math.min(buyinBankrollIn, -afterMakeup) : 0;
  const buyinBankrollAllocated = afterMakeup > 0 ? Math.min(afterMakeup, Math.max(0, target - buyinBankrollIn)) : 0;
  const availableResult = afterMakeup + buyinBankrollAbsorbed - buyinBankrollAllocated;
  return {
    distributionVersion: 6, rawResult: raw, carryOverIn, carryOverOut: Math.min(0, availableResult),
    buyinBankrollIn,
    buyinBankrollOut: buyinBankrollIn - buyinBankrollAbsorbed + buyinBankrollAllocated,
    buyinBankrollAllocated, buyinBankrollAbsorbed, availableResult,
    totalLiquido: Math.max(0, availableResult) * Math.min(100, Math.max(0, deal)) / 100,
  };
}

export function consolidateSettlements(first: Pick<ClosingState, 'availableResult' | 'totalLiquido'>, continuation: Pick<ClosingState, 'availableResult' | 'totalLiquido'>) {
  const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  return {
    // A negative first balance is already inherited as makeup by the continuation.
    availableResult: roundMoney(Math.max(0, first.availableResult) + continuation.availableResult),
    // Settled payments are independent: a later loss does not reverse a payment.
    totalLiquido: roundMoney(roundMoney(first.totalLiquido) + roundMoney(continuation.totalLiquido)),
  };
}

export function calculateWeekChain(
  orderedWeeks: Array<{
    weekKey: string; weekStart: string; weekEnd: string; rawResult: number;
    isClosed?: boolean; isCurrent?: boolean;
    buyinBankrollOverride?: number;
    closingState?: ClosingState;
    anticipatedPart?: { rawResult: number; closingState?: ClosingState; bankEnd?: number };
  }>,
  initialMakeup: number = 0,
  buyinConfig?: BuyinBankrollConfig,
  profitDealPct: number = 100
): Map<string, WeekChainItem> {
  const result = new Map<string, WeekChainItem>();
  const target = buyinConfig?.enabled ? Math.max(0, Number(buyinConfig.target) || 0) : 0;
  const startWeek = buyinConfig?.startWeek || format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  let bank = 0;
  let makeup = Math.min(0, initialMakeup);
  let initialized = false;
  for (const week of orderedWeeks) {
    const historicalBankEvidence = Boolean(week.anticipatedPart && (week.anticipatedPart.bankEnd !== undefined || week.anticipatedPart.closingState));
    const active = Boolean(buyinConfig?.enabled && (week.weekStart >= startWeek || historicalBankEvidence));
    if (active && !initialized) {
      bank = buyinConfig?.isManual && week.weekStart >= startWeek ? Math.min(target, Math.max(0, Number(buyinConfig.manualValue) || 0)) : 0;
      initialized = true;
    }
    let state: ClosingState;
    let anticipatedState: ClosingState | undefined;
    if (week.anticipatedPart) {
      const part = week.anticipatedPart;
      const saved = part.closingState;
      const first = saved && Number(saved.distributionVersion) >= 5
        ? saved
        : calculateSettlement(part.rawResult, saved?.carryOverIn ?? makeup, saved?.buyinBankrollIn ?? bank, active ? target : 0, profitDealPct);
      // Reconstruct legacy distributions together: never override only the bank balance.
      anticipatedState = first;
      const firstBank = first.buyinBankrollOut;
      // Rebuild older final snapshots with the actual inherited state; older versions
      // could save a makeup that had already been paid in the anticipation.
      state = Number(week.closingState?.distributionVersion) >= 6
        ? week.closingState!
        : calculateSettlement(week.rawResult, first.carryOverOut, firstBank, active ? target : 0, profitDealPct);
      // An anticipation is a committed settlement even while its continuation is open.
      makeup = first.carryOverOut;
      bank = firstBank;
    } else {
      state = Number(week.closingState?.distributionVersion) >= 6
        ? week.closingState!
        : calculateSettlement(week.rawResult, makeup, bank, active ? target : 0, profitDealPct);
    }
    // Legacy anticipated weeks may lack a regular closing transaction. Once their
    // calendar period is over, carry the continuation's final state, not its old seed.
    const endedAnticipatedWeek = Boolean(week.anticipatedPart && week.weekEnd < format(new Date(), 'yyyy-MM-dd'));
    if (week.isClosed || endedAnticipatedWeek) {
      bank = state.buyinBankrollOut;
      makeup = state.carryOverOut;
    }
    result.set(week.weekKey, {
      ...state, weekKey: week.weekKey, weekStart: week.weekStart, weekEnd: week.weekEnd,
      rawResult: state.rawResult ?? week.rawResult, totalWithRakeDeal: state.availableResult,
      anticipatedState,
      isClosed: Boolean(week.isClosed),
    });
  }
  return result;
}
