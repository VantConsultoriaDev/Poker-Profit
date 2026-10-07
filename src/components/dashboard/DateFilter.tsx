"use client";
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, subDays } from 'date-fns';
import type { DashboardRange } from '@/lib/goals';
export type Period = 'day' | 'this_week' | 'last_week' | 'month' | 'year' | 'all' | 'custom' | 'selected_week' | 'last_days';
export interface DashboardWeekOption {
  key: string; month: string; label: string; range: DashboardRange;
}
interface Props {
  period: Period;
  weeks?: DashboardWeekOption[];
  onPeriodChange: (period: Period, range?: DashboardRange) => void;
}
const DateFilter = ({ period, weeks: suppliedWeeks, onPeriodChange }: Props) => {
  const weeks = suppliedWeeks ?? [];
  const supportsWeekly = suppliedWeeks !== undefined;
  const today = format(new Date(), 'yyyy-MM-dd');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState('');
  const [dates, setDates] = useState({ start: today, end: today });
  const [days, setDays] = useState('7');
  const [error, setError] = useState('');
  const months = [...new Set(weeks.map(w => w.month))].sort().reverse();
  const options = weeks.filter(w => w.month === month);
  const choose = (key: string) => {
    const option = weeks.find(w => w.key === key);
    if (!option) return;
    setSelected(key); setError(''); onPeriodChange('selected_week', option.range);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={(rawValue: string) => {
        const value = rawValue as Period;
        setError('');
        if (value === 'selected_week') {
          if (options.length) choose(options[0].key);
          else onPeriodChange(value);
        } else if (value === 'last_days') {
          onPeriodChange(value, { start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: today });
          setDays('7');
        } else onPeriodChange(value, value === 'custom' ? dates : undefined);
      }}>
        <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Hoje</SelectItem>
          <SelectItem value="this_week">Esta semana</SelectItem>
          <SelectItem value="last_week">Semana passada</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="year">Este ano</SelectItem>
          <SelectItem value="all">Tudo</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
          {supportsWeekly && <SelectItem value="selected_week">Semanal</SelectItem>}
          <SelectItem value="last_days">Últimos X dias</SelectItem>
        </SelectContent>
      </Select>
      {supportsWeekly && period === 'selected_week' && <>
        <Select value={month} onValueChange={value => {
          setMonth(value);
          const first = weeks.find(w => w.month === value);
          if (first) choose(first.key);
        }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>{months.map(value => <SelectItem key={value} value={value}>{value.slice(5)}/{value.slice(0,4)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selected} onValueChange={choose}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecione a semana" /></SelectTrigger>
          <SelectContent>{options.map(w => <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>)}</SelectContent>
        </Select>
        {!options.length && <span className="text-xs text-muted-foreground">Sem semanas cadastradas neste mês.</span>}
      </>}
      {period === 'custom' && <>
        <Input aria-label="Data inicial" type="date" className="w-[145px]" value={dates.start} onChange={e => setDates({ ...dates, start: e.target.value })} />
        <Input aria-label="Data final" type="date" className="w-[145px]" value={dates.end} onChange={e => setDates({ ...dates, end: e.target.value })} />
        <Button onClick={() => {
          if (!dates.start || !dates.end || dates.start > dates.end) { setError('Informe um período válido.'); return; }
          setError(''); onPeriodChange('custom', dates);
        }}>Aplicar</Button>
      </>}
      {period === 'last_days' && <>
        <Input aria-label="Quantidade de dias" type="number" min="1" max="3650" className="w-[90px]" value={days} onChange={e => setDays(e.target.value)} />
        <Button onClick={() => {
          const n = Number(days);
          if (!Number.isInteger(n) || n < 1 || n > 3650) { setError('Informe de 1 a 3650 dias.'); return; }
          setError(''); onPeriodChange('last_days', { start: format(subDays(new Date(), n - 1), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });
        }}>Aplicar</Button>
      </>}
      {error && <span role="alert" className="text-xs text-rose-500">{error}</span>}
    </div>
  );
};
export default DateFilter;
