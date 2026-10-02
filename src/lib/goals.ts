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
  startWeek?: string;
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
    /** Quando definido, sobrescreve o cálculo de bOut (saldo final da banca) para esta semana.
     *  Usado por semanas antecipadas cujo saldo da banca já foi calculado separadamente. */
    buyinBankrollOverride?: number;
  }>,
  initialMakeup: number = 0,
  buyinConfig?: BuyinBankrollConfig,
  profitDealPct: number = 100
): Map<string, WeekChainItem> {
  const result = new Map<string, WeekChainItem>();

  const target = buyinConfig?.enabled ? Math.max(0, Number(buyinConfig.target) || 0) : 0;

  // Semana atual do calendário
  const now = new Date();
  const currentCalendarWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentCalendarWeekStartStr = format(currentCalendarWeekStart, 'yyyy-MM-dd');

  // Semana inicial de vigência:
  // Se modo manual ativo e uma semana foi escolhida, passa a valer a partir dela.
  // Caso contrário, passa a valer apenas a partir da semana atual do calendário (sem retroatividade).
  const buyinEffectiveStartWeek = (buyinConfig?.enabled && buyinConfig.isManual && buyinConfig.startWeek && buyinConfig.startWeek.trim())
    ? buyinConfig.startWeek.trim()
    : currentCalendarWeekStartStr;

  // Saldo inicial da banca a ser injetado NO INÍCIO da semana de vigência:
  const configuredBuyinStart = (buyinConfig?.enabled && buyinConfig.isManual && buyinConfig.manualValue !== undefined)
    ? Math.min(target, Math.max(0, Number(buyinConfig.manualValue) || 0))
    : 0;

  let currentBuyin = 0;
  let hasInitializedBuyin = false;
  let currentMakeup = initialMakeup < 0 ? initialMakeup : 0;

  for (const week of orderedWeeks) {
    const raw = week.rawResult;
    const mIn = currentMakeup;

    // A banca passa a existir:
    // 1. Se a banca já foi inicializada em semanas anteriores (preservando seu estado entre semanas)
    // 2. OU se a semana possui um override explícito de banca (ex: semana que preencheu a banca)
    // 3. OU se a semana de vigência foi atingida
    const isWeekWithBuyin = Boolean(
      buyinConfig?.enabled && target > 0 && (
        hasInitializedBuyin ||
        week.buyinBankrollOverride !== undefined ||
        (buyinEffectiveStartWeek && week.weekStart >= buyinEffectiveStartWeek) ||
        (buyinConfig.startWeek && week.weekStart >= buyinConfig.startWeek.trim())
      )
    );

    let bIn = 0;
    if (isWeekWithBuyin) {
      if (!hasInitializedBuyin) {
        // Primeira semana com banca ativa: recebe o valor preenchido manualmente
        bIn = configuredBuyinStart;
        hasInitializedBuyin = true;
      } else {
        // Semanas posteriores: recebe o saldo remanescente da semana anterior
        bIn = currentBuyin;
      }
    }

    let bAllocated = 0;
    let bAbsorbed = 0;
    let bOut = bIn;
    let effectiveTotal = 0;
    let totalLiquido = 0;
    let mOut = 0;

    if (isWeekWithBuyin) {
      if (mIn < 0) {
        // Player está com dívida de makeup da semana anterior.
        // O resultado da semana (raw) é somado ao makeup (netWeek):
        const netWeek = mIn + raw;
        if (netWeek <= 0) {
          // Prejuízo continuado ou ampliado: banca absorve o que puder
          if (bIn > 0) {
            const lossToAbsorb = Math.min(bIn, Math.abs(netWeek));
            bAbsorbed = lossToAbsorb;
            bOut = bIn - bAbsorbed;
            effectiveTotal = netWeek + bAbsorbed;
          } else {
            bOut = bIn;
            effectiveTotal = netWeek;
          }
          mOut = effectiveTotal < 0 ? effectiveTotal : 0;
          totalLiquido = 0;
        } else {
          // Lucro pagou 100% do makeup e sobrou excedente (netWeek > 0):
          // O Total + Rake Deal é o saldo positivo atingido (netWeek):
          effectiveTotal = netWeek;

          // A banca de buy-in é preenchida a partir desse valor de Total + Rake Deal antes de dividir por 2:
          const surplus = netWeek;
          const deficit = Math.max(0, target - bIn);
          bAllocated = Math.min(surplus, deficit);
          bOut = bIn + bAllocated;

          // E o lucro líquido é o que resta após abastecer a banca, dividido pela porcentagem do deal:
          const netProfitAfterBankroll = surplus - bAllocated;
          totalLiquido = netProfitAfterBankroll > 0 ? (netProfitAfterBankroll * profitDealPct) / 100 : 0;
          mOut = 0;
        }
      } else {
        // Sem dívida de makeup (mIn === 0 ou positivo):
        if (raw < 0) {
          // Prejuízo na semana: banca absorve o prejuízo
          const loss = Math.abs(raw);
          bAbsorbed = Math.min(bIn, loss);
          bOut = bIn - bAbsorbed;
          effectiveTotal = raw + bAbsorbed;
          mOut = effectiveTotal < 0 ? effectiveTotal : 0;
          totalLiquido = 0;
        } else if (raw > 0) {
          // Lucro na semana:
          // Total + Rake Deal é o resultado bruto raw:
          effectiveTotal = raw;

          // A banca de buy-in é preenchida com esse valor antes de dividir por 2:
          const deficit = Math.max(0, target - bIn);
          bAllocated = Math.min(raw, deficit);
          bOut = bIn + bAllocated;

          // E o lucro líquido é o que resta após abastecer a banca, dividido pela porcentagem do deal:
          const netProfitAfterBankroll = raw - bAllocated;
          totalLiquido = netProfitAfterBankroll > 0 ? (netProfitAfterBankroll * profitDealPct) / 100 : 0;
          mOut = 0;
        } else {
          bOut = bIn;
          effectiveTotal = 0;
          mOut = 0;
          totalLiquido = 0;
        }
      }

      // Se a semana tem um saldo de banca fixo gravado (ex: fechamento antecipado),
      // usamos esse valor para atualizar bOut e propagar currentBuyin às semanas seguintes.
      if (week.buyinBankrollOverride !== undefined) {
        bOut = week.buyinBankrollOverride;
        hasInitializedBuyin = true;
      }
      currentBuyin = bOut;
    } else {
      // Semanas sem banca de buy-in (anteriores à semana de vigência):
      // Mantém o comportamento cumulativo normal (mIn + raw).
      // O saldo da banca é propagado como está (bIn = bOut = currentBuyin carregado da semana anterior).
      bIn = currentBuyin;
      bOut = currentBuyin;
      effectiveTotal = mIn + raw;
      totalLiquido = effectiveTotal > 0 ? (effectiveTotal * profitDealPct) / 100 : 0;
      mOut = effectiveTotal < 0 ? effectiveTotal : 0;
      // Aplica override se existir (para semanas antecipadas sem buyin formal)
      if (week.buyinBankrollOverride !== undefined) {
        bOut = week.buyinBankrollOverride;
        hasInitializedBuyin = true;
      }
      currentBuyin = bOut;
    }

    const totalWithRakeDeal = effectiveTotal;
    currentMakeup = mOut;

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
  }

  return result;
}

