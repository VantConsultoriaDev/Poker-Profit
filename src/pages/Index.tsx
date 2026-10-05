"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import StatsCards from '@/components/dashboard/StatsCards';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Play, Loader2, Target } from 'lucide-react';
import { formatBB, formatNumber } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';
import DateFilter, { Period, DashboardWeekOption } from '@/components/dashboard/DateFilter';
import { useQuery } from '@tanstack/react-query';
import { 
  startOfDay, 
  startOfMonth, 
  startOfYear, 
  isAfter, 
  isBefore, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  subWeeks 
} from 'date-fns';
import { getBigBlindFromLimitName } from '@/lib/poker';
import { getFilterPeriodRange, DashboardRange } from '@/lib/goals';
import { format } from 'date-fns';

const Index = () => {
  const { convertToBrl } = useCurrency();
  const [period, setPeriod] = useState<Period>('this_week');
  const [customRange, setCustomRange] = useState<DashboardRange | undefined>();

  // Query para Metas Semanais e Média de Sessão — mesma queryKey do StatsCards para cache compartilhado
  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (error && (error.code === '42703' || error.code === 'PGRST204')) {
          const fallback = await supabase
            .from('profiles')
            .select('weekly_grind_goal_hours')
            .eq('id', user.id)
            .maybeSingle();
          return fallback.data;
        }
        if (error) throw error;
        return data;
      } catch (err: any) {
        if (err?.message === 'Usuário não autenticado') throw err;
        return null;
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  // Query para Sessões — verifica autenticação e filtra por user_id
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', 'completed'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('sessions')
        .select('id, result, rake, start_time, end_time, start_hands, end_hands, limit_name, sites(currency)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  // Query para Logs com Cache
  const { data: recentActivities = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['activity_logs', 'recent'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('action, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: weeklyRecords = [] } = useQuery({
    queryKey: ['weekly_rake'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from('weekly_rake').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    }, staleTime: 0,
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ['finance_transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from('finance_transactions').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    }, staleTime: 0,
  });
  const weeks = React.useMemo<DashboardWeekOption[]>(() => {
    const map = new Map<string, { start: string; end: string }>();
    for (const session of sessions) {
      if (!session.start_time) continue;
      const start = startOfWeek(new Date(session.start_time), { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const range = { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
      map.set(range.start, range);
    }
    for (const week of weeklyRecords) map.set(week.week_start, { start: week.week_start, end: week.week_end });
    const nowStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    map.set(format(nowStart, 'yyyy-MM-dd'), { start: format(nowStart, 'yyyy-MM-dd'), end: format(endOfWeek(nowStart, { weekStartsOn: 1 }), 'yyyy-MM-dd') });
    const counts = new Map<string, number>();
    return [...map.values()].sort((a,b) => a.start.localeCompare(b.start)).flatMap(range => {
      const month = range.start.slice(0,7);
      const number = (counts.get(month) || 0) + 1; counts.set(month, number);
      const label = `Semana ${String(number).padStart(2,'0')} (${range.start.slice(8)}/${month.slice(5)} → ${range.end.slice(8)}/${range.end.slice(5,7)})`;
      const tx = transactions.find(t => t.week_start === range.start && t.week_end === range.end && t.description?.startsWith('FECHAMENTO ANTECIPADO'));
      let cutoff: string | undefined;
      if (tx) { try { cutoff = JSON.parse(tx.description.split('|')[1]).anticipated_at || tx.transaction_date; } catch { cutoff = tx.transaction_date; } }
      const key = `${range.start}_${range.end}`;
      if (!cutoff) return [{ key, month, label, range: { ...range, kind: 'regular' as const } }];
      return [
        { key: key+'_total', month, label: label+' Total', range: { ...range, cutoff, kind: 'total' as const } },
        { key: key+'_anticipated', month, label: label+' Antecipada', range: { ...range, cutoff, kind: 'anticipated' as const } },
        { key: key+'_current', month, label: label+' Continuação', range: { ...range, cutoff, kind: 'current' as const } },
      ];
    });
  }, [sessions, weeklyRecords, transactions]);
  const filteredSessions = React.useMemo(() => {
    const earliest = sessions.length ? new Date(sessions[sessions.length-1].start_time) : undefined;
    const range = getFilterPeriodRange(period, customRange, earliest);
    return sessions.filter(s => {
      const date = new Date(s.start_time);
      if (date < range.startDate || date > range.endDate) return false;
      if (customRange?.cutoff && period === 'selected_week') {
        const cutoff = new Date(customRange.cutoff);
        if (customRange.kind === 'anticipated') return date <= cutoff;
        if (customRange.kind === 'current') return date > cutoff;
      }
      return true;
    });
  }, [sessions, period, customRange]);

  const limitStats = React.useMemo(() => {
    const grouped = filteredSessions.reduce((acc: any, s: any) => {
      const limit = s.limit_name;
      if (!acc[limit]) acc[limit] = { limit, totalProfitBrl: 0, totalHands: 0, totalProfitBb: 0 };
      const currency = s.sites?.currency || 'BRL';
      const profitBrl = convertToBrl(Number(s.result || 0), currency);
      acc[limit].totalProfitBrl += profitBrl;
      acc[limit].totalHands += (Number(s.end_hands || 0) - Number(s.start_hands || 0));

      const bb = getBigBlindFromLimitName(limit);
      if (bb) {
        const bbValueBrl = convertToBrl(bb, currency);
        if (bbValueBrl > 0) acc[limit].totalProfitBb += profitBrl / bbValueBrl;
      }
      return acc;
    }, {});

    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
    return Object.values(grouped)
      .map((item: any, index: number) => ({
        ...item,
        bb: item.totalHands > 0 ? (item.totalProfitBb / item.totalHands) * 100 : 0,
        color: colors[index % colors.length]
      }))
      .sort((a: any, b: any) => b.totalHands - a.totalHands)
      .slice(0, 5);
  }, [filteredSessions, convertToBrl]);

  const now = React.useMemo(() => new Date(), []);
  const currentWeekStart = React.useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [now]);
  const currentWeekEnd = React.useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), [now]);

  const currentWeekGrindHours = React.useMemo(() => {
    const weekSessions = sessions.filter((s: any) => {
      if (!s.start_time) return false;
      const d = new Date(s.start_time);
      return d >= currentWeekStart && d <= currentWeekEnd;
    });

    const sessionIntervals: Array<{ start: number; end: number }> = [];
    weekSessions.forEach((s: any) => {
      if (s.start_time && s.end_time) {
        const start = new Date(s.start_time).getTime();
        const end = new Date(s.end_time).getTime();
        sessionIntervals.push({ start, end: Math.max(start, end) });
      }
    });

    sessionIntervals.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [];
    sessionIntervals.forEach((interval) => {
      const last = merged[merged.length - 1];
      if (!last || interval.start > last.end) {
        merged.push({ ...interval });
        return;
      }
      last.end = Math.max(last.end, interval.end);
    });

    const totalMinutes = merged.reduce((acc, interval) => {
      return acc + Math.max(0, (interval.end - interval.start) / (1000 * 60));
    }, 0);

    return totalMinutes / 60;
  }, [sessions, currentWeekStart, currentWeekEnd]);

  const savedLocalSessionAvg = typeof window !== 'undefined' ? localStorage.getItem('poker_weekly_session_avg_hours') : null;
  const sessionAvgHours = profile?.weekly_session_avg_hours !== undefined && profile?.weekly_session_avg_hours !== null
    ? Number(profile.weekly_session_avg_hours)
    : (savedLocalSessionAvg !== null ? Number(savedLocalSessionAvg) : 2);

  const grindGoalHours = Number(profile?.weekly_grind_goal_hours || 0);
  const remainingHours = Math.max(0, grindGoalHours - currentWeekGrindHours);
  const remainingSessions = sessionAvgHours > 0 ? Math.ceil(remainingHours / sessionAvgHours) : 0;

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Resumo de performance PLO.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Card Sessões p/ Meta: mostra skeleton enquanto carrega, oculta apenas se meta não definida APÓS carregamento */}
              {isLoadingProfile ? (
                <div className="bg-card border border-border px-3.5 py-1.5 rounded-lg flex items-center gap-2.5 shadow-sm animate-pulse w-36 h-10" />
              ) : grindGoalHours > 0 ? (
                <div className="bg-card border border-border px-3.5 py-1.5 rounded-lg flex items-center gap-2.5 shadow-sm">
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
                      Sessões p/ Meta
                    </div>
                    <div className="font-bold flex items-center gap-1.5 mt-0.5 leading-none">
                      {remainingHours <= 0 ? (
                        <span className="text-emerald-500 text-xs font-bold">Meta atingida! 🎉</span>
                      ) : (
                        <>
                          <span className="text-amber-500 text-sm font-extrabold">{remainingSessions}</span>
                          <span className="text-muted-foreground text-[11px] font-medium">
                            {remainingSessions === 1 ? 'restante' : 'restantes'} ({remainingHours.toFixed(1)}h)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              <DateFilter weeks={weeks} period={period} onPeriodChange={(p, r) => { setPeriod(p); setCustomRange(r); }} />
              <Link to="/sessions">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                  <Play className="w-4 h-4 fill-current" /> Nova Sessão
                </Button>
              </Link>
            </div>
          </div>

          <StatsCards 
            sessions={filteredSessions} 
            allSessions={sessions}
            period={period}
            customRange={customRange}
            isLoading={loadingSessions} 
          />
          <PerformanceChart sessions={filteredSessions} isLoading={loadingSessions} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-card-foreground mb-4">BB/100 por Limite</h3>
              <div className="space-y-4">
                {loadingSessions ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                ) : limitStats.length > 0 ? limitStats.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${item.color}`} />
                      <div>
                        <p className="font-bold text-foreground">{item.limit}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(item.totalHands)} mãos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", item.bb >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{formatBB(item.bb)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">BB/100</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-10">Nenhum dado disponível.</p>
                )}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-card-foreground mb-4">Atividades</h3>
              <div className="space-y-4">
                {loadingLogs ? (
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                ) : recentActivities.map((log: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-border pb-3 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">{log.action[0]}</div>
                    <div className="flex-1">
                      <p className="text-foreground font-bold">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

function cn(...classes: any[]) { return classes.filter(Boolean).join(' '); }
export default Index;