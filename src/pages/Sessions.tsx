"use client";

import React, { useState } from 'react';
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
import { Play, Search, MoreHorizontal, ArrowUpRight, ArrowDownRight, StopCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import SessionModal from '@/components/sessions/SessionModal';
import FinishSessionModal from '@/components/sessions/FinishSessionModal';

const initialSessions = [
  { id: 1, date: '24/05/2024', site: 'PokerStars', limit: 'NL50', hands: 1200, result: 450.20, rake: 45.00, type: 'completed' },
  { id: 2, date: '23/05/2024', site: 'GG Poker', limit: 'NL50', hands: 850, result: -120.50, rake: 32.00, type: 'completed' },
  { id: 3, date: '22/05/2024', site: 'PokerStars', limit: 'NL25', hands: 2100, result: 310.00, rake: 58.00, type: 'completed' },
];

const Sessions = () => {
  const [sessions, setSessions] = useState(initialSessions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSaveSession = (newSession: any) => {
    if (newSession.type === 'active') {
      setActiveSession({ ...newSession, id: Date.now() });
    } else {
      setSessions([{ ...newSession, id: Date.now() }, ...sessions]);
    }
  };

  const handleFinishSession = (finishedData: any) => {
    setSessions([finishedData, ...sessions]);
    setActiveSession(null);
  };

  const filteredSessions = sessions.filter(s => {
    const search = searchTerm.toLowerCase();
    const isPositive = s.result >= (s.limit.includes('50') ? 25 : 12.5); // Exemplo de regra 0.5 buy-in
    const statusMatch = search === 'positivo' ? isPositive : search === 'negativo' ? !isPositive : true;
    
    return (
      s.site.toLowerCase().includes(search) ||
      s.date.includes(search) ||
      s.result.toString().includes(search) ||
      (search === 'positivo' || search === 'negativo' ? statusMatch : false)
    );
  });

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
            
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Registrar Sessão
            </Button>
          </div>

          {/* Sessão Ativa */}
          {activeSession && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-full">
                  <Play className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sessão em Andamento</h3>
                  <p className="text-sm text-emerald-400">{activeSession.site} • {activeSession.limit} • Iniciada às {new Date(activeSession.startTime).toLocaleTimeString()}</p>
                </div>
              </div>
              <Button 
                onClick={() => setIsFinishModalOpen(true)}
                variant="destructive" 
                className="bg-rose-600 hover:bg-rose-500 gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Finalizar Sessão
              </Button>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Buscar por data, site ou 'positivo'/'negativo'..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                {filteredSessions.map((session) => (
                  <TableRow key={session.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <TableCell className="font-medium text-slate-300">{session.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
                        {session.site}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{session.limit}</TableCell>
                    <TableCell className="text-slate-400">{formatNumber(session.hands)}</TableCell>
                    <TableCell className="text-slate-400">{formatCurrency(session.rake)}</TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-1 font-bold",
                        session.result >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {session.result >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {formatCurrency(Math.abs(session.result))}
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

      <SessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveSession}
      />

      <FinishSessionModal 
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        session={activeSession}
        onFinish={handleFinishSession}
      />
    </div>
  );
};

export default Sessions;