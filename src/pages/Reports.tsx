"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { endOfWeek, format, isWithinInterval, startOfWeek } from 'date-fns';
import { Loader2, Settings, Trash2, Plus } from 'lucide-react';
import { getBigBlindFromLimitName } from '@/lib/poker';
import { showSuccess, showError } from '@/utils/toast';

type ReportsMetric = 'result' | 'hands' | 'bb100' | 'hours';

const Reports = () => {
  const { usdToBrlRate, convertToBrl } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [monthKey, setMonthKey] = useState<string>('');
  const [weekIndex, setWeekIndex] = useState<string>('1');
  const [weeklyRakeInput, setWeeklyRakeInput] = useState<string>('');
  const [weeklyRakeDealPct, setWeeklyRakeDealPct] = useState<string>('0');
  const [selectedMetric, setSelectedMetric] = useState<ReportsMetric>('result');

  const [bankrollInitial, setBankrollInitial] = useState<number>(0);
  const [weeklyDepositsSum, setWeeklyDepositsSum] = useState<number>(0);
  const [weeklyExpenses, setWeeklyExpenses] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: sitesData } = await supabase.from('sites').select('*');
    setSites(sitesData || []);

    const { data: sessionsData, error } = await supabase
      .from('sessions')
      .select('*, sites(name, currency)')
      .eq('status', 'completed')
      .order('start_time', { ascending: true });

    if (error || !sessionsData) {
      setLoading(false);
      return;
    }

    setSessions(sessionsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [usdToBrlRate]);

  const monthOptions = React.useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s: any) => {
      if (!s.start_time) return;
      const d = new Date(s.start_time);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    });
    const arr = Array.from(set);
    arr.sort((a, b) => b.localeCompare(a));
    return arr;
  }, [sessions]);

  useEffect(() => {
    if (!monthKey && monthOptions.length > 0) {
      setMonthKey(monthOptions[0]);
      setWeekIndex('1');
      return;
    }

    if (monthKey && monthOptions.length > 0 && !monthOptions.includes(monthKey)) {
      setMonthKey(monthOptions[0]);
      setWeekIndex('1');
    }
  }, [monthKey, monthOptions]);

  const selectedMonthDate = React.useMemo(() => {
    const m = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    return new Date(year, month, 1);
  }, [monthKey]);

  const weekOptions = React.useMemo(() => {
    if (!selectedMonthDate) return [];
    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();

    const weeks = new Map<string, { start: Date; end: Date }>();
    for (const s of sessions) {
      if (!s.start_time) continue;
      const d = new Date(s.start_time);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      
      // Filtra pelo mês onde a semana COMEÇA
      if (start.getFullYear() !== year || start.getMonth() !== month) continue;
      
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const key = `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`;
      if (!weeks.has(key)) weeks.set(key, { start, end });
    }

    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const ordered = Array.from(weeks.entries())
      .map(([key, w]) => ({ key, ...w }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return ordered.map((w, idx) => ({
      index: idx + 1,
      start: w.start,
      end: w.end,
      label: `Semana ${String(idx + 1).padStart(2, '0')} (${fmt(w.start)} → ${fmt(w.end)})`,
    }));
  }, [selectedMonthDate, sessions]);

  useEffect(() => {
    if (weekOptions.length === 0) return;
    const idx = Number(weekIndex);
    if (!idx || idx < 1 || idx > weekOptions.length) {
      setWeekIndex('1');
    }
  }, [weekIndex, weekOptions]);

  const selectedWeek = React.useMemo(() => {
    const idx = Number(weekIndex);
    return weekOptions.find(w => w.index === idx) || null;
  }, [weekIndex, weekOptions]);

  const selectedWeekDateRange = React.useMemo(() => {
    if (!selectedWeek) return null;
    return {
      week_start: format(selectedWeek.start, 'yyyy-MM-dd'),
      week_end: format(selectedWeek.end, 'yyyy-MM-dd'),
    };
  }, [selectedWeek]);

  const weeklyKey = React.useMemo(() => {
    if (!selectedWeek) return '';
    return `${format(selectedWeek.start, 'yyyy-MM-dd')}_${format(selectedWeek.end, 'yyyy-MM-dd')}`;
  }, [selectedWeek]);

  const filteredSessions = React.useMemo(() => {
    if (!selectedWeek) return [];
    return sessions.filter((s: any) => {
      if (!s.start_time) return false;
      const date = new Date(s.start_time);
      return isWithinInterval(date, { start: selectedWeek.start, end: selectedWeek.end });
    });
  }, [sessions, selectedWeek]);

  const parseCurrencyBR = (raw: string) => {
    if (!raw) return 0;
    const cleaned = raw.replace(/\s/g, '').replace(/[Rr]\$?/g, '');
    const parts = cleaned.split(',');
    if (parts.length > 1) {
      const integer = parts[0].replace(/\./g, '');
      const decimal = parts[1].slice(0, 2);
      return Number(`${integer}.${decimal}`);
    }
    const dotParts = cleaned.split('.');
    if (dotParts.length > 1) {
      const integer = dotParts.slice(0, -1).join('').replace(/\D/g, '');
      const decimal = dotParts[dotParts.length - 1].slice(0, 2);
      return Number(`${integer}.${decimal}`);
    }
    return Number(cleaned.replace(/\D/g, '')) || 0;
  };

  const getSessionGroupKey = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    start.setMilliseconds(0);
    const end = new Date(endIso);
    end.setMilliseconds(0);
    return `${start.toISOString()}|${end.toISOString()}`;
  };

  const weeklyStats = React.useMemo(() => {
    let totalHands = 0;
    let totalResultBrl = 0;
    let computedRakeBrl = 0;
    const sessionDurations = new Map<string, { start: number; end: number }>();
    const uniqueSessions = new Set<string>();

    for (const s of filteredSessions) {
      const hands = (Number(s.end_hands || 0) - Number(s.start_hands || 0));
      totalHands += hands;

      const currency = s.sites?.currency || 'BRL';
      totalResultBrl += convertToBrl(Number(s.result || 0), currency);
      computedRakeBrl += convertToBrl(Number(s.rake || 0), currency);

      if (s.start_time && s.end_time) {
        const key = getSessionGroupKey(s.start_time, s.end_time);
        uniqueSessions.add(key);
        const start = new Date(s.start_time);
        start.setMilliseconds(0);
        const end = new Date(s.end_time);
        end.setMilliseconds(0);
        const prev = sessionDurations.get(key);
        const startMs = start.getTime();
        const endMs = end.getTime();
        if (!prev) {
          sessionDurations.set(key, { start: startMs, end: endMs });
        } else {
          sessionDurations.set(key, { start: Math.min(prev.start, startMs), end: Math.max(prev.end, endMs) });
        }
      }
    }

    let totalMinutes = 0;
    sessionDurations.forEach(({ start, end }) => {
      totalMinutes += Math.max(0, (end - start) / (1000 * 60));
    });

    const totalHours = totalMinutes / 60;

    let maxBbBrl = 0;
    let referenceLimitName = '';
    for (const s of filteredSessions) {
      const bb = getBigBlindFromLimitName(s.limit_name);
      if (!bb) continue;
      const currency = s.sites?.currency || 'BRL';
      const bbBrl = convertToBrl(bb, currency);
      if (bbBrl > maxBbBrl) {
        maxBbBrl = bbBrl;
        referenceLimitName = s.limit_name || '';
      }
    }

    return {
      totalHands,
      totalResultBrl,
      computedRakeBrl,
      uniqueSessionsCount: uniqueSessions.size,
      totalMinutes,
      totalHours,
      referenceLimitName,
      maxBbBrl,
    };
  }, [filteredSessions, convertToBrl]);

  useEffect(() => {
    if (!weeklyKey) return;
    
    // Reset inputs immediately when switching weeks to avoid showing/saving stale data
    setWeeklyRakeInput('');
    setWeeklyRakeDealPct('0');
    setBankrollInitial(0);
    setIsInitialLoad(true);

    const loadWeeklyRake = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedWeekDateRange) return;

      const [rakeRes, transRes, expenseRes] = await Promise.all([
        supabase
          .from('weekly_rake')
          .select('rake_total_brl, rake_deal_pct, bankroll_initial')
          .eq('user_id', user.id)
          .eq('week_start', selectedWeekDateRange.week_start)
          .eq('week_end', selectedWeekDateRange.week_end)
          .maybeSingle(),
        supabase
          .from('finance_transactions')
          .select('amount_brl')
          .eq('user_id', user.id)
          .eq('type', 'deposit')
          .eq('week_start', selectedWeekDateRange.week_start)
          .eq('week_end', selectedWeekDateRange.week_end),
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .eq('week_start', selectedWeekDateRange.week_start)
          .eq('week_end', selectedWeekDateRange.week_end)
      ]);

      if (rakeRes.error) {
        console.error("Erro ao carregar dados da semana:", rakeRes.error);
      }

      const depositsTotal = transRes.data?.reduce((acc, t) => acc + Number(t.amount_brl || 0), 0) || 0;
      setWeeklyDepositsSum(depositsTotal);
      setWeeklyExpenses(expenseRes.data || []);

      if (rakeRes.data) {
        setWeeklyRakeInput(rakeRes.data.rake_total_brl ? formatNumber(rakeRes.data.rake_total_brl, 2) : '');
        setWeeklyRakeDealPct(String(rakeRes.data.rake_deal_pct ?? 0));
        setBankrollInitial(rakeRes.data.bankroll_initial || 0);
      } else {
        const savedRake = localStorage.getItem(`weekly_rake_${weeklyKey}`);
        const savedPct = localStorage.getItem(`weekly_rake_deal_pct_${weeklyKey}`);
        setWeeklyRakeInput(savedRake ?? '');
        setWeeklyRakeDealPct(savedPct ?? '0');
        setBankrollInitial(0);
      }
      
      // Mark initial load as complete AFTER states are set
      setTimeout(() => setIsInitialLoad(false), 100);
    };

    loadWeeklyRake();
  }, [weeklyKey, selectedWeekDateRange]);

  // Removed problematic localStorage sync effects that were causing race conditions between weeks

  const weeklyRakeTotalBrl = React.useMemo(() => {
    const manual = parseCurrencyBR(weeklyRakeInput);
    if (weeklyRakeInput.trim().length > 0) return manual;
    return weeklyStats.computedRakeBrl;
  }, [weeklyRakeInput, weeklyStats.computedRakeBrl]);

  const weeklyRakeDealBrl = React.useMemo(() => {
    const pct = Number(weeklyRakeDealPct || 0);
    return (weeklyRakeTotalBrl * pct) / 100;
  }, [weeklyRakeTotalBrl, weeklyRakeDealPct]);

  useEffect(() => {
    if (!weeklyKey || !selectedWeekDateRange || isInitialLoad) return;

    const handle = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rakeTotal = parseCurrencyBR(weeklyRakeInput);
      const pct = Math.min(100, Math.max(0, Number(weeklyRakeDealPct || 0)));

      // Só salva se houver valor ou se o banco já tiver algo
      // Adicionada verificação extra para garantir que não salvamos dados da semana errada
      if (rakeTotal === 0 && pct === 0) return;

      await supabase
        .from('weekly_rake')
        .upsert({
          user_id: user.id,
          week_start: selectedWeekDateRange.week_start,
          week_end: selectedWeekDateRange.week_end,
          rake_total_brl: rakeTotal,
          rake_deal_pct: Math.round(pct),
        }, { onConflict: 'user_id,week_start,week_end' });
      
      // Sincroniza com localStorage apenas após salvar com sucesso no Supabase
      localStorage.setItem(`weekly_rake_${weeklyKey}`, weeklyRakeInput);
      localStorage.setItem(`weekly_rake_deal_pct_${weeklyKey}`, weeklyRakeDealPct);
    }, 1000);

    return () => clearTimeout(handle);
  }, [weeklyKey, selectedWeekDateRange, weeklyRakeInput, weeklyRakeDealPct, isInitialLoad]);

  const handleAddExpense = async () => {
    if (!newExpense.amount || !selectedWeekDateRange) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsAddingExpense(true);
    const amount = parseCurrencyBR(newExpense.amount);
    
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert({
        user_id: user.id,
        type: 'expense',
        amount_brl: amount,
        description: newExpense.description,
        week_start: selectedWeekDateRange.week_start,
        week_end: selectedWeekDateRange.week_end,
        transaction_date: new Date().toISOString()
      })
      .select()
      .single();

    if (!error && data) {
      setWeeklyExpenses([...weeklyExpenses, data]);
      setNewExpense({ amount: '', description: '' });
      showSuccess("Despesa adicionada!");
    } else {
      console.error("Erro ao adicionar despesa:", error);
      showError("Erro ao salvar despesa no banco de dados.");
    }
    setIsAddingExpense(false);
  };

  const handleRemoveExpense = async (id: string) => {
    const { error } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('id', id);

    if (!error) {
      setWeeklyExpenses(weeklyExpenses.filter(e => e.id !== id));
      showSuccess("Despesa removida.");
    } else {
      showError("Erro ao remover despesa.");
    }
  };

  const totalExpensesBrl = React.useMemo(() => {
    return weeklyExpenses.reduce((acc, e) => acc + Number(e.amount_brl || 0), 0);
  }, [weeklyExpenses]);

  const netResultWithoutRB = React.useMemo(() => {
    return weeklyStats.totalResultBrl - totalExpensesBrl;
  }, [weeklyStats.totalResultBrl, totalExpensesBrl]);

  const weeklyTotalWithRakeDealBrl = React.useMemo(() => {
    return (weeklyStats.totalResultBrl + weeklyRakeDealBrl) - totalExpensesBrl;
  }, [weeklyStats.totalResultBrl, weeklyRakeDealBrl, totalExpensesBrl]);

  const weeklyBuyinBrl = React.useMemo(() => {
    if (!weeklyStats.maxBbBrl) return 0;
    return weeklyStats.maxBbBrl * 100;
  }, [weeklyStats.maxBbBrl]);

  const weeklyResultBuyins = React.useMemo(() => {
    if (!weeklyBuyinBrl) return 0;
    return weeklyTotalWithRakeDealBrl / weeklyBuyinBrl;
  }, [weeklyTotalWithRakeDealBrl, weeklyBuyinBrl]);

  useEffect(() => {
    if (!weeklyKey || isInitialLoad) return;
    localStorage.setItem(`weekly_rake_total_value_${weeklyKey}`, String(weeklyRakeTotalBrl));
    localStorage.setItem(`weekly_rake_deal_value_${weeklyKey}`, String(weeklyRakeDealBrl));
  }, [weeklyKey, weeklyRakeTotalBrl, weeklyRakeDealBrl, isInitialLoad]);

  const safeDiv = (a: number, b: number) => {
    if (!b || !Number.isFinite(b)) return 0;
    return a / b;
  };

  useEffect(() => {
    if (!selectedWeek) {
      setChartData([]);
      return;
    }

    const start = new Date(selectedWeek.start);
    start.setHours(0, 0, 0, 0);
    const days: { key: string; date: string; profitBrl: number; hands: number; profitBb: number; minutes: number; bb100: number; hours: number }[] = [];
    const map = new Map<string, { profitBrl: number; hands: number; profitBb: number; minutes: number }>();
    const seenDurationKeys = new Set<string>();

    const round2 = (n: number) => Math.round(n * 100) / 100;

    for (const s of filteredSessions) {
      if (!s.start_time) continue;
      const d = new Date(s.start_time);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const currency = s.sites?.currency || 'BRL';
      const profitBrl = convertToBrl(Number(s.result || 0), currency);
      const hands = (Number(s.end_hands || 0) - Number(s.start_hands || 0));
      
      let profitBb = 0;
      const bb = getBigBlindFromLimitName(s.limit_name);
      if (bb) {
        const bbValueBrl = convertToBrl(bb, currency);
        if (bbValueBrl > 0) profitBb = profitBrl / bbValueBrl;
      }

      let minutes = 0;
      if (s.start_time && s.end_time) {
        const durKey = getSessionGroupKey(s.start_time, s.end_time);
        if (!seenDurationKeys.has(durKey)) {
          seenDurationKeys.add(durKey);
          const sMs = new Date(s.start_time).getTime();
          const eMs = new Date(s.end_time).getTime();
          minutes = Math.max(0, (eMs - sMs) / (1000 * 60));
        }
      }

      const prev = map.get(dayKey) || { profitBrl: 0, hands: 0, profitBb: 0, minutes: 0 };
      map.set(dayKey, { 
        profitBrl: round2(prev.profitBrl + profitBrl), 
        hands: prev.hands + hands,
        profitBb: prev.profitBb + profitBb,
        minutes: prev.minutes + minutes
      });
    }

    let cumulativeProfitBrl = 0;
    let cumulativeHands = 0;
    let cumulativeProfitBb = 0;
    let cumulativeMinutes = 0;

    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const agg = map.get(dayKey) || { profitBrl: 0, hands: 0, profitBb: 0, minutes: 0 };
      
      cumulativeProfitBrl = round2(cumulativeProfitBrl + agg.profitBrl);
      cumulativeHands += agg.hands;
      cumulativeProfitBb += agg.profitBb;
      cumulativeMinutes += agg.minutes;

      const bb100 = cumulativeHands > 0 ? (cumulativeProfitBb / cumulativeHands) * 100 : 0;
      const hours = cumulativeMinutes / 60;

      days.push({ 
        key: dayKey, 
        date: label, 
        profitBrl: cumulativeProfitBrl, 
        hands: cumulativeHands,
        profitBb: cumulativeProfitBb,
        bb100,
        minutes: cumulativeMinutes,
        hours
      });
    }

    setChartData(days);
  }, [filteredSessions, selectedWeek, convertToBrl]);

  const effectiveBankrollInitial = React.useMemo(() => {
    return bankrollInitial + weeklyDepositsSum;
  }, [bankrollInitial, weeklyDepositsSum]);

  const bankrollFinal = React.useMemo(() => {
    // Bankroll final não subtrai despesas, apenas lucro das sessões + rake deal
    return effectiveBankrollInitial + (weeklyStats.totalResultBrl + weeklyRakeDealBrl);
  }, [effectiveBankrollInitial, weeklyStats.totalResultBrl, weeklyRakeDealBrl]);

  useEffect(() => {
    if (!selectedWeekDateRange) return;
    const saveBankrollFinal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('weekly_rake').upsert({
        user_id: user.id,
        week_start: selectedWeekDateRange.week_start,
        week_end: selectedWeekDateRange.week_end,
        bankroll_final: bankrollFinal
      }, { onConflict: 'user_id,week_start,week_end' });
    };
    saveBankrollFinal();
  }, [bankrollFinal, selectedWeekDateRange]);

  const colors = ['#10b981', '#3b82f6'];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Fechamentos</h1>
              <p className="text-muted-foreground mt-1">Análise de performance convertida para R$ (Taxa: {usdToBrlRate})</p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={monthKey} onValueChange={(v) => { setMonthKey(v); setWeekIndex('1'); }}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((k) => {
                      const m = k.match(/^(\d{4})-(\d{2})$/);
                      const label = m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : k;
                      return <SelectItem key={k} value={k}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semana</Label>
                <Select value={weekIndex} onValueChange={setWeekIndex} disabled={weekOptions.length === 0}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Selecione a semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map(w => (
                      <SelectItem key={w.index} value={String(w.index)}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Bankroll Inicial</p>
                <p className="text-lg font-bold text-blue-500">{formatCurrency(effectiveBankrollInitial)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Bankroll Final</p>
                <p className={`text-lg font-bold ${bankrollFinal >= effectiveBankrollInitial ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(bankrollFinal)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Resultado Líquido (+RB)</p>
                <p className={`text-lg font-bold ${weeklyTotalWithRakeDealBrl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(weeklyTotalWithRakeDealBrl)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Mãos / Horas</p>
                <p className="text-lg font-bold text-foreground">
                  {formatNumber(weeklyStats.totalHands)} / {String(Math.floor(weeklyStats.totalMinutes / 60)).padStart(2, '0')}:{String(Math.floor(weeklyStats.totalMinutes % 60)).padStart(2, '0')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-card border-border lg:col-span-2 order-2 lg:order-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-foreground">
                  {selectedMetric === 'result' ? 'Resultado (R$)' : 
                   selectedMetric === 'hands' ? 'Mãos' : 
                   selectedMetric === 'bb100' ? 'BB/100' : 
                   'Horas'} por Dia
                </CardTitle>
                <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as ReportsMetric)}>
                  <SelectTrigger className="w-[40px] h-[40px] p-0 border-none bg-transparent hover:bg-muted/50 focus:ring-0">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="result">Resultado</SelectItem>
                    <SelectItem value="hands">Mãos</SelectItem>
                    <SelectItem value="bb100">BB/100</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-[360px] pt-4">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="currentColor" 
                        className="text-muted-foreground"
                        fontSize={12} 
                      />
                      <YAxis 
                        stroke="currentColor" 
                        className="text-muted-foreground"
                        fontSize={12} 
                        tickFormatter={(v) => {
                          if (selectedMetric === 'result') return `R$ ${formatNumber(Number(v), 2)}`;
                          if (selectedMetric === 'hands') return formatNumber(Number(v));
                          if (selectedMetric === 'bb100') return formatNumber(Number(v), 2);
                          if (selectedMetric === 'hours') return `${Number(v).toFixed(1)}h`;
                          return String(v);
                        }}
                      />
                      <Tooltip 
                        isAnimationActive={false}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'currentColor' }}
                        formatter={(v: number) => {
                          if (selectedMetric === 'result') return [`R$ ${formatNumber(Number(v), 2)}`, 'Resultado (R$)'];
                          if (selectedMetric === 'hands') return [formatNumber(v), 'Mãos'];
                          if (selectedMetric === 'bb100') return [formatNumber(v, 2), 'BB/100'];
                          if (selectedMetric === 'hours') {
                            const hh = Math.floor(v);
                            const mm = Math.round((v - hh) * 60);
                            return [`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 'Horas'];
                          }
                          return [v, ''];
                        }}
                      />
                      <Legend verticalAlign="top" height={28}/>
                      <Line 
                        type="monotone" 
                        dataKey={selectedMetric === 'result' ? 'profitBrl' : 
                                 selectedMetric === 'hands' ? 'hands' : 
                                 selectedMetric === 'bb100' ? 'bb100' : 
                                 'hours'} 
                        name={selectedMetric === 'result' ? 'Resultado (R$)' : 
                              selectedMetric === 'hands' ? 'Mãos' : 
                              selectedMetric === 'bb100' ? 'BB/100' : 
                              'Horas'} 
                        stroke={colors[0]} 
                        strokeWidth={3} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível para o período selecionado.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border lg:col-span-1 order-1 lg:order-2">
              <CardHeader>
                <CardTitle className="text-foreground">Resumo da Semana</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Resultado (Buy-ins)</div>
                    <div className="text-lg font-bold text-foreground">{formatNumber(weeklyResultBuyins, 2)}</div>
                    {weeklyStats.referenceLimitName ? (
                      <div className="text-[10px] text-muted-foreground">Ref: {weeklyStats.referenceLimitName}</div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Buy-in (BRL)</div>
                    <div className="text-lg font-bold text-foreground">{weeklyBuyinBrl ? formatCurrency(weeklyBuyinBrl) : '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Mãos/hora</div>
                    <div className="text-sm font-bold text-foreground">{formatNumber(Math.round(safeDiv(weeklyStats.totalHands, weeklyStats.totalHours)))}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Ganho/hora (BRL)</div>
                    <div className="text-sm font-bold text-foreground">{formatCurrency(safeDiv(weeklyTotalWithRakeDealBrl, weeklyStats.totalHours))}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Ganho/mão (BRL)</div>
                    <div className="text-sm font-bold text-foreground">{formatCurrency(safeDiv(weeklyTotalWithRakeDealBrl, weeklyStats.totalHands))}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Resultado S/ RB</div>
                    <div className="text-sm font-bold text-foreground">{formatCurrency(netResultWithoutRB)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Total + Rake Deal</div>
                    <div className="text-sm font-bold text-foreground">{formatCurrency(weeklyTotalWithRakeDealBrl)}</div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Rake total (R$)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-8 text-xs"
                        placeholder={formatCurrency(weeklyStats.computedRakeBrl)}
                        value={weeklyRakeInput}
                        onChange={(e) => setWeeklyRakeInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">% Rake Deal</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-8 text-xs"
                        placeholder="0 a 100"
                        value={weeklyRakeDealPct}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const n = digits.length === 0 ? 0 : Math.min(100, Number(digits));
                          setWeeklyRakeDealPct(digits.length === 0 ? '' : String(n));
                        }}
                        onBlur={() => {
                          const n = Math.min(100, Math.max(0, Number(weeklyRakeDealPct || 0)));
                          setWeeklyRakeDealPct(String(n));
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Rake total (BRL)</div>
                      <div className="text-xs font-bold text-foreground">{formatCurrency(weeklyRakeTotalBrl)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Rake deal (BRL)</div>
                      <div className="text-xs font-bold text-foreground">{formatCurrency(weeklyRakeDealBrl)}</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase">Despesas adicionais</Label>
                      {totalExpensesBrl > 0 && (
                        <span className="text-[10px] font-bold text-rose-500">-{formatCurrency(totalExpensesBrl)}</span>
                      )}
                    </div>
                    
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                      {weeklyExpenses.map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between text-[11px] bg-muted/30 p-2 rounded">
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="font-medium truncate">{exp.description || 'Sem descrição'}</p>
                            <p className="text-rose-500 font-bold">{formatCurrency(exp.amount_brl)}</p>
                          </div>
                          <button 
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="text-muted-foreground hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {weeklyExpenses.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic text-center py-2">Nenhuma despesa</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="Descrição"
                          className="h-7 text-[10px]"
                          value={newExpense.description}
                          onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <Input
                          placeholder="Valor"
                          className="h-7 text-[10px]"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        />
                      </div>
                      <button 
                        onClick={handleAddExpense}
                        disabled={isAddingExpense || !newExpense.amount}
                        className="h-7 w-7 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 rounded text-white disabled:opacity-50 transition-colors"
                      >
                        {isAddingExpense ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;