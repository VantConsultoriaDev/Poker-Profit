import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  subWeeks, 
  startOfMonth, endOfMonth, getDaysInMonth, 
  startOfYear, endOfYear, 
  differenceInCalendarDays, parseISO, isLeapYear
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
