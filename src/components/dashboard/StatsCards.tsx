"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, MousePointer2, Target, DollarSign, Percent, Loader2 } from 'lucide-react';
import { formatCurrency, formatNumber, formatBB } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const StatsCards = () => {
  const { convertToBrl } = useCurrency();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', 'completed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('result, rake, start_hands, end_hands, start_time, end_time, sites(currency)')
        .eq('status', 'completed');
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const stats = React.useMemo(() => {
    let totalResultBrl = 0;
    let totalRakeBrl = 0;
    let totalHands = 0;
    let totalMinutes = 0;

    sessions.forEach((s: any) => {
      const currency = s.sites?.currency || 'BRL';
      totalResultBrl += convertToBrl(Number(s.result || 0), currency);
      totalRakeBrl += convertToBrl(Number(s.rake || 0), currency);
      totalHands += (Number(s.end_hands || 0) - Number(s.start_hands || 0));
      
      if (s.start_time && s.end_time) {
        const start = new Date(s.start_time).getTime();
        const end = new Date(s.end_time).getTime();
        totalMinutes += (end - start) / (1000 * 60);
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const bb100 = totalHands > 0 ? (totalResultBrl / totalHands) * 100 : 0;

    return [
      { label: 'Resultado Total', value: formatCurrency(totalResultBrl), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'BB/100 Geral', value: formatBB(bb100), icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Total de Mãos', value: formatNumber(totalHands), icon: MousePointer2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { label: 'Horas Jogadas', value: `${hours}h`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'Rake Total', value: formatCurrency(totalRakeBrl), icon: Percent, color: 'text-rose-500', bg: 'bg-rose-500/10' },
      { label: 'Sessões', value: sessions.length.toString(), icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    ];
  }, [sessions, convertToBrl]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-card border-border animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
              <h3 className="text-xl font-bold text-foreground mt-1">{stat.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;