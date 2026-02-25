"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, MousePointer2, Target, DollarSign, Percent } from 'lucide-react';
import { formatCurrency, formatNumber, formatBB } from '@/lib/format';

const stats = [
  { label: 'Resultado Total', value: formatCurrency(12450.00), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'BB/100 Geral', value: formatBB(8.4), icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Total de Mãos', value: formatNumber(145200), icon: MousePointer2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: 'Horas Jogadas', value: '320h', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Rake Total', value: formatCurrency(2100.00), icon: Percent, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { label: 'Limite Atual', value: 'NL50', icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
];

const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-slate-900 border-slate-800 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`${stat.color} w-4 h-4`} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-xl font-bold text-white mt-1">{stat.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;