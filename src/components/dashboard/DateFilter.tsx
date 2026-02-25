"use client";

import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export type Period = 'day' | 'month' | 'year' | 'all';

interface DateFilterProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

const DateFilter = ({ period, onPeriodChange }: DateFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-500" />
      <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
        <SelectTrigger className="w-[140px] bg-slate-900 border-slate-800 text-slate-300">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
          <SelectItem value="day">Hoje</SelectItem>
          <SelectItem value="month">Este Mês</SelectItem>
          <SelectItem value="year">Este Ano</SelectItem>
          <SelectItem value="all">Tudo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DateFilter;