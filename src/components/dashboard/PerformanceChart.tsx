"use client";

import React, { useEffect, useState } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import DateFilter, { Period } from './DateFilter';
import { startOfDay, startOfMonth, startOfYear, isAfter } from 'date-fns';

const PerformanceChart = () => {
  const { convertToBrl } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('all');

  const fetchChartData = async () => {
    setLoading(true);
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        result,
        start_time,
        sites (currency)
      `)
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

    let cumulativeProfit = 0;
    const formattedData = filteredSessions.map((s: any) => {
      // Supabase joins can return an object or an array of one object
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const profitBrl = convertToBrl(Number(s.result || 0), currency);
      cumulativeProfit += profitBrl;
      
      return {
        name: new Date(s.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: cumulativeProfit
      };
    });

    setChartData(formattedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchChartData();
  }, [period, convertToBrl]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 h-[480px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Performance Cumulativa</h2>
          <p className="text-sm text-muted-foreground">Evolução do lucro total em Reais</p>
        </div>
        
        <div className="flex items-center gap-3">
          <DateFilter period={period} onPeriodChange={setPeriod} />
          <Button variant="outline" size="icon" onClick={fetchChartData}>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="h-[400px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="currentColor" 
                className="text-muted-foreground"
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="currentColor" 
                className="text-muted-foreground"
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip 
                isAnimationActive={false}
                cursor={{ stroke: 'currentColor', strokeWidth: 1, className: 'text-border' }}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: '#10b981' }}
                formatter={(value: number) => [formatCurrency(value), 'Resultado (R$)']}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Nenhuma sessão encontrada para este período.
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceChart;