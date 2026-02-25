"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import StatsCards from '@/components/dashboard/StatsCards';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Play, Clock, Loader2 } from 'lucide-react';
import { formatBB, formatNumber } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';
import DateFilter, { Period } from '@/components/dashboard/DateFilter';
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

const Index = () => {
  const { convertToBrl } = useCurrency();
  const [period, setPeriod] = useState<Period>('all');
  const [customRange, setCustomRange] = useState<{start: string, end: string} | undefined>();

  // Query para Sessões com Cache de 1 minuto
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', 'completed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, result, start_time, end_time, start_hands, end_hands, limit_name, sites(currency)')
        .eq('status', 'completed')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Query para Logs com Cache de 30 segundos
  const { data: recentActivities = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['activity_logs', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('action, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  // Processamento de dados (Memoizado implicitamente pelo React Query)
  const filteredSessions = React.useMemo(() => {
    const now = new Date();
    return sessions.filter(s => {
      const date = new Date(s.start_time);
      if (period === 'day') return isAfter(date, startOfDay(now));
      if (period === 'this_week') return isAfter(date, startOfWeek(now, { weekStartsOn: 1 })) && isBefore(date, endOfWeek(now, { weekStartsOn: 1 }));
      if (period === 'last_week') {
        const lastWeek = subWeeks(now, 1);
        return isAfter(date, startOfWeek(lastWeek, { weekStartsOn: 1 })) && isBefore(date, endOfWeek(lastWeek, { weekStartsOn: 1 }));
      }
      if (period === 'month') return isAfter(date, startOfMonth(now));
      if (period === 'year') return isAfter(date, startOfYear(now));
      if (period === 'custom' && customRange) {
        const start = startOfDay(parseISO(customRange.start));
        const end = startOfDay(new Date(parseISO(customRange.end).getTime() + 86400000));
        return isAfter(date, start) && isBefore(date, end);
      }
      return true;
    });
  }, [sessions, period, customRange]);

  const limitStats = React.useMemo(() => {
    const grouped = filteredSessions.reduce((acc: any, s: any) => {
      const limit = s.limit_name;
      if (!acc[limit]) acc[limit] = { limit, totalProfitBrl: 0, totalHands: 0 };
      const currency = s.sites?.currency || 'BRL';
      acc[limit].totalProfitBrl += convertToBrl(Number(s.result || 0), currency);
      acc[limit].totalHands += (Number(s.end_hands || 0) - Number(s.start_hands || 0));
      return acc;
    }, {});

    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
    return Object.values(grouped)
      .map((item: any, index: number) => ({
        ...item,
        bb: item.totalHands > 0 ? (item.totalProfitBrl / item.totalHands) * 100 : 0,
        color: colors[index % colors.length]
      }))
      .sort((a: any, b: any) => b.totalHands - a.totalHands)
      .slice(0, 5);
  }, [filteredSessions, convertToBrl]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Resumo de performance PLO.</p>
            </div>
            <div className="flex items-center gap-3">
              <DateFilter period={period} onPeriodChange={(p, r) => { setPeriod(p); setCustomRange(r); }} />
              <Link to="/sessions">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                  <Play className="w-4 h-4 fill-current" /> Nova Sessão
                </Button>
              </Link>
            </div>
          </div>

          <StatsCards />
          <PerformanceChart />

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
                      <p className="text-[10px] text-muted-foreground uppercase">BB/100 (R$)</p>
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