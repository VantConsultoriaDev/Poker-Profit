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
  start_time?: string | null;
  end_time?: string | null;
  limit_name?: string | null;
  sites?: SessionSite | null;
};

const StatsCards = ({ 
  sessions = [], 
  allSessions = [],
  isLoading 
}: { 
  sessions: DashboardSession[]; 
  allSessions?: DashboardSession[];
  isLoading?: boolean 
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      return user;
    },
    staleTime: 60000,
    retry: 3,
  });

  const { data: weeklyRakes = [], isLoading: isLoadingRakes } = useQuery({
    queryKey: ['weekly_rake'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('weekly_rake')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: financeTransactions = [], isLoading: isLoadingFinance } = useQuery({
    queryKey: ['finance_transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const getWeekData = (weekKey: string) => {
    const dbEntry = weeklyRakes.find(r => `${r.week_start}_${r.week_end}` === weekKey);
    if (dbEntry) {
      const rakeTotal = Number(dbEntry.rake_total_brl || 0);
      const rakeDeal = (rakeTotal * Number(dbEntry.rake_deal_pct || 0)) / 100;
      return { rakeTotal, rakeDeal };
    }

    // Fallback to localStorage for compatibility or unsynced data
    const totalStr = localStorage.getItem(`weekly_rake_total_value_${weekKey}`);
    const dealStr = localStorage.getItem(`weekly_rake_deal_value_${weekKey}`);
    const total = totalStr ? Number(totalStr) : 0;
    const deal = dealStr ? Number(dealStr) : 0;
    return { rakeTotal: total, rakeDeal: deal };
  };

  const statsData = React.useMemo(() => {
    let totalResultBrl = 0;
    let totalHands = 0;
    let totalMinutes = 0;
    let totalProfitBb = 0;
    let totalHandsForBb = 0;
    const sessionDurations = new Map<string, { start: number; end: number }>();
    const weeksInScope = new Set<string>();
    const weekMaxBbBrl = new Map<string, number>();

    sessions.forEach((s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const resultBrl = convertToBrl(Number(s.result || 0), currency);
      totalResultBrl += resultBrl;
      totalHands += (Number(s.end_hands || 0) - Number(s.start_hands || 0));

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
          totalHandsForBb += (Number(s.end_hands || 0) - Number(s.start_hands || 0));

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
        const key = startDate.toISOString();
        const start = startDate.getTime();
        const end = endDate.getTime();
        const prev = sessionDurations.get(key);
        if (!prev) {
          sessionDurations.set(key, { start, end });
        } else {
          sessionDurations.set(key, { start: Math.min(prev.start, start), end: Math.max(prev.end, end) });
        }
      }
    });

    sessionDurations.forEach(({ start, end }) => {
      totalMinutes += (end - start) / (1000 * 60);
    });

    const hh = Math.floor(totalMinutes / 60);
    const mm = Math.floor(totalMinutes % 60);
    const hoursLabel = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const sessionCount = sessionDurations.size;

    let totalRakeDealBrl = 0;
    let totalRakeTotalBrl = 0;
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

    const netResultBrl = totalResultBrl - expensesInPeriod;
    const totalWithRakeDealBrl = (totalResultBrl + totalRakeDealBrl) - expensesInPeriod;
    const totalProfitBbWithRb = totalProfitBb + rbProfitBb;
    const bb100 = totalHandsForBb > 0 ? (totalProfitBbWithRb / totalHandsForBb) * 100 : 0;

    return {
      totalResultBrl: netResultBrl,
      totalHands,
      hoursLabel,
      sessionCount,
      totalWithRakeDealBrl,
      totalRakeTotalBrl,
      totalRakeDealBrl,
      bb100
    };
  }, [sessions, convertToBrl, weeklyRakes, financeTransactions]);

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
    const totalInitial = weeklyRakes.reduce((acc, r) => acc + Number(r.bankroll_initial || 0), 0);
    const totalDeposits = financeTransactions
      .filter(t => t.type === 'deposit')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
    const totalWithdraws = financeTransactions
      .filter(t => t.type === 'withdraw')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
    
    // Bankroll atual = (Soma Iniciais + Recargas - Saques) + Resultado Global das sessões
    // Rake Deal NÃO é somado aqui, apenas no fechamento semanal
    // Aplicando Math.round em cada etapa para evitar erros de ponto flutuante
    const safeTotalInitial = Math.round(totalInitial * 100) / 100;
    const safeTotalDeposits = Math.round(totalDeposits * 100) / 100;
    const safeTotalWithdraws = Math.round(totalWithdraws * 100) / 100;
    const safeGlobalProfit = Math.round(globalProfitBrl * 100) / 100;

    const finalBankroll = safeTotalInitial + safeTotalDeposits - safeTotalWithdraws + safeGlobalProfit;
    return Math.round(finalBankroll * 100) / 100;
  }, [weeklyRakes, financeTransactions, globalProfitBrl]);

  const stats = React.useMemo(() => {
    const { 
      totalResultBrl, 
      totalHands, 
      hoursLabel, 
      totalWithRakeDealBrl, 
      totalRakeTotalBrl, 
      totalRakeDealBrl, 
      bb100 
    } = statsData;

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
        label: 'BB/100 Geral', 
        value: formatBB(bb100), 
        icon: Target, 
        color: bb100 >= 0 ? 'text-blue-500' : 'text-rose-500', 
        bg: bb100 >= 0 ? 'bg-blue-500/10' : 'bg-rose-500/10',
        textColor: bb100 >= 0 ? 'text-emerald-500' : 'text-rose-500'
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
  }, [statsData, currentBankroll]);

  if (isLoading || isLoadingAuth || isLoadingRakes || isLoadingFinance) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-card border-border animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
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
  );
};

export default StatsCards;