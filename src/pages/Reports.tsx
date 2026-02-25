"use client";

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { formatCurrency } from '@/lib/format';

// Dados simulados de evolução cumulativa por site/limite
const cumulativeData = [
  { hands: 0, stars: 0, gg: 0, bodog: 0, total: 0 },
  { hands: 1000, stars: 120, gg: -50, bodog: 80, total: 150 },
  { hands: 2000, stars: 80, gg: -120, bodog: 150, total: 110 },
  { hands: 3000, stars: 250, gg: 40, bodog: 210, total: 500 },
  { hands: 4000, stars: 310, gg: 180, bodog: 190, total: 680 },
  { hands: 5000, stars: 450, gg: 320, bodog: 280, total: 1050 },
  { hands: 6000, stars: 420, gg: 510, bodog: 350, total: 1280 },
  { hands: 7600, stars: 580, gg: 490, bodog: 420, total: 1490 },
];

const Reports = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Relatórios</h1>
            <p className="text-slate-400 mt-1">Análise de performance por site e limite.</p>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Gráfico de Evolução (Profit vs Mãos)</CardTitle>
            </CardHeader>
            <CardContent className="h-[500px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="hands" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickFormatter={(v) => `${v/1000}k`}
                    label={{ value: 'Mãos', position: 'insideBottom', offset: -10, fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    formatter={(v: number) => [formatCurrency(v), '']}
                    labelFormatter={(v) => `${v} mãos`}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Geral" 
                    stroke="#ffffff" 
                    strokeWidth={3} 
                    dot={false} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stars" 
                    name="PokerStars (PLO50)" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gg" 
                    name="GG Poker (PLO100)" 
                    stroke="#fbbf24" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bodog" 
                    name="Bodog (PLO25)" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Melhor Site', value: 'PokerStars', sub: '+$580.00', color: 'text-rose-400' },
              { label: 'Melhor Limite', value: 'PLO50', sub: '12.4 BB/100', color: 'text-emerald-400' },
              { label: 'Volume Total', value: '7.6k mãos', sub: 'Este mês', color: 'text-blue-400' },
            ].map((stat, i) => (
              <Card key={i} className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <p className="text-xs text-slate-500 uppercase font-bold">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
                  <p className={`text-sm font-medium mt-1 ${stat.color}`}>{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;