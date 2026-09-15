"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus,
  Loader2,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatNumber, parseCurrencyBR } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';

type AnticipationMetadata = {
  type: 'anticipation';
  anticipated_at: string;
  bankroll_initial_part1: number;
  bankroll_final_part1: number;
  new_bankroll_initial: number;
};

const parseAnticipation = (tx: any): AnticipationMetadata | null => {
  if (!tx?.description || !tx.description.startsWith('FECHAMENTO ANTECIPADO')) return null;
  const parts = tx.description.split('|');
  if (parts.length > 1) {
    try {
      return JSON.parse(parts[1]);
    } catch {
      return null;
    }
  }
  return null;
};

type WeekOptionKind = 'regular' | 'anticipated' | 'current';

type WeekOption = {
  key: string;
  weekNumber: number;
  start: Date;
  end: Date;
  label: string;
  kind: WeekOptionKind;
  anticipatedAt?: string;
  anticipationData?: AnticipationMetadata | null;
};

const Financeiro = () => {
  const { convertToBrl } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [monthKey, setMonthKey] = useState<string>('');
  const [weekIndex, setWeekIndex] = useState<string>('');
  const [withdrawTransactions, setWithdrawTransactions] = useState<any[]>([]);
  const [extraWeeks, setExtraWeeks] = useState<any[]>([]);

  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    account_id: '',
    type: 'deposit' as 'deposit' | 'withdraw',
    description: '',
    transactionDate: '',
    transactionTime: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [sessionsRes, accountsRes, rakeRes, withdrawRes] = await Promise.all([
      supabase.from('sessions').select('*, sites(name, currency)').eq('status', 'completed').order('start_time', { ascending: true }),
      supabase.from('site_accounts').select('*, sites(name)'),
      supabase.from('weekly_rake').select('week_start, week_end').eq('user_id', user.id),
      supabase.from('finance_transactions').select('*').eq('user_id', user.id).eq('type', 'withdraw')
    ]);

    setSessions(sessionsRes.data || []);
    setAccounts(accountsRes.data || []);
    if (rakeRes.data) {
      setExtraWeeks(rakeRes.data);
    }
    setWithdrawTransactions(withdrawRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const monthOptions = React.useMemo(() => {
    const set = new Set<string>();
    
    sessions.forEach((s: any) => {
      if (!s.start_time) return;
      const d = new Date(s.start_time);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    });

    extraWeeks.forEach((w: any) => {
      const [year, month] = w.week_start.split('-').map(Number);
      const key = `${year}-${String(month).padStart(2, '0')}`;
      set.add(key);
    });

    const arr = Array.from(set);
    arr.sort((a, b) => b.localeCompare(a));
    return arr;
  }, [sessions, extraWeeks]);

  useEffect(() => {
    if (!monthKey && monthOptions.length > 0) {
      setMonthKey(monthOptions[0]);
    }
  }, [monthOptions]);

  const selectedMonthDate = React.useMemo(() => {
    const m = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  }, [monthKey]);

  const weekOptions = React.useMemo(() => {
    if (!selectedMonthDate) return [];
    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();

    const weeks = new Map<string, { start: Date; end: Date; week_start: string; week_end: string }>();
    // De sessões
    for (const s of sessions) {
      if (!s.start_time) continue;
      const d = new Date(s.start_time);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      
      // Filtra pelo mês onde a semana COMEÇA
      if (start.getFullYear() !== year || start.getMonth() !== month) continue;
      
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      const key = `${startStr}_${endStr}`;
      if (!weeks.has(key)) weeks.set(key, { start, end, week_start: startStr, week_end: endStr });
    }

    // De semanas extras
    for (const w of extraWeeks) {
      const [y, m, d] = w.week_start.split('-').map(Number);
      const start = new Date(y, m - 1, d);
      if (start.getFullYear() !== year || start.getMonth() !== month) continue;

      const [ey, em, ed] = w.week_end.split('-').map(Number);
      const end = new Date(ey, em - 1, ed);
      const key = `${w.week_start}_${w.week_end}`;
      if (!weeks.has(key)) weeks.set(key, { start, end, week_start: w.week_start, week_end: w.week_end });
    }

    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const ordered = Array.from(weeks.values())
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const result: WeekOption[] = [];
    ordered.forEach((w, idx) => {
      const weekNum = idx + 1;
      const pad = String(weekNum).padStart(2, '0');
      const dateRangeStr = `${fmt(w.start)} → ${fmt(w.end)}`;

      // Verificar se esta semana possui fechamento antecipado
      const anticipationTx = withdrawTransactions.find(t => 
        t.week_start === w.week_start && 
        t.week_end === w.week_end && 
        t.description?.startsWith('FECHAMENTO ANTECIPADO')
      );

      // Verificar se esta semana possui fechamento regular
      const closingTx = withdrawTransactions.find(t => 
        t.week_start === w.week_start && 
        t.week_end === w.week_end && 
        t.description === 'FECHAMENTO'
      );

      if (anticipationTx) {
        const meta = parseAnticipation(anticipationTx);
        // 1. Semana Antecipada (congelada até a data da antecipação)
        result.push({
          key: `${w.week_start}_${w.week_end}_anticipated`,
          weekNumber: weekNum,
          start: w.start,
          end: w.end,
          label: `Semana ${pad} Antecipada (${dateRangeStr})`,
          kind: 'anticipated',
          anticipatedAt: meta?.anticipated_at || anticipationTx.transaction_date,
          anticipationData: meta,
        });

        // 2. Semana Corrente (pós-antecipação)
        result.push({
          key: `${w.week_start}_${w.week_end}_current`,
          weekNumber: weekNum,
          start: w.start,
          end: w.end,
          label: `Semana ${pad} (${dateRangeStr})${closingTx ? ' (Concluída)' : ''}`,
          kind: 'current',
          anticipatedAt: meta?.anticipated_at || anticipationTx.transaction_date,
          anticipationData: meta,
        });
      } else {
        // Semana normal única
        result.push({
          key: `${w.week_start}_${w.week_end}`,
          weekNumber: weekNum,
          start: w.start,
          end: w.end,
          label: `Semana ${pad} (${dateRangeStr})${closingTx ? ' (Concluída)' : ''}`,
          kind: 'regular',
        });
      }
    });

    return result;
  }, [selectedMonthDate, sessions, extraWeeks, withdrawTransactions]);

  useEffect(() => {
    if (weekOptions.length > 0 && (!weekIndex || !weekOptions.find(w => w.key === weekIndex))) {
      setWeekIndex(weekOptions[0].key);
    }
  }, [weekOptions, weekIndex]);

  const selectedWeek = React.useMemo(() => {
    return weekOptions.find(w => w.key === weekIndex) || weekOptions[0] || null;
  }, [weekIndex, weekOptions]);

  const queryClient = useQueryClient();

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['finance_transactions', selectedWeek?.key],
    queryFn: async () => {
      if (!selectedWeek) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const weekStart = format(selectedWeek.start, 'yyyy-MM-dd');
      const weekEnd = format(selectedWeek.end, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*, site_accounts(nickname, sites(name))')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .eq('week_end', weekEnd)
        .order('transaction_date', { ascending: false });
      if (error) {
        console.error('Erro ao carregar transações:', error);
        return [];
      }
      let list = data || [];
      if (selectedWeek.kind === 'anticipated' && selectedWeek.anticipatedAt) {
        const cutoff = new Date(selectedWeek.anticipatedAt);
        list = list.filter(t => new Date(t.transaction_date) <= cutoff);
      } else if (selectedWeek.kind === 'current' && selectedWeek.anticipatedAt) {
        const cutoff = new Date(selectedWeek.anticipatedAt);
        list = list.filter(t => new Date(t.transaction_date) > cutoff);
      }
      return list;
    },
    enabled: !!selectedWeek,
    staleTime: 60 * 1000,
  });

  const transactions = transactionsData || [];
  const weekLoading = transactionsLoading;

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const timeNow = now.toTimeString().slice(0, 5); // HH:mm
    setNewTransaction(prev => ({ ...prev, transactionDate: today, transactionTime: timeNow }));
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek || !newTransaction.amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    const val = parseCurrencyBR(newTransaction.amount);
    if (isNaN(val) || val <= 0) return;
    const weekStart = format(selectedWeek.start, 'yyyy-MM-dd');
    const weekEnd = format(selectedWeek.end, 'yyyy-MM-dd');

    const now = new Date();
    let txDate: Date = now;
    if (newTransaction.transactionDate) {
      const [year, month, day] = newTransaction.transactionDate.split('-').map(Number);
      if (newTransaction.transactionTime) {
        const [hour, minute] = newTransaction.transactionTime.split(':').map(Number);
        txDate = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
      } else {
        txDate = new Date(year, (month || 1) - 1, day || 1, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
    }

    const { error } = await supabase.from('finance_transactions').insert([{
      user_id: user.id,
      week_start: weekStart,
      week_end: weekEnd,
      type: newTransaction.type,
      amount_brl: val,
      account_id: newTransaction.account_id || null,
      description: newTransaction.description,
      transaction_date: txDate.toISOString()
    }]);

    if (error) {
      showError('Erro ao registrar transação.');
    } else {
      // Se for depósito de Banca, sincronizar também bankroll_initial na weekly_rake daquela semana
      if (newTransaction.type === 'deposit' && newTransaction.description?.toLowerCase().includes('banca')) {
        await supabase.from('weekly_rake').upsert({
          user_id: user.id,
          week_start: weekStart,
          week_end: weekEnd,
          bankroll_initial: val
        }, { onConflict: 'user_id,week_start,week_end' });
      }

      showSuccess('Transação registrada!');
      const now2 = new Date();
      const today = now2.toISOString().slice(0, 10);
      const timeNow = now2.toTimeString().slice(0, 5);
      setNewTransaction({ amount: '', account_id: '', type: 'deposit', description: '', transactionDate: today, transactionTime: timeNow });
      queryClient.invalidateQueries({ queryKey: ['finance_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_rake'] });
      fetchData();
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (error) {
      showError('Erro ao excluir transação.');
    } else {
      showSuccess('Transação excluída.');
      queryClient.invalidateQueries({ queryKey: ['finance_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_rake'] });
      fetchData();
    }
  };

  const bancaAmount = React.useMemo(() => {
    return transactions
      .filter(t => t.type === 'deposit' && (t.description?.toLowerCase().includes('banca') || false))
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
  }, [transactions]);

  const reloadAmount = React.useMemo(() => {
    return transactions
      .filter(t => t.type === 'deposit' && !(t.description?.toLowerCase().includes('banca') || false))
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
  }, [transactions]);

  const totalDeposits = React.useMemo(() => {
    return transactions
      .filter(t => t.type === 'deposit')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
  }, [transactions]);

  const totalWithdraws = React.useMemo(() => {
    return transactions
      .filter(t => t.type === 'withdraw')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
  }, [transactions]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
              <p className="text-muted-foreground mt-1">Controle de bankroll, recargas e saques.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={monthKey} onValueChange={(v) => { setMonthKey(v); setWeekIndex(''); }}>
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
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Selecione a semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map(w => (
                      <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Wallet className="w-5 h-5 text-emerald-500" /> Resumo Financeiro da Semana
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded bg-muted/30 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Banca Inicial</p>
                      <p className="text-base font-bold text-blue-500">{formatCurrency(bancaAmount)}</p>
                    </div>
                    <div className="p-2.5 rounded bg-muted/30 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Reloads / Outros</p>
                      <p className="text-base font-bold text-foreground">{formatCurrency(reloadAmount)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Total Entradas:</span>
                    <span className="font-bold text-blue-500">+{formatCurrency(totalDeposits)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Total Saques:</span>
                    <span className="font-bold text-rose-500">-{formatCurrency(totalWithdraws)}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-bold">
                    <span>Saldo Entradas / Saques:</span>
                    <span className={totalDeposits - totalWithdraws >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                      {formatCurrency(totalDeposits - totalWithdraws)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Plus className="w-5 h-5 text-blue-500" /> Nova Transação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedWeek?.kind === 'anticipated' ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 text-xs font-medium space-y-1">
                      <p className="font-bold">Semana Antecipada (Congelada)</p>
                      <p>Os lançamentos financeiros desta semana foram encerrados no momento da antecipação. Para registrar novas recargas ou saques, selecione a semana corrente no filtro.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleAddTransaction} className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          type="button"
                          variant={newTransaction.type === 'deposit' ? 'default' : 'outline'}
                          className={newTransaction.type === 'deposit' ? 'bg-blue-600' : ''}
                          onClick={() => setNewTransaction({...newTransaction, type: 'deposit'})}
                        >
                          Recarga
                        </Button>
                        <Button 
                          type="button"
                          variant={newTransaction.type === 'withdraw' ? 'default' : 'outline'}
                          className={newTransaction.type === 'withdraw' ? 'bg-rose-600' : ''}
                          onClick={() => setNewTransaction({...newTransaction, type: 'withdraw'})}
                        >
                          Saque
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input 
                          placeholder="0,00" 
                          value={newTransaction.amount} 
                          onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Data</Label>
                          <Input
                            type="date"
                            value={newTransaction.transactionDate}
                            onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Horário</Label>
                          <Input
                            type="time"
                            step="60"
                            value={newTransaction.transactionTime}
                            onChange={(e) => setNewTransaction({ ...newTransaction, transactionTime: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Conta (Opcional)</Label>
                        <Select value={newTransaction.account_id} onValueChange={(v) => setNewTransaction({...newTransaction, account_id: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.nickname} ({a.sites?.name})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Descrição</Label>
                          {newTransaction.type === 'deposit' && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setNewTransaction({ ...newTransaction, description: 'Banca' })}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold"
                              >
                                + Banca
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewTransaction({ ...newTransaction, description: 'Reload' })}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80"
                              >
                                + Reload
                              </button>
                            </div>
                          )}
                        </div>
                        <Input 
                          placeholder="Ex: Banca ou Recarga via Pix" 
                          value={newTransaction.description} 
                          onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                        />
                      </div>
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500">Registrar</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="bg-card border-border h-full">
                <CardHeader>
                  <CardTitle className="text-foreground">Extrato da Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || weekLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">Nenhuma transação registrada nesta semana.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs">
                              {new Date(t.transaction_date).toLocaleDateString('pt-BR')} {new Date(t.transaction_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>
                              {t.type === 'deposit' ? (
                                <span className="flex items-center gap-1 text-blue-500 text-xs font-bold">
                                  <ArrowUpCircle className="w-3 h-3" /> RECARGA
                                </span>
                              ) : t.type === 'expense' ? (
                                <span className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                                  <ArrowDownCircle className="w-3 h-3" /> DESPESA
                                </span>
                              ) : t.description?.startsWith('FECHAMENTO ANTECIPADO') ? (
                                <span className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                  <ArrowDownCircle className="w-3 h-3" /> ANTECIPAÇÃO
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                                  <ArrowDownCircle className="w-3 h-3" /> SAQUE
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {t.site_accounts ? `${t.site_accounts.nickname} (${t.site_accounts.sites?.name})` : '—'}
                            </TableCell>
                            <TableCell className="text-xs italic text-muted-foreground">
                              {t.description?.startsWith('FECHAMENTO ANTECIPADO') 
                                ? 'Fechamento Antecipado' 
                                : t.description === 'FECHAMENTO'
                                ? 'Fechamento Semanal'
                                : t.description || '—'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${t.type === 'deposit' ? 'text-blue-500' : 'text-rose-500'}`}>
                              {t.type === 'deposit' ? '+' : '-'} {formatCurrency(t.amount_brl)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(t.id)} className="h-8 w-8 text-muted-foreground hover:text-rose-500">
                                <Plus className="w-4 h-4 rotate-45" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Financeiro;