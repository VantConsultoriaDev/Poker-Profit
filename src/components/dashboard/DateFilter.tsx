"use client";

import React, { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type Period = 'day' | 'this_week' | 'last_week' | 'month' | 'year' | 'all' | 'custom';

interface DateFilterProps {
  period: Period;
  onPeriodChange: (period: Period, customRange?: { start: string, end: string }) => void;
}

const DateFilter = ({ period, onPeriodChange }: DateFilterProps) => {
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const handleApplyCustom = () => {
    onPeriodChange('custom', customRange);
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-500" />
        <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <SelectTrigger className="w-[160px] bg-background border-input text-foreground">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem value="day">Hoje</SelectItem>
            <SelectItem value="this_week">Esta Semana</SelectItem>
            <SelectItem value="last_week">Semana Passada</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
          <Input 
            type="date" 
            value={customRange.start} 
            onChange={e => setCustomRange({...customRange, start: e.target.value})}
            className="w-[140px] h-9 bg-background border-input text-foreground text-xs"
          />
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <Input 
            type="date" 
            value={customRange.end} 
            onChange={e => setCustomRange({...customRange, end: e.target.value})}
            className="w-[140px] h-9 bg-background border-input text-foreground text-xs"
          />
          <Button size="sm" onClick={handleApplyCustom} className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
};

export default DateFilter;