"use client";

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import StatsCards from '@/components/dashboard/StatsCards';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Play, Filter } from 'lucide-react';
import { formatBB, formatNumber } from '@/lib/format';

const Index = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 mt-1">Bem-vindo de volta, jogador. Aqui está seu resumo.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="bg-slate-900 border-slate-800 hover:bg-slate-800 gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                <Play className="w-4 h-4 fill-current" />
                Iniciar Sessão
              </Button>
            </div>
          </div>

          <StatsCards />
          
          <div className="grid grid-cols-1 gap-8">
            <PerformanceChart />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">BB/100 por Limite</h3>
              <div className="space-y-4">
                {[
                  { limit: 'NL10', bb: 12.5, hands: 45000, color: 'bg-emerald-500' },
                  { limit: 'NL25', bb: 8.2, hands: 82000, color: 'bg-blue-500' },
                  { limit: 'NL50', bb: 4.1, hands: 18000, color: 'bg-purple-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${item.color}`} />
                      <div>
                        <p className="font-bold text-white">{item.limit}</p>
                        <p className="text-xs text-slate-500">{formatNumber(item.hands)} mãos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">{formatBB(item.bb)}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-tighter">BB/100</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Últimas Atividades</h3>
              <div className="space-y-4">
                {[
                  { user: 'Vinícius', action: 'iniciou uma sessão', time: 'há 2 horas' },
                  { user: 'João (Gestor)', action: 'respondeu uma dúvida', time: 'há 5 horas' },
                  { user: 'Vinícius', action: 'adicionou uma dúvida', time: 'há 1 dia' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-slate-800 pb-3 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                      {log.user[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-300">
                        <span className="font-bold text-white">{log.user}</span> {log.action}
                      </p>
                      <p className="text-xs text-slate-500">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;