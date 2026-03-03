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
  ArrowUpRight,
  ArrowDownRight,
  StopCircle,
  Edit2,
  Trash2,
  Loader2,
  LayoutGrid
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import SessionModal from '@/components/sessions/SessionModal';
import FinishSessionModal from '@/components/sessions/FinishSessionModal';
import SessionDetailsModal from '@/components/sessions/SessionDetailsModal';
import { showSuccess, showError } from '@/utils/toast';
import { toast } from "sonner";
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Sessions = () => {
  const queryClient = useQueryClient();
  const { convertToBrl } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishingSession, setFinishingSession] = useState<any>(null);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsSession, setDetailsSession] = useState<any | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, sites(name, currency), site_accounts(nickname)')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  const activeSessions = sessions.filter((s: any) => s.status === 'active');

// import { toast } from "sonner"; // Removed duplicate import if exists, using existing imports

// ...

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      // showSuccess("Sessão excluída."); Removido para usar o toast com undo
      logActivity("Sessão excluída", "Uma sessão foi removida do histórico.", 'warning');
    },
    onError: () => showError("Erro ao excluir."),
  });

  const handleDeleteSession = (session: any) => {
    // 1. Otimisticamente remove da lista (via cache update ou refetch imediato)
    // Mas como usamos invalidateQueries no onSuccess, vamos focar na UX do Toast.
    // Para implementar o "Desfazer", não podemos deletar imediatamente do banco
    // OU deletamos e restauramos se o usuário clicar em desfazer.
    // A abordagem mais segura para dados críticos é: soft delete ou delay.
    // Aqui faremos a deleção real, mas com botão de desfazer que recria o registro.
    
    // Melhor abordagem para UX rápida: Toast com promessa ou ação reversa.
    // Como recriar é complexo (perde ID original, etc), vamos fazer um "Soft Delete Visual"
    // ou simplesmente deletar e oferecer um botão que re-insere os dados.
    
    // Vamos simplificar: deletar e se o usuário desfazer, re-inserir.
    
    const sessionBackup = { ...session };
    delete sessionBackup.id; // Remove ID para criar novo
    delete sessionBackup.created_at;
    delete sessionBackup.sites; // Remove joins
    delete sessionBackup.site_accounts;

    deleteMutation.mutate(session.id, {
      onSuccess: () => {
        toast("Sessão excluída", {
          description: "O registro foi removido permanentemente em 7 segundos se não desfizer.",
          action: {
            label: "Desfazer",
            onClick: async () => {
              const { error } = await supabase.from('sessions').insert([sessionBackup]);
              if (!error) {
                queryClient.invalidateQueries({ queryKey: ['sessions'] });
                toast.success("Sessão restaurada!");
              } else {
                toast.error("Erro ao restaurar sessão.");
              }
            },
          },
          duration: 7000,
        });
      }
    });
  };

  const handleSaveSession = async (sessionData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (editingSession) {
        const { error } = await supabase
          .from('sessions')
          .update({
            site_id: sessionData.site_id,
            account_id: sessionData.account_id,
            limit_name: sessionData.limit,
            start_hands: sessionData.start_hands,
            end_hands: sessionData.end_hands,
            start_balance: sessionData.start_balance,
            end_balance: sessionData.end_balance,
            result: sessionData.result,
          })
          .eq('id', editingSession.id);
        if (error) throw error;
        showSuccess("Sessão atualizada!");
      } else {
        if (Array.isArray(sessionData)) {
          const rows = sessionData.map((sd: any) => ({
            user_id: user.id,
            site_id: sd.site_id,
            account_id: sd.account_id,
            limit_name: sd.limit,
            status: sd.type,
            start_time: sd.startTime || new Date().toISOString(),
            end_time: sd.endTime || null,
            start_hands: sd.start_hands || 0,
            end_hands: sd.end_hands || null,
            start_balance: sd.start_balance || 0,
            end_balance: sd.end_balance || null,
            result: sd.result || 0,
          }));
          const { error } = await supabase.from('sessions').insert(rows);
          if (error) throw error;
          const label = (sessionData[0]?.type === 'active') ? "Sessões iniciadas!" : "Sessões registradas!";
          showSuccess(label);
        } else {
          const { error } = await supabase
            .from('sessions')
            .insert([{
              user_id: user.id,
              site_id: sessionData.site_id,
              account_id: sessionData.account_id,
              limit_name: sessionData.limit,
              status: sessionData.type,
              start_time: sessionData.startTime || new Date().toISOString(),
              end_time: sessionData.endTime || null,
              start_hands: sessionData.start_hands || 0,
              end_hands: sessionData.end_hands || null,
              start_balance: sessionData.start_balance || 0,
              end_balance: sessionData.end_balance || null,
              result: sessionData.result || 0,
            }]);
          if (error) throw error;
          showSuccess(sessionData.type === 'active' ? "Sessão iniciada!" : "Sessão registrada!");
        }
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
          end_hands: finishedData.end_hands,
          end_balance: finishedData.end_balance,
          result: finishedData.result,
          rake: finishedData.rake || 0
        })
        .eq('id', finishedData.id);
      
      showSuccess("Sessão finalizada!");
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err) {
      showError("Erro ao finalizar.");
    }
  };

  const filteredSessions = sessions.filter((s: any) => {
    const search = searchTerm.toLowerCase();
    const siteName = s.sites?.name?.toLowerCase() || '';
    const accountName = s.site_accounts?.nickname?.toLowerCase() || '';
    const dateLabel = s.start_time ? new Date(s.start_time).toLocaleDateString('pt-BR') : '';
    return siteName.includes(search) || s.limit_name.toLowerCase().includes(search) || accountName.includes(search) || dateLabel.includes(searchTerm);
  });

  const completedSessions = filteredSessions.filter((s: any) => s.status === 'completed');
  const getSessionGroupKey = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    start.setMilliseconds(0);
    const end = new Date(endIso);
    end.setMilliseconds(0);
    return `${start.toISOString()}|${end.toISOString()}`;
  };
  const sessionGroupMeta = (() => {
    const map = new Map<string, { count: number; totalHands: number; totalResultBrl: number; groupIndex: number }>();
    let groupCounter = 0;
    
    // As completedSessions is ordered by start_time DESC, groups appear together.
    for (const s of completedSessions) {
      if (!s.start_time || !s.end_time) continue;
      const key = getSessionGroupKey(s.start_time, s.end_time);
      const hands = (Number(s.end_hands || 0) - Number(s.start_hands || 0));
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const resultBrl = convertToBrl(Number(s.result || 0), currency);
      
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { count: 1, totalHands: hands, totalResultBrl: resultBrl, groupIndex: groupCounter++ });
      } else {
        map.set(key, { 
          ...prev, 
          count: prev.count + 1, 
          totalHands: prev.totalHands + hands, 
          totalResultBrl: prev.totalResultBrl + resultBrl 
        });
      }
    }
    return map;
  })();

  const formatTime24 = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour12: false });
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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

          {activeSessions.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-full">
                  <Play className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Sessões em Andamento</h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {activeSessions.length} ativa{activeSessions.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {activeSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 rounded-lg border border-emerald-500/20 bg-background/30 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">
                        {s.sites?.name} • {s.limit_name} • {s.site_accounts?.nickname}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {new Date(s.start_time).toLocaleDateString('pt-BR')} • {formatTime24(s.start_time)}
                      </div>
                    </div>
                    <Button
                      onClick={() => { setFinishingSession(s); setIsFinishModalOpen(true); }}
                      variant="destructive"
                      className="gap-2 shrink-0"
                    >
                      <StopCircle className="w-4 h-4" /> Finalizar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por site, limite, conta ou data (dd/mm/aaaa)..." 
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
                    <TableHead className="w-6"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Mãos</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedSessions.map((session: any, index: number) => {
                    const groupKey = (session.start_time && session.end_time) ? getSessionGroupKey(session.start_time, session.end_time) : '';
                    const group = groupKey ? sessionGroupMeta.get(groupKey) : undefined;
                    const showGroupTotals = !!group && group.count > 1;
                    const prev = index > 0 ? completedSessions[index - 1] : null;
                    const next = index < completedSessions.length - 1 ? completedSessions[index + 1] : null;
                    const prevKey = (prev?.start_time && prev?.end_time) ? getSessionGroupKey(prev.start_time, prev.end_time) : '';
                    const nextKey = (next?.start_time && next?.end_time) ? getSessionGroupKey(next.start_time, next.end_time) : '';
                    const linkUp = showGroupTotals && prevKey === groupKey;
                    const linkDown = showGroupTotals && nextKey === groupKey;
                    const hands = (Number(session.end_hands || 0) - Number(session.start_hands || 0));
                    const siteData = Array.isArray(session.sites) ? session.sites[0] : session.sites;
                    const currency = siteData?.currency || 'BRL';
                    const resultBrl = convertToBrl(Number(session.result || 0), currency);

                    const groupColors = [
                      { dot: 'bg-emerald-500', line: 'bg-emerald-500/40' },
                      { dot: 'bg-blue-500', line: 'bg-blue-500/40' },
                      { dot: 'bg-purple-500', line: 'bg-purple-500/40' },
                      { dot: 'bg-amber-500', line: 'bg-amber-500/40' },
                      { dot: 'bg-indigo-500', line: 'bg-indigo-500/40' },
                      { dot: 'bg-rose-500', line: 'bg-rose-500/40' },
                    ];
                    const colorSet = groupColors[(group?.groupIndex || 0) % groupColors.length];

                    return (
                      <TableRow 
                        key={session.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          showGroupTotals ? 'bg-muted/20' : undefined,
                        )}
                        onClick={() => setDetailsSession(session)}
                      >
                        <TableCell className="w-6 px-2">
                          <div className="flex items-center gap-2">
                            {showGroupTotals ? (
                              <div className="relative h-6 w-3 mx-auto shrink-0">
                                {linkUp ? (
                                  <div className={cn("absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2", colorSet.line)} />
                                ) : null}
                                {linkDown ? (
                                  <div className={cn("absolute left-1/2 bottom-0 h-1/2 w-px -translate-x-1/2", colorSet.line)} />
                                ) : null}
                                <div className={cn("absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full", colorSet.dot)} />
                              </div>
                            ) : (
                              <div className="w-3 shrink-0" />
                            )}
                            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell>{new Date(session.start_time).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatTime24(session.start_time)} → {formatTime24(session.end_time)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {calculateDuration(session.start_time, session.end_time)}
                        </TableCell>
                        <TableCell><Badge variant="outline">{session.sites?.name}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{session.site_accounts?.nickname}</Badge></TableCell>
                        <TableCell>{session.limit_name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{formatNumber(hands)}</div>
                            {showGroupTotals && (
                              <div className="text-xs text-muted-foreground">
                                Total: {formatNumber(group.totalHands)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className={cn("flex items-center justify-end gap-1 font-bold", (session.result || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                              {(session.result || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {formatCurrency(Math.abs(session.result || 0))}
                            </div>
                            {showGroupTotals && (
                              <div className={cn("text-xs", (group.totalResultBrl || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                Total BRL: {formatCurrency(Math.abs(group.totalResultBrl))}
                              </div>
                            )}
                            {!showGroupTotals && (
                              <div className="text-xs text-muted-foreground">
                                BRL: {formatCurrency(Math.abs(resultBrl))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setEditingSession(session); setIsModalOpen(true); }}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteSession(session)}
                              title="Excluir"
                              className="text-rose-600 hover:text-rose-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </main>

      <SessionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveSession} initialData={editingSession} />
      <FinishSessionModal 
        isOpen={isFinishModalOpen} 
        onClose={() => { setIsFinishModalOpen(false); setFinishingSession(null); }}
        session={finishingSession} 
        onFinish={handleFinishSession} 
      />

      <SessionDetailsModal
        isOpen={!!detailsSession}
        onClose={() => setDetailsSession(null)}
        session={detailsSession}
      />
    </div>
  );
};

export default Sessions;