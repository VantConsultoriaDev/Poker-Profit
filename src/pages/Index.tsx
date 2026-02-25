"use client";

import React, { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [limitStats, setLimitStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('all');
  const [customRange, setCustomRange] = useState<{start: string, end: string} | undefined>();

  const fetchData = async () => {
    setLoading(true);
    
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, sites(currency)')
      .eq('status', 'completed');

    if (sessions) {
      let filteredSessions = sessions;
      const now = new Date();

      if (period === 'day') {
        filteredSessions = sessions.filter(s => isAfter(new Date(s.start_time), startOfDay(now)));
      } else if (period === 'this_week') {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });
        filteredSessions = sessions.filter(s => {
          const date = new Date(s.start_time);
          return isAfter(date, start) && isBefore(date, end);
        });
      } else if (period === 'last_week') {
        const lastWeek = subWeeks(now, 1);
        const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        filteredSessions = sessions.filter(s => {
          const date = new Date(s.start_time);
          return isAfter(date, start) && isBefore(date, end);
        });
      } else if (period === 'month') {
        filteredSessions = sessions.filter(s => isAfter(new Date(s.start_time), startOfMonth(now)));
      } else if (period === 'year') {
        filteredSessions = sessions.filter(s => isAfter(new Date(s.start_time), startOfYear(now)));
      } else if (period === 'custom' && customRange) {
        const start = parseISO(customRange.start);
        const end = parseISO(customRange.end);
        filteredSessions = sessions.filter(s => {
          const date = new Date(s.start_time);
          return isAfter(date, startOfDay(start)) && isBefore(date, startOfDay(new Date(end.getTime() + 86400000)));
        });
      }

      const grouped = filteredSessions.reduce((acc: any, s: any) => {
        const limit = s.limit_name;
        if (!acc[limit]) acc[limit] = { limit, totalProfitBrl: 0, totalHands: 0 };
        const currency = s.sites?.currency || 'BRL';
        acc[limit].totalProfitBrl += convertToBrl(Number(s.result || 0), currency);
        acc[limit].totalHands += (Number(s.end_hands || 0) - Number(s.start_hands || 0));
        return acc;
      }, {});

      const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
      const statsArray = Object.values(grouped).map((item: any, index: number) => ({
        ...item,
        bb: item.totalHands > 0 ? (item.totalProfitBrl / item.totalHands) * 100 : 0,
        color: colors[index % colors.length]
      }));
      
      setLimitStats(statsArray.sort((a, b) => b.totalHands - a.totalHands).slice(0, 5));
    }

    const { data: logs } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5);
    if (logs) setRecentActivities(logs);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [period, customRange, convertToBrl]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 mt-1">Resumo de performance PLO.</p>
            </div>
            <div className="flex items-center gap-3">
              <DateFilter period={period} onPeriodChange={(p, r) => { setPeriod(p); setCustomRange(r); }} />
              <Button variant="outline" onClick={fetchData} className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 gap-2">
                <Clock className="w-4 h-4" /> Atualizar
              </Button>
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">BB/100 por Limite</h3>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                ) : limitStats.length > 0 ? limitStats.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${item.color}`} />
                      <div>
                        <p className="font-bold text-white">{item.limit}</p>
                        <p className="text-xs text-slate-400">{formatNumber(item.totalHands)} mãos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", item.bb >= 0 ? "text-emerald-400" : "text-rose-400")}>{formatBB(item.bb)}</p>
                      <p className="text-[10px] text-slate-500 uppercase">BB/100 (R$)</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-500 py-10">Nenhum dado disponível.</p>
                )}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Atividades</h3>
              <div className="space-y-4">
                {recentActivities.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-slate-800 pb-3 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">{log.action[0]}</div>
                    <div className="flex-1">
                      <p className="text-slate-200 font-bold">{log.action}</p>
                      <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
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