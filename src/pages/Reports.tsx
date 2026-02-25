"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import DateFilter, { Period } from '@/components/dashboard/DateFilter';
import { startOfDay, startOfMonth, startOfYear, isAfter } from 'date-fns';
import { Loader2 } from 'lucide-react';

const Reports = () => {
  const { usdToBrlRate, convertToBrl } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('all');

  const fetchData = async () => {
    setLoading(true);
    
    // Buscar sites para as legendas
    const { data: sitesData } = await supabase.from('sites').select('*');
    setSites(sitesData || []);

    // Buscar sessões
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*, sites(name, currency)')
      .eq('status', 'completed')
      .order('start_time', { ascending: true });

    if (error || !sessions) {
      setLoading(false);
      return;
    }

    let filteredSessions = sessions;
    const now = new Date();

    if (period === 'day') {
      filteredSessions = sessions.filter(s => isAfter(new Date(s.start_time), startOfDay(now)));
    } else if (period === 'month') {
      filteredSessions = sessions.filter(s => isAfter(new Date(s.start_time), startOfMonth(now)));
    } else if (period === 'year') {
      filteredSessions = sessions.filter(s => isAfter(new Date(s.start_time), startOfYear(now)));
    }

    // Agrupar dados por mãos acumuladas e site
    let cumulativeHands = 0;
    const siteProfits: Record<string, number> = {};
    
    const formattedData = filteredSessions.map((s) => {
      const siteName = s.sites?.name || 'Outros';
      const currency = s.sites?.currency || 'BRL';
      const profitBrl = convertToBrl(Number(s.result || 0), currency);
      const hands = (Number(s.end_hands || 0) - Number(s.start_hands || 0));
      
      cumulativeHands += hands;
      siteProfits[siteName] = (siteProfits[siteName] || 0) + profitBrl;
      
      const dataPoint: any = {
        hands: cumulativeHands,
        total: Object.values(siteProfits).reduce((a, b) => a + b, 0)
      };

      // Adiciona o lucro de cada site no ponto atual
      Object.keys(siteProfits).forEach(name => {
        dataPoint[name] = siteProfits[name];
      });

      return dataPoint;
    });

    setChartData(formattedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [period, usdToBrlRate]);

  const colors = ['#ef4444', '#fbbf24', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Relatórios</h1>
              <p className="text-slate-400 mt-1">Análise de performance convertida para R$ (Taxa: {usdToBrlRate})</p>
            </div>
            <DateFilter period={period} onPeriodChange={setPeriod} />
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Gráfico de Evolução (Profit em R$ vs Mãos)</CardTitle>
            </CardHeader>
            <CardContent className="h-[600px] pt-4">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="hands" 
                      type="number"
                      stroke="#64748b" 
                      fontSize={12} 
                      tickFormatter={(v) => `${v/1000}k`}
                      label={{ value: 'Mãos', position: 'insideBottom', offset: -10, fill: '#64748b' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip 
                      isAnimationActive={false}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      formatter={(v: number) => [formatCurrency(v), '']}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    
                    <Line type="monotone" dataKey="total" name="Total Geral (R$)" stroke="#ffffff" strokeWidth={3} dot={false} isAnimationActive={false} />
                    
                    {sites.map((site, index) => (
                      <Line 
                        key={site.id}
                        type="monotone" 
                        dataKey={site.name} 
                        name={`${site.name} (R$)`} 
                        stroke={colors[index % colors.length]} 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Nenhum dado disponível para o período selecionado.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;