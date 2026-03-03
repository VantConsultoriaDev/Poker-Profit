"use client";

import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { formatBB, formatCurrency, formatNumber } from '@/lib/format';
import { format, endOfWeek, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBigBlindFromLimitName } from '@/lib/poker';

type SessionSite = { currency?: string } | { currency?: string }[];
type DashboardSession = {
  id?: string;
  result?: number | null;
  rake?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  start_hands?: number | null;
  end_hands?: number | null;
  limit_name?: string | null;
  sites?: SessionSite | null;
};

type ChartMetric = 'result' | 'bb100' | 'hours' | 'rake_total' | 'rake_deal';

const PerformanceChart = ({ sessions = [], isLoading }: { sessions: DashboardSession[]; isLoading?: boolean }) => {
  const { convertToBrl } = useCurrency();

  const [metric, setMetric] = React.useState<ChartMetric>('result');

  const { data: weeklyRakes = [] } = useQuery({
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
    staleTime: 60000,
  });

  const getWeekKeyForDate = (d: Date) => {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`;
  };

  const getWeekData = (weekKey: string) => {
    const dbEntry = weeklyRakes.find(r => `${r.week_start}_${r.week_end}` === weekKey);
    if (dbEntry) {
      const rakeTotal = Number(dbEntry.rake_total_brl || 0);
      const rakeDeal = (rakeTotal * Number(dbEntry.rake_deal_pct || 0)) / 100;
      return { rakeTotal, rakeDeal };
    }
    const totalStr = localStorage.getItem(`weekly_rake_total_value_${weekKey}`);
    const dealStr = localStorage.getItem(`weekly_rake_deal_value_${weekKey}`);
    return { 
      rakeTotal: totalStr ? Number(totalStr) : 0, 
      rakeDeal: dealStr ? Number(dealStr) : 0 
    };
  };

  const chartData = React.useMemo(() => {
    const safeSessions = sessions
      .filter((s): s is Required<Pick<DashboardSession, 'start_time'>> & DashboardSession => !!s.start_time)
      .slice()
      .sort((a, b) => new Date(a.start_time as string).getTime() - new Date(b.start_time as string).getTime());

    if (safeSessions.length === 0) return [];

    const dayMap = new Map<string, {
      label: string;
      profitBrl: number;
      hands: number;
      profitBb: number;
      handsBb: number;
      minutesUnique: number;
      weeks: Set<string>;
    }>();

    const weekMaxBbBrl = new Map<string, number>();

    const seenDurationKeys = new Set<string>();
    const getDayKey = (iso: string) => {
      const d = new Date(iso);
      return `${format(d, 'yyyy-MM-dd')}`;
    };
    const getDayLabel = (iso: string) => {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };
    const getDurationKey = (startIso: string, endIso: string) => {
      const start = new Date(startIso);
      start.setMilliseconds(0);
      const end = new Date(endIso);
      end.setMilliseconds(0);
      return `${start.toISOString()}|${end.toISOString()}`;
    };

    for (const s of safeSessions) {
      const d = new Date(s.start_time as string);
      const dayKey = getDayKey(s.start_time as string);
      const dayLabel = getDayLabel(s.start_time as string);
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { label: dayLabel, profitBrl: 0, hands: 0, profitBb: 0, handsBb: 0, minutesUnique: 0, weeks: new Set() });
      }
      const agg = dayMap.get(dayKey)!;
      const weekKey = getWeekKeyForDate(d);
      agg.weeks.add(weekKey);

      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';

      const resultBrl = convertToBrl(Number(s.result || 0), currency);
      agg.profitBrl += resultBrl;

      const hands = (Number(s.end_hands || 0) - Number(s.start_hands || 0));
      agg.hands += hands;

      const bb = getBigBlindFromLimitName(s.limit_name);
      if (bb) {
        const bbValueBrl = convertToBrl(bb, currency);
        if (bbValueBrl > 0) {
          agg.profitBb += resultBrl / bbValueBrl;
          agg.handsBb += hands;

          const currentMax = weekMaxBbBrl.get(weekKey) || 0;
          if (bbValueBrl > currentMax) weekMaxBbBrl.set(weekKey, bbValueBrl);
        }
      }

      if (s.start_time && s.end_time) {
        const durKey = getDurationKey(s.start_time, s.end_time);
        if (!seenDurationKeys.has(durKey)) {
          seenDurationKeys.add(durKey);
          const startMs = new Date(s.start_time).getTime();
          const endMs = new Date(s.end_time).getTime();
          const minutes = Math.max(0, (endMs - startMs) / (1000 * 60));
          agg.minutesUnique += minutes;
        }
      }
    }

    const orderedDays = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let cumProfitBrl = 0;
    let cumHands = 0;
    let cumProfitBb = 0;
    let cumHandsBb = 0;
    let cumMinutes = 0;
    
    // Para rake, precisamos rastrear quais semanas já foram contadas para não duplicar
    const processedWeeks = new Set<string>();
    let cumRakeTotal = 0;
    let cumRakeDeal = 0;
    let cumRbProfitBb = 0;

    const result = orderedDays.map(([dayKey, agg]) => {
      cumProfitBrl += agg.profitBrl;
      cumHands += agg.hands;
      cumProfitBb += agg.profitBb;
      cumHandsBb += agg.handsBb;
      cumMinutes += agg.minutesUnique;

      // Adiciona rake das novas semanas encontradas neste dia
      agg.weeks.forEach(wKey => {
        if (!processedWeeks.has(wKey)) {
          processedWeeks.add(wKey);
          const { rakeTotal, rakeDeal } = getWeekData(wKey);
          cumRakeTotal += rakeTotal;
          cumRakeDeal += rakeDeal;

          const maxBb = weekMaxBbBrl.get(wKey);
          if (maxBb && maxBb > 0) {
            cumRbProfitBb += rakeDeal / maxBb;
          }
        }
      });

      const bb100 = cumHandsBb > 0 ? ((cumProfitBb + cumRbProfitBb) / cumHandsBb) * 100 : 0;
      const hours = cumMinutes / 60;

      const value = metric === 'result'
        ? cumProfitBrl + cumRakeDeal
        : metric === 'bb100'
          ? bb100
          : metric === 'hours'
            ? hours
            : metric === 'rake_total'
              ? cumRakeTotal
              : cumRakeDeal;

      return {
        key: dayKey,
        name: agg.label,
        value,
      };
    });

    // Adicionar ponto inicial em 0
    if (result.length > 0) {
      const firstDate = new Date(orderedDays[0][0]);
      firstDate.setDate(firstDate.getDate() - 1);
      result.unshift({
        key: 'start',
        name: firstDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: 0
      });
    }

    return result;
  }, [sessions, convertToBrl, metric, weeklyRakes]);

  const header = React.useMemo(() => {
    if (metric === 'bb100') return { title: 'BB/100', subtitle: 'Evolução do BB/100 no período filtrado' };
    if (metric === 'hours') return { title: 'Horas Jogadas', subtitle: 'Evolução das horas jogadas no período filtrado' };
    if (metric === 'rake_total') return { title: 'Rake Total', subtitle: 'Evolução do rake total gerado (Relatórios)' };
    if (metric === 'rake_deal') return { title: 'Rake Deal', subtitle: 'Evolução do rake deal gerado (Relatórios)' };
    return { title: 'Resultado (+RB)', subtitle: 'Evolução do resultado total (Sessões + Rake Deal) no período filtrado' };
  }, [metric]);

  const valueFormatter = React.useCallback((v: number) => {
    if (metric === 'bb100') return formatBB(v);
    if (metric === 'hours') {
      const totalMinutes = Math.round(v * 60);
      const hh = Math.floor(totalMinutes / 60);
      const mm = totalMinutes % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    return formatCurrency(v);
  }, [metric]);

  const yTickFormatter = React.useCallback((v: number) => {
    if (metric === 'bb100') return formatBB(v);
    if (metric === 'hours') return `${v.toFixed(1)}h`;
    return `R$${v}`;
  }, [metric]);

  if (isLoading) {
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
          <h2 className="text-lg font-bold text-foreground">{header.title}</h2>
          <p className="text-sm text-muted-foreground">{header.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={metric} onValueChange={(v) => setMetric(v as ChartMetric)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="result">Resultado (+RB)</SelectItem>
              <SelectItem value="bb100">BB/100</SelectItem>
              <SelectItem value="hours">Horas jogadas</SelectItem>
              <SelectItem value="rake_total">Rake Total</SelectItem>
              <SelectItem value="rake_deal">Rake Deal</SelectItem>
            </SelectContent>
          </Select>
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
                tickFormatter={yTickFormatter}
              />
              <Tooltip 
                isAnimationActive={false}
                cursor={{ stroke: 'currentColor', strokeWidth: 1, className: 'text-border' }}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: '#10b981' }}
                formatter={(value: number) => [valueFormatter(value), header.title]}
                labelFormatter={(label) => `Data: ${label}`}
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