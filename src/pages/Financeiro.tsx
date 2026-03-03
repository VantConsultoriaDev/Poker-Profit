"use client";

import React, { useState, useEffect } from 'react';
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
import { formatCurrency, formatNumber } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';

const Financeiro = () => {
  const { convertToBrl } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [monthKey, setMonthKey] = useState<string>('');
  const [weekIndex, setWeekIndex] = useState<string>('1');
  const [bankrollInitial, setBankrollInitial] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);

  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    account_id: '',
    type: 'deposit' as 'deposit' | 'withdraw',
    description: '',
    transactionDate: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [sessionsRes, accountsRes] = await Promise.all([
      supabase.from('sessions').select('*, sites(name, currency)').eq('status', 'completed').order('start_time', { ascending: true }),
      supabase.from('site_accounts').select('*, sites(name)')
    ]);

    setSessions(sessionsRes.data || []);
    setAccounts(accountsRes.data || []);
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
    const arr = Array.from(set);
    arr.sort((a, b) => b.localeCompare(a));
    return arr;
  }, [sessions]);

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

  const selectedWeek = React.useMemo(() => {
    const idx = Number(weekIndex);
    return weekOptions.find(w => w.index === idx) || null;
  }, [weekIndex, weekOptions]);

  const fetchWeekData = async () => {
    if (!selectedWeek) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const weekStart = format(selectedWeek.start, 'yyyy-MM-dd');
    const weekEnd = format(selectedWeek.end, 'yyyy-MM-dd');

    const [rakeRes, transRes] = await Promise.all([
      supabase.from('weekly_rake')
        .select('bankroll_initial')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .eq('week_end', weekEnd)
        .maybeSingle(),
      supabase.from('finance_transactions')
        .select('*, site_accounts(nickname, sites(name))')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .eq('week_end', weekEnd)
        .order('transaction_date', { ascending: false })
    ]);

    setBankrollInitial(String(rakeRes.data?.bankroll_initial || ''));
    setTransactions(transRes.data || []);
  };

  useEffect(() => {
    fetchWeekData();
  }, [selectedWeek]);

  const handleSaveBankroll = async () => {
    if (!selectedWeek) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const val = parseFloat(bankrollInitial.replace(',', '.'));
    const weekStart = format(selectedWeek.start, 'yyyy-MM-dd');
    const weekEnd = format(selectedWeek.end, 'yyyy-MM-dd');

    const { error } = await supabase.from('weekly_rake').upsert({
      user_id: user.id,
      week_start: weekStart,
      week_end: weekEnd,
      bankroll_initial: isNaN(val) ? 0 : val
    }, { onConflict: 'user_id,week_start,week_end' });

    if (error) showError("Erro ao salvar bankroll.");
    else showSuccess("Bankroll inicial salvo!");
  };

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setNewTransaction(prev => ({ ...prev, transactionDate: today }));
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek || !newTransaction.amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const val = parseFloat(newTransaction.amount.replace(',', '.'));
    const weekStart = format(selectedWeek.start, 'yyyy-MM-dd');
    const weekEnd = format(selectedWeek.end, 'yyyy-MM-dd');

    const now = new Date();
    let txDate: Date;
    if (newTransaction.transactionDate) {
      const [year, month, day] = newTransaction.transactionDate.split('-').map(Number);
      txDate = new Date(year, (month || 1) - 1, day || 1, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    } else {
      txDate = now;
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

    if (error) showError("Erro ao registrar transação.");
    else {
      showSuccess("Transação registrada!");
      const today = new Date().toISOString().slice(0, 10);
      setNewTransaction({ amount: '', account_id: '', type: 'deposit', description: '', transactionDate: today });
      fetchWeekData();
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (error) showError("Erro ao excluir transação.");
    else {
      showSuccess("Transação excluída.");
      fetchWeekData();
    }
  };

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Wallet className="w-5 h-5 text-emerald-500" /> Bankroll da Semana
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground uppercase text-[10px] font-bold">Bankroll Inicial (R$)</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="0,00" 
                        value={bankrollInitial} 
                        onChange={(e) => setBankrollInitial(e.target.value)}
                        className="text-lg font-bold"
                      />
                      <Button onClick={handleSaveBankroll} className="bg-emerald-600 hover:bg-emerald-500">Salvar</Button>
                    </div>
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
                    <div className="space-y-2">
                      <Label>Data da transação</Label>
                      <Input
                        type="date"
                        value={newTransaction.transactionDate}
                        onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })}
                      />
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
                      <Label>Descrição</Label>
                      <Input 
                        placeholder="Ex: Recarga via Pix" 
                        value={newTransaction.description} 
                        onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                      />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500">Registrar</Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="bg-card border-border h-full">
                <CardHeader>
                  <CardTitle className="text-foreground">Extrato da Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
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
                              ) : (
                                <span className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                                  <ArrowDownCircle className="w-3 h-3" /> SAQUE
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {t.site_accounts ? `${t.site_accounts.nickname} (${t.site_accounts.sites?.name})` : '—'}
                            </TableCell>
                            <TableCell className="text-xs italic text-muted-foreground">{t.description || '—'}</TableCell>
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