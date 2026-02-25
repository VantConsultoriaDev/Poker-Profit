"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import StatsCards from '@/components/dashboard/StatsCards';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Play, Filter, Loader2, Clock } from 'lucide-react';
import { formatBB, formatNumber } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';

const Index = () => {
  const { convertToBrl } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [limitStats, setLimitStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Buscar sessões para BB/100 por limite
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, sites(currency)')
      .eq('status', 'completed');

    if (sessions) {
      const grouped = sessions.reduce((acc: any, s: any) => {
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

    // 2. Buscar atividades recentes
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (logs) setRecentActivities(logs);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 mt-1">Bem-vindo de volta. Aqui está seu resumo real.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={fetchData} className="bg-slate-900 border-slate-800 hover:bg-slate-800 gap-2">
                <Clock className="w-4 h-4" />
                Atualizar
              </Button>
              <Link to="/sessions">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  Nova Sessão
                </Button>
              </Link>
            </div>
          </div>

          <StatsCards />
          
          <div className="grid grid-cols-1 gap-8">
            <PerformanceChart />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">BB/100 por Limite</h3>
              <div className="space-y-4">
                {limitStats.length > 0 ? limitStats.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${item.color}`} />
                      <div>
                        <p className="font-bold text-white">{item.limit}</p>
                        <p className="text-xs text-slate-500">{formatNumber(item.totalHands)} mãos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        item.bb >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>{formatBB(item.bb)}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">BB/100 (R$)</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-500 py-10">Nenhum dado de limite disponível.</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Últimas Atividades</h3>
              <div className="space-y-4">
                {recentActivities.length > 0 ? recentActivities.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-slate-800 pb-3 last:border-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    )}>
                      {log.action[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-300">
                        <span className="font-bold text-white">{log.action}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleDateString('pt-BR')} às {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-500 py-10">Nenhuma atividade recente.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper para classes condicionais
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default Index;