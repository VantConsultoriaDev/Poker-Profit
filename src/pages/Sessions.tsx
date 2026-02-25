"use client";

import React, { useState, useEffect } from 'react';
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
import { 
  Play, 
  Search, 
  MoreHorizontal, 
  ArrowUpRight, 
  ArrowDownRight, 
  StopCircle,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import SessionModal from '@/components/sessions/SessionModal';
import FinishSessionModal from '@/components/sessions/FinishSessionModal';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/logger';

const Sessions = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        sites (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      showError("Erro ao carregar sessões.");
    } else {
      setSessions(data || []);
      const active = data?.find(s => s.status === 'active');
      if (active) setActiveSession(active);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSaveSession = async (sessionData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingSession) {
      const { error } = await supabase
        .from('sessions')
        .update({
          site_id: sessionData.site_id,
          limit_name: sessionData.limit,
          start_hands: sessionData.hands,
          result: sessionData.result,
          rake: sessionData.rake,
        })
        .eq('id', editingSession.id);

      if (error) showError("Erro ao atualizar.");
      else {
        showSuccess("Sessão atualizada!");
        logActivity("Sessão editada", `Sessão de ${sessionData.limit} atualizada.`, 'info');
        fetchSessions();
      }
    } else {
      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          user_id: user.id,
          site_id: sessionData.site_id,
          limit_name: sessionData.limit,
          status: sessionData.type,
          start_time: sessionData.startTime || new Date().toISOString(),
          start_hands: sessionData.startHands || 0,
          start_balance: sessionData.startBalance || 0,
          result: sessionData.result || 0,
          rake: sessionData.rake || 0,
        }])
        .select()
        .single();

      if (error) showError("Erro ao salvar.");
      else {
        if (sessionData.type === 'active') {
          setActiveSession(data);
          logActivity("Sessão iniciada", `Iniciou sessão em ${sessionData.limit}`, 'success');
        } else {
          logActivity("Sessão registrada", `Registrou sessão manual de ${sessionData.limit}`, 'info');
        }
        showSuccess(sessionData.type === 'active' ? "Sessão iniciada!" : "Sessão registrada!");
        fetchSessions();
      }
    }
  };

  const handleFinishSession = async (finishedData: any) => {
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        end_time: finishedData.endTime,
        end_hands: finishedData.endHands,
        end_balance: finishedData.endBalance,
        result: finishedData.result,
        rake: finishedData.rake,
      })
      .eq('id', activeSession.id);

    if (error) showError("Erro ao finalizar.");
    else {
      showSuccess("Sessão finalizada com sucesso!");
      logActivity("Sessão finalizada", `Resultado: ${formatCurrency(finishedData.result)}`, finishedData.result >= 0 ? 'success' : 'warning');
      setActiveSession(null);
      fetchSessions();
    }
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) showError("Erro ao excluir.");
    else {
      showSuccess("Sessão excluída.");
      logActivity("Sessão excluída", "Uma sessão foi removida do histórico.", 'warning');
      fetchSessions();
    }
  };

  const filteredSessions = sessions.filter(s => {
    const search = searchTerm.toLowerCase();
    const siteName = s.sites?.name?.toLowerCase() || '';
    return siteName.includes(search) || s.limit_name.toLowerCase().includes(search);
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
              onClick={() => {
                setEditingSession(null);
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Registrar Sessão
            </Button>
          </div>

          {activeSession && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-full">
                  <Play className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sessão em Andamento</h3>
                  <p className="text-sm text-emerald-400">
                    {activeSession.sites?.name} • {activeSession.limit_name} • Iniciada às {new Date(activeSession.start_time).toLocaleTimeString()}
                  </p>
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
                  placeholder="Buscar por site ou limite..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-950 border-slate-800 text-slate-200 focus:ring-emerald-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : (
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
                  {filteredSessions.filter(s => s.status === 'completed').map((session) => (
                    <TableRow key={session.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <TableCell className="font-medium text-slate-300">
                        {new Date(session.start_time).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
                          {session.sites?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">{session.limit_name}</TableCell>
                      <TableCell className="text-slate-400">
                        {formatNumber((session.end_hands || 0) - (session.start_hands || 0))}
                      </TableCell>
                      <TableCell className="text-slate-400">{formatCurrency(session.rake || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 font-bold",
                          (session.result || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {(session.result || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {formatCurrency(Math.abs(session.result || 0))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                            <DropdownMenuItem onClick={() => { setEditingSession(session); setIsModalOpen(true); }} className="gap-2 cursor-pointer">
                              <Edit2 className="w-4 h-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteSession(session.id)} className="gap-2 text-rose-400 focus:text-rose-400 cursor-pointer">
                              <Trash2 className="w-4 h-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </main>

      <SessionModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingSession(null);
        }} 
        onSave={handleSaveSession}
        initialData={editingSession}
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