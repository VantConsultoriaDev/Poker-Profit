"use client";

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/format';

const siteData = [
  { name: 'PokerStars', value: 4500, color: '#ef4444' },
  { name: 'GG Poker', value: 3200, color: '#fbbf24' },
  { name: 'Bodog', value: 1800, color: '#10b981' },
];

const limitData = [
  { name: 'NL10', value: 1200 },
  { name: 'NL25', value: 2800 },
  { name: 'NL50', value: 5500 },
];

const Reports = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Relatórios</h1>
            <p className="text-slate-400 mt-1">Análise profunda dos seus resultados.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Lucro por Site</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={siteData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                      formatter={(v: number) => [formatCurrency(v), 'Lucro']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {siteData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Lucro por Limite</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={limitData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                      formatter={(v: number) => [formatCurrency(v), 'Lucro']}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Resumo Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 font-medium">Mês</th>
                      <th className="pb-3 font-medium">Mãos</th>
                      <th className="pb-3 font-medium">Rake</th>
                      <th className="pb-3 font-medium text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {[
                      { month: 'Maio 2024', hands: 45000, rake: 850, profit: 2400 },
                      { month: 'Abril 2024', hands: 38000, rake: 720, profit: -450 },
                      { month: 'Março 2024', hands: 52000, rake: 980, profit: 3100 },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/50 last:border-0">
                        <td className="py-4 font-medium text-white">{row.month}</td>
                        <td className="py-4">{row.hands.toLocaleString()}</td>
                        <td className="py-4">{formatCurrency(row.rake)}</td>
                        <td className={`py-4 text-right font-bold ${row.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(row.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;