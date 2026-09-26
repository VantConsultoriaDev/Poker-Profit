"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, MousePointer2, Target, DollarSign, Percent, Wallet } from 'lucide-react';
import { formatCurrency, formatNumber, formatBB } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getBigBlindFromLimitName } from '@/lib/poker';
import { format, endOfWeek, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type SessionSite = { currency?: string } | { currency?: string }[];
type DashboardSession = {
  id?: string;
  result?: number | null;
  rake?: number | null;
  start_hands?: number | null;
  end_hands?: number | null;
  start_hands_bp?: number | null;
  end_hands_bp?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  limit_name?: string | null;
  sites?: SessionSite | null;
};

type StudyRecord = {
  study_type: 'fixed' | 'one_off';
  weekday: number | null;
  study_date: string | null;
  duration_minutes: number;
  active: boolean;
};

import { formatHoursMinutes, getFilterPeriodRange, calculateStudyMinutesInInterval } from '@/lib/goals';

const StatsCards = ({ 
  sessions = [], 
  allSessions = [],
  isLoading,
  period,
  customRange,
}: { 
  sessions: DashboardSession[]; 
  allSessions?: DashboardSession[];
  isLoading?: boolean;
  period?: string;
  customRange?: { start: string; end: string };
}) => {
  const { convertToBrl } = useCurrency();

  const getWeekKeyForDate = (d: Date) => {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`;
  };

  const { data: authUser, isLoading: isLoadingAuth } = useQuery({
    queryKey: ['auth_user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Usuário não autenticado');
      return user;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: weeklyRakes = [], isLoading: isLoadingRakes } = useQuery({
    queryKey: ['weekly_rake'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('weekly_rake')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: financeTransactions = [], isLoading: isLoadingFinance } = useQuery({
    queryKey: ['finance_transactions'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const profileQuery = await supabase
        .from('profiles')
        .select('makeup_value, retro_hours, retro_hands, retro_rake_total, retro_rake_deal, retro_result, weekly_grind_goal_hours, weekly_study_goal_hours, profit_deal')
        .eq('id', user.id)
        .single();
      if (!profileQuery.error) return profileQuery.data;
      if (profileQuery.error.code !== '42703' && profileQuery.error.code !== 'PGRST204') throw profileQuery.error;

      const fallbackQuery = await supabase
        .from('profiles')
        .select('makeup_value, retro_hours, retro_hands, retro_rake_total, retro_rake_deal, retro_result')
        .eq('id', user.id)
        .single();
      if (fallbackQuery.error) throw fallbackQuery.error;
      return fallbackQuery.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: studyRecords = [], isLoading: isLoadingStudies } = useQuery({
    queryKey: ['study_records'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('study_records')
        .select('study_type, weekday, study_date, duration_minutes, active')
        .eq('user_id', user.id)
        .eq('active', true);
      if (error) throw error;
      return (data || []) as StudyRecord[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const getWeekData = (weekKey: string) => {
    const dbEntry = weeklyRakes.find(r => `${r.week_start}_${r.week_end}` === weekKey);
    if (dbEntry) {
      const rakeTotal = Number(dbEntry.rake_total_brl || 0);
      const rakeDeal = (rakeTotal * Number(dbEntry.rake_deal_pct || 0)) / 100;
      return { rakeTotal, rakeDeal };
    }

    // Fallback to localStorage for compatibility or unsynced data
    return { rakeTotal: 0, rakeDeal: 0 };
  };

  const statsData = React.useMemo(() => {
    const weekStartNow = startOfWeek(new Date(), { weekStartsOn: 1 });
    const hasPriorHistory = weeklyRakes.length > 0 || (allSessions && allSessions.some(s => {
      if (!s.start_time) return false;
      return new Date(s.start_time) < weekStartNow;
    }));

    // Retro+makeup só aplicados na primeira semana do sistema (sem histórico prévio).
    // O filtro 'Tudo' (all) mostra a soma de todas as sessões cadastradas — sem ajuste de dados retroativos de perfil.
    const shouldIncludeRetroAndMakeup = !hasPriorHistory && (period === 'this_week' || !period);

    let totalResultBrl = shouldIncludeRetroAndMakeup ? Number(profile?.retro_result || 0) : 0;
    let totalHands = shouldIncludeRetroAndMakeup ? Number(profile?.retro_hands || 0) : 0;
    let totalMinutes = shouldIncludeRetroAndMakeup ? (Number(profile?.retro_hours || 0) * 60) : 0;
    let totalProfitBb = 0;
    let totalHandsForBb = 0;
    let sessionMinutes = 0;
    const sessionIntervals: Array<{ start: number; end: number }> = [];
    const weeksInScope = new Set<string>();
    const weekMaxBbBrl = new Map<string, number>();

    sessions.forEach((s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const resultBrl = convertToBrl(Number(s.result || 0), currency);
      const hands = Number(s.end_hands || 0) - Number(s.start_hands || 0);
      const totalSessionHands = hands;
      totalResultBrl += resultBrl;
      totalHands += totalSessionHands;

      let weekKey = '';
      if (s.start_time) {
        weekKey = getWeekKeyForDate(new Date(s.start_time));
        weeksInScope.add(weekKey);
      }

      const bb = getBigBlindFromLimitName(s.limit_name);
      if (bb) {
        const bbValueBrl = convertToBrl(bb, currency);
        if (bbValueBrl > 0) {
          totalProfitBb += resultBrl / bbValueBrl;
          totalHandsForBb += totalSessionHands;

          if (weekKey) {
            const currentMax = weekMaxBbBrl.get(weekKey) || 0;
            if (bbValueBrl > currentMax) weekMaxBbBrl.set(weekKey, bbValueBrl);
          }
        }
      }
      
      if (s.start_time && s.end_time) {
        const startDate = new Date(s.start_time);
        startDate.setMilliseconds(0);
        const endDate = new Date(s.end_time);
        endDate.setMilliseconds(0);
        const start = startDate.getTime();
        const end = endDate.getTime();
        sessionIntervals.push({ start, end: Math.max(start, end) });
      }
    });

    sessionIntervals.sort((a, b) => a.start - b.start);
    const mergedIntervals: Array<{ start: number; end: number }> = [];
    sessionIntervals.forEach((interval) => {
      const lastInterval = mergedIntervals[mergedIntervals.length - 1];
      if (!lastInterval || interval.start > lastInterval.end) {
        mergedIntervals.push({ ...interval });
        return;
      }

      lastInterval.end = Math.max(lastInterval.end, interval.end);
    });

    mergedIntervals.forEach(({ start, end }) => {
      const intervalMinutes = (end - start) / (1000 * 60);
      totalMinutes += intervalMinutes;
      sessionMinutes += intervalMinutes;
    });

    const hh = Math.floor(totalMinutes / 60);
    const mm = Math.floor(totalMinutes % 60);
    const hoursLabel = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const sessionCount = mergedIntervals.length;

    let totalRakeDealBrl = shouldIncludeRetroAndMakeup ? Number(profile?.retro_rake_deal || 0) : 0;
    let totalRakeTotalBrl = shouldIncludeRetroAndMakeup ? Number(profile?.retro_rake_total || 0) : 0;
    let rbProfitBb = 0;

    weeksInScope.forEach((k) => {
      const { rakeTotal, rakeDeal } = getWeekData(k);
      totalRakeTotalBrl += rakeTotal;
      totalRakeDealBrl += rakeDeal;

      // Converter o lucro do RB da semana para BB usando o maior blind daquela semana
      const maxBb = weekMaxBbBrl.get(k);
      if (maxBb && maxBb > 0) {
        rbProfitBb += rakeDeal / maxBb;
      }
    });

    // Calcular despesas no período filtrado
    const expensesInPeriod = financeTransactions
      .filter(t => t.type === 'expense' && t.week_start && t.week_end)
      .filter(t => weeksInScope.has(`${t.week_start}_${t.week_end}`))
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

    const makeupBrl = shouldIncludeRetroAndMakeup ? Number(profile?.makeup_value || 0) : 0;

    // Resultado S/ RB reflete puramente o ganho/perda de poker nas mesas (sem RB e sem deduzir despesas adicionais)
    const netResultBrl = totalResultBrl;
    // O Resultado Total (+RB) e o Lucro Líquido deduzem as despesas operacionais da semana
    const totalWithRakeDealBrl = (totalResultBrl + totalRakeDealBrl) - expensesInPeriod + makeupBrl;
    const totalProfitBbWithRb = totalProfitBb + rbProfitBb;
    const bb100 = totalHandsForBb > 0 ? (totalProfitBbWithRb / totalHandsForBb) * 100 : 0;

    const earliestSessionDate = allSessions && allSessions.length > 0
      ? new Date(Math.min(...allSessions.map(s => s.start_time ? new Date(s.start_time).getTime() : Date.now())))
      : undefined;

    const periodRange = getFilterPeriodRange(period, customRange, earliestSessionDate);
    const { startDate, endDate, daysCount, periodLabel } = periodRange;

    // Metas calculadas proporcionalmente aos dias do período filtrado:
    // (meta semanal / 7) * dias do filtro
    const baseWeeklyGrind = Number(profile?.weekly_grind_goal_hours || 0);
    const baseWeeklyStudy = Number(profile?.weekly_study_goal_hours || 0);

    const grindGoalHours = (baseWeeklyGrind / 7) * daysCount;
    const studyGoalHours = (baseWeeklyStudy / 7) * daysCount;

    const grindCompletedHours = sessionMinutes / 60;
    const studyMinutes = calculateStudyMinutesInInterval(studyRecords, startDate, endDate);
    const studyCompletedHours = studyMinutes / 60;

    return {
      totalResultBrl: netResultBrl,
      totalHands,
      hoursLabel,
      sessionCount,
      totalWithRakeDealBrl,
      totalRakeTotalBrl,
      totalRakeDealBrl,
      bb100,
      grindGoalHours,
      studyGoalHours,
      grindCompletedHours,
      studyCompletedHours,
      periodLabel,
    };
  }, [sessions, convertToBrl, weeklyRakes, financeTransactions, profile, studyRecords, period, customRange, allSessions]);

  const globalProfitBrl = React.useMemo(() => {
    // Se allSessions não estiver carregado, retorna 0 para não quebrar o cálculo
    if (!allSessions || allSessions.length === 0) return 0;
    
    const total = allSessions.reduce((acc, s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const sessionResult = Number(s.result || 0);
      return acc + convertToBrl(sessionResult, currency);
    }, 0);
    
    return total;
  }, [allSessions, convertToBrl]);

  const currentBankroll = React.useMemo(() => {
    // 1. Localizar o fechamento mais recente (antecipado ou regular)
    const closingTxs = financeTransactions
      .filter(t => t.type === 'withdraw' && (t.description?.startsWith('FECHAMENTO') || false))
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    const latestClosing = closingTxs[0];

    if (latestClosing) {
      let cutoff = new Date(latestClosing.transaction_date);
      let newBanca = 0;

      if (latestClosing.description?.startsWith('FECHAMENTO ANTECIPADO')) {
        const parts = latestClosing.description.split('|');
        if (parts.length > 1) {
          try {
            const data = JSON.parse(parts[1]);
            if (data.anticipated_at) {
              cutoff = new Date(data.anticipated_at);
            }
            if (data.new_bankroll_initial) {
              newBanca = Number(data.new_bankroll_initial);
            }
          } catch (e) {
            console.error('Erro ao processar antecipação em currentBankroll:', e);
          }
        }
      }

      const sessions = allSessions || [];

      // Função para verificar se a transação pertence ao período ativo pós-fechamento
      const isTxAfterClosing = (t: any) => {
        // Se a transação tem week_start pertencente a uma semana posterior à semana do fechamento, é da semana atual
        if (t.week_start && latestClosing.week_start && t.week_start > latestClosing.week_start) {
          return true;
        }
        return new Date(t.transaction_date) >= cutoff;
      };

      // Depósitos realizados na semana pós-fechamento (inclui a Banca inicial e recargas)
      const depositsAfter = financeTransactions
        .filter(t => t.type === 'deposit' && isTxAfterClosing(t))
        .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

      // Localizar o registro weekly_rake da semana ativa mais recente
      const activeWeekRake = weeklyRakes
        .filter(r => !latestClosing.week_start || r.week_start >= latestClosing.week_start)
        .sort((a, b) => b.week_start.localeCompare(a.week_start))[0];

      const initialFromRake = Number(activeWeekRake?.bankroll_initial || 0);

      // Banca inicial efetiva: prioriza depósitos da semana ativa, depois bankroll_initial de weekly_rake, depois newBanca
      const effectiveInitial = depositsAfter > 0 ? depositsAfter : (initialFromRake > 0 ? initialFromRake : newBanca);

      // Saques após o corte (não inclui o próprio saque do fechamento)
      const withdrawsAfter = financeTransactions
        .filter(t => t.type === 'withdraw' && t.id !== latestClosing.id && isTxAfterClosing(t))
        .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

      // Despesas após o corte (deduzidas do bankroll da semana/período ativo)
      const expensesAfter = financeTransactions
        .filter(t => t.type === 'expense' && isTxAfterClosing(t))
        .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

      // Sessões jogadas após o corte
      const isSessionAfterClosing = (s: any) => {
        if (!s.start_time) return false;
        const sDate = new Date(s.start_time);
        if (latestClosing.description?.startsWith('FECHAMENTO ANTECIPADO')) {
          return sDate > cutoff;
        }
        if (latestClosing.week_end) {
          const [ey, em, ed] = latestClosing.week_end.split('-').map(Number);
          const endOfWeek = new Date(ey, em - 1, ed, 23, 59, 59, 999);
          return sDate > endOfWeek || sDate > cutoff;
        }
        return sDate > cutoff;
      };

      const sessionsAfter = sessions.filter(isSessionAfterClosing);

      const profitAfter = sessionsAfter.reduce((acc, s) => {
        const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
        const currency = siteData?.currency || 'BRL';
        return acc + convertToBrl(Number(s.result || 0), currency);
      }, 0);

      const rakeAfter = sessionsAfter.reduce((acc, s) => {
        const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
        const currency = siteData?.currency || 'BRL';
        return acc + convertToBrl(Number(s.rake || 0), currency);
      }, 0);

      const rakeDealPct = Number(activeWeekRake?.rake_deal_pct || 0);
      const rakeDealAfter = (rakeAfter * rakeDealPct) / 100;

      const total = effectiveInitial - withdrawsAfter - expensesAfter + profitAfter + rakeDealAfter;
      return Math.round(total * 100) / 100;
    }

    // Sem fechamento: cálculo padrão baseado na banca inicial e transações ativas
    const totalInitial = weeklyRakes.reduce((acc, r) => acc + Number(r.bankroll_initial || 0), 0);
    const totalDeposits = financeTransactions
      .filter(t => t.type === 'deposit')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
    const totalWithdraws = financeTransactions
      .filter(t => t.type === 'withdraw')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
    const totalExpenses = financeTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

    const baseInitial = totalDeposits > 0 ? totalDeposits : totalInitial;
    const total = baseInitial - totalWithdraws - totalExpenses + globalProfitBrl;
    return Math.round(total * 100) / 100;
  }, [financeTransactions, allSessions, convertToBrl, weeklyRakes, globalProfitBrl]);

  const stats = React.useMemo(() => {
    const {
      totalResultBrl, 
      totalHands, 
      hoursLabel, 
      totalWithRakeDealBrl, 
      totalRakeTotalBrl, 
      totalRakeDealBrl, 
      bb100,
      grindGoalHours,
      studyGoalHours,
      grindCompletedHours,
      studyCompletedHours,
    } = statsData;

    const savedLocalDeal = typeof window !== 'undefined' ? localStorage.getItem('poker_profit_deal') : null;
    const profitDealPct = profile?.profit_deal !== undefined && profile?.profit_deal !== null
      ? Number(profile.profit_deal)
      : (savedLocalDeal !== null ? Number(savedLocalDeal) : 100);

    const lucroLiquidoBrl = (totalWithRakeDealBrl * profitDealPct) / 100;

    return [
      { 
        label: 'Bankroll atual', 
        value: formatCurrency(currentBankroll), 
        icon: Wallet, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10', 
        textColor: 'text-emerald-500' 
      },
      { 
        label: 'Lucro Líquido', 
        // Lucro não pode ser negativo: quando o resultado ainda não cobre as despesas/makeup, exibe R$0,00
        value: formatCurrency(Math.max(0, lucroLiquidoBrl)), 
        icon: TrendingUp, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10', 
        textColor: 'text-emerald-500' 
      },
      { 
        label: 'Horas Jogadas', 
        value: hoursLabel, 
        icon: Clock, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10', 
        textColor: 'text-foreground' 
      },
      { 
        label: 'Total de Mãos', 
        value: formatNumber(totalHands), 
        icon: MousePointer2, 
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10', 
        textColor: 'text-foreground' 
      },
      { 
        label: 'Resultado Total (+RB)', 
        value: formatCurrency(totalWithRakeDealBrl), 
        icon: DollarSign, 
        color: totalWithRakeDealBrl >= 0 ? 'text-emerald-500' : 'text-rose-500',
        bg: totalWithRakeDealBrl >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        textColor: totalWithRakeDealBrl >= 0 ? 'text-emerald-500' : 'text-rose-500'
      },
      { 
        label: 'Resultado S/ RB', 
        value: formatCurrency(totalResultBrl), 
        icon: DollarSign, 
        color: totalResultBrl >= 0 ? 'text-emerald-500' : 'text-rose-500',
        bg: totalResultBrl >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        textColor: totalResultBrl >= 0 ? 'text-emerald-500' : 'text-rose-500'
      },
      { 
        label: 'Rake Total', 
        value: formatCurrency(totalRakeTotalBrl), 
        icon: Percent, 
        color: 'text-rose-500', 
        bg: 'bg-rose-500/10', 
        textColor: 'text-foreground' 
      },
      { 
        label: 'Rake Deal', 
        value: formatCurrency(totalRakeDealBrl), 
        icon: Percent, 
        color: 'text-rose-500', 
        bg: 'bg-rose-500/10', 
        textColor: 'text-foreground' 
      },
    ];
  }, [statsData, currentBankroll, profile]);

  if (isLoading || isLoadingAuth || isLoadingRakes || isLoadingFinance || isLoadingStudies || isLoadingProfile) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card border-border animate-pulse h-24" />
          <Card className="bg-card border-border animate-pulse h-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-card border-border animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const grindProgressPercent = statsData.grindGoalHours > 0
    ? Math.min(100, (statsData.grindCompletedHours / statsData.grindGoalHours) * 100)
    : 0;
  const studyProgressPercent = statsData.studyGoalHours > 0
    ? Math.min(100, (statsData.studyCompletedHours / statsData.studyGoalHours) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {(statsData.grindGoalHours > 0 || statsData.studyGoalHours > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {statsData.grindGoalHours > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta de grind</p>
                    <p className="text-lg font-bold">
                      {formatHoursMinutes(statsData.grindCompletedHours)} / {formatHoursMinutes(statsData.grindGoalHours)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-amber-500">{Math.round(grindProgressPercent)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${grindProgressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Horas jogadas {statsData.periodLabel}</p>
              </CardContent>
            </Card>
          )}
          {statsData.studyGoalHours > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta de estudo</p>
                    <p className="text-lg font-bold">
                      {formatHoursMinutes(statsData.studyCompletedHours)} / {formatHoursMinutes(statsData.studyGoalHours)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-sky-500">{Math.round(studyProgressPercent)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${studyProgressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Horas de estudo {statsData.periodLabel}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-card border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`${stat.color} w-4 h-4`} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <h3 className={`text-xl font-bold mt-1 ${stat.textColor || 'text-foreground'}`}>{stat.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    </div>
  );
};

export default StatsCards;
