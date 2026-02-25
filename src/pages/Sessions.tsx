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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Sessions = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Query principal de sessões
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, sites(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  const activeSession = sessions.find((s: any) => s.status === 'active');

  // Mutação para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      showSuccess("Sessão excluída.");
      logActivity("Sessão excluída", "Uma sessão foi removida do histórico.", 'warning');
    },
    onError: () => showError("Erro ao excluir."),
  });

  const handleSaveSession = async (sessionData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (editingSession) {
        await supabase
          .from('sessions')
          .update({
            site_id: sessionData.site_id,
            limit_name: sessionData.limit,
            start_hands: sessionData.hands,
            result: sessionData.result,
          })
          .eq('id', editingSession.id);
        showSuccess("Sessão atualizada!");
      } else {
        await supabase
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
          }]);
        showSuccess(sessionData.type === 'active' ? "Sessão iniciada!" : "Sessão registrada!");
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err) {
      showError("Erro ao salvar.");
    }
  };

  const handleFinishSession = async (finishedData: any) => {
    try {
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          end_time: finishedData.endTime,
          end_hands: finishedData.endHands,
          end_balance: finishedData.endBalance,
          result: finishedData.result,
        })
        .eq('id', activeSession.id);
      
      showSuccess("Sessão finalizada!");
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err) {
      showError("Erro ao finalizar.");
    }
  };

  const filteredSessions = sessions.filter((s: any) => {
    const search = searchTerm.toLowerCase();
    const siteName = s.sites?.name?.toLowerCase() || '';
    return siteName.includes(search) || s.limit_name.toLowerCase().includes(search);
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sessões</h1>
              <p className="text-muted-foreground mt-1">Histórico completo de suas jogadas.</p>
            </div>
            <Button 
              onClick={() => { setEditingSession(null); setIsModalOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Registrar Sessão
            </Button>
          </div>

          {activeSession && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-full">
                  <Play className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Sessão em Andamento</h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {activeSession.sites?.name} • {activeSession.limit_name}
                  </p>
                </div>
              </div>
              <Button onClick={() => setIsFinishModalOpen(true)} variant="destructive" className="gap-2">
                <StopCircle className="w-4 h-4" /> Finalizar
              </Button>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por site ou limite..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Mãos</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.filter((s: any) => s.status === 'completed').map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell>{new Date(session.start_time).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell><Badge variant="outline">{session.sites?.name}</Badge></TableCell>
                      <TableCell>{session.limit_name}</TableCell>
                      <TableCell>{formatNumber((session.end_hands || 0) - (session.start_hands || 0))}</TableCell>
                      <TableCell className="text-right">
                        <div className={cn("flex items-center justify-end gap-1 font-bold", (session.result || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {(session.result || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {formatCurrency(Math.abs(session.result || 0))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingSession(session); setIsModalOpen(true); }} className="gap-2"><Edit2 className="w-4 h-4" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMutation.mutate(session.id)} className="gap-2 text-rose-600"><Trash2 className="w-4 h-4" /> Excluir</DropdownMenuItem>
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

      <SessionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveSession} initialData={editingSession} />
      <FinishSessionModal isOpen={isFinishModalOpen} onClose={() => setIsFinishModalOpen(false)} session={activeSession} onFinish={handleFinishSession} />
    </div>
  );
};

export default Sessions;