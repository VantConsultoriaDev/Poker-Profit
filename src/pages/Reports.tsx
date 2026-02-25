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
import { useCurrency } from '@/contexts/CurrencyContext';

const Reports = () => {
  const { usdToBrlRate, convertToBrl } = useCurrency();

  // Dados simulados originais (alguns em USD, outros em BRL)
  const rawData = [
    { hands: 0, starsUsd: 0, ggUsd: 0, bodogBrl: 0 },
    { hands: 1000, starsUsd: 20, ggUsd: -10, bodogBrl: 80 },
    { hands: 2000, starsUsd: 15, ggUsd: -20, bodogBrl: 150 },
    { hands: 3000, starsUsd: 45, ggUsd: 10, bodogBrl: 210 },
    { hands: 4000, starsUsd: 55, ggUsd: 35, bodogBrl: 190 },
    { hands: 5000, starsUsd: 80, ggUsd: 60, bodogBrl: 280 },
    { hands: 6000, starsUsd: 75, ggUsd: 95, bodogBrl: 350 },
    { hands: 7600, starsUsd: 105, ggUsd: 90, bodogBrl: 420 },
  ];

  // Converte tudo para BRL para o gráfico
  const convertedData = rawData.map(d => {
    const starsBrl = convertToBrl(d.starsUsd, 'USD');
    const ggBrl = convertToBrl(d.ggUsd, 'USD');
    return {
      hands: d.hands,
      stars: starsBrl,
      gg: ggBrl,
      bodog: d.bodogBrl,
      total: starsBrl + ggBrl + d.bodogBrl
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Relatórios</h1>
              <p className="text-slate-400 mt-1">Análise de performance convertida para R$ (Taxa: {usdToBrlRate})</p>
            </div>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Gráfico de Evolução (Profit em R$ vs Mãos)</CardTitle>
            </CardHeader>
            <CardContent className="h-[500px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={convertedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="hands" 
                    type="number"
                    stroke="#64748b" 
                    fontSize={12} 
                    tickFormatter={(v) => `${v/1000}k`}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip 
                    trigger="axis"
                    isAnimationActive={false}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    formatter={(v: number) => [formatCurrency(v), '']}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  
                  <Line type="monotone" dataKey="total" name="Total (R$)" stroke="#ffffff" strokeWidth={3} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="stars" name="PokerStars (Convertido)" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="gg" name="GG Poker (Convertido)" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="bodog" name="Bodog (Original R$)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;