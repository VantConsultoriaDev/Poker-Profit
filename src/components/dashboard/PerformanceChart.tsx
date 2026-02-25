"use client";

import React, { useState } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Settings } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Fev', value: 1200 },
  { name: 'Mar', value: 900 },
  { name: 'Abr', value: 2100 },
  { name: 'Mai', value: 1800 },
  { name: 'Jun', value: 3400 },
  { name: 'Jul', value: 4200 },
];

const PerformanceChart = () => {
  const [metric, setMetric] = useState('Resultado ($)');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-bold text-white">Performance Cumulativa</h2>
          <p className="text-sm text-slate-400">Acompanhamento de evolução temporal</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="bg-slate-800 border-slate-700 hover:bg-slate-700">
              <Settings className="w-4 h-4 text-slate-300" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
            <DropdownMenuItem onClick={() => setMetric('Resultado ($)')}>Resultado ($)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMetric('Buy-ins Ganhos')}>Buy-ins Ganhos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMetric('BB/100')}>BB/100</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMetric('Mãos Jogadas')}>Mãos Jogadas</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMetric('Horas Jogadas')}>Horas Jogadas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              isAnimationActive={false}
              cursor={{ stroke: '#334155', strokeWidth: 1 }}
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#10b981' }}
              formatter={(value: number) => [formatCurrency(value), metric]}
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
      </div>
    </div>
  );
};

export default PerformanceChart;