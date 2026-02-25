"use client";

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Play, Search, MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const sessions = [
  { id: 1, date: '24/05/2024', site: 'PokerStars', limit: 'NL50', hands: 1200, result: 450.20, rake: 45.00, status: 'positivo' },
  { id: 2, date: '23/05/2024', site: 'GG Poker', limit: 'NL50', hands: 850, result: -120.50, rake: 32.00, status: 'negativo' },
  { id: 3, date: '22/05/2024', site: 'PokerStars', limit: 'NL25', hands: 2100, result: 310.00, rake: 58.00, status: 'positivo' },
  { id: 4, date: '21/05/2024', site: '888Poker', limit: 'NL25', hands: 1500, result: 15.00, rake: 28.00, status: 'positivo' },
];

const Sessions = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Sessões</h1>
              <p className="text-slate-400 mt-1">Histórico completo de suas jogadas.</p>
            </div>
            
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
              <Play className="w-4 h-4 fill-current" />
              Iniciar Nova Sessão
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Buscar por data, valor ou 'positivo'/'negativo'..." 
                  className="pl-10 bg-slate-950 border-slate-800 text-slate-200 focus:ring-emerald-500"
                />
              </div>
            </div>

            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Data</TableHead>
                  <TableHead className="text-slate-400">Site</TableHead>
                  <TableHead className="text-slate-400">Limite</TableHead>
                  <TableHead className="text-slate-400">Mãos</TableHead>
                  <TableHead className="text-slate-400">Rake</TableHead>
                  <TableHead className="text-slate-400 text-right">Resultado</TableHead>
                  <TableHead className="text-slate-400 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <TableCell className="font-medium text-slate-300">{session.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
                        {session.site}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{session.limit}</TableCell>
                    <TableCell className="text-slate-400">{session.hands.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-400">${session.rake.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-1 font-bold",
                        session.result >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {session.result >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        ${Math.abs(session.result).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-200">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Sessions;