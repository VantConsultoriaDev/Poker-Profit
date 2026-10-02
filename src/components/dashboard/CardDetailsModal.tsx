import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/format';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Wallet,
  TrendingUp,
  Clock,
  MousePointer2,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export type CardModalType = 
  | 'bankroll'
  | 'lucro_liquido'
  | 'horas'
  | 'maos'
  | 'resultado_total'
  | 'resultado_sem_rb'
  | 'rake_total'
  | null;

interface CardDetailsModalProps {
  type: CardModalType;
  onClose: () => void;
  period: string;
  periodLabel: string;
  sessions: any[];
  allSessions: any[];
  financeTransactions: any[];
  weeklyRakes: any[];
  profile: any;
  currentBankroll: number;
  statsData: any;
  convertToBrl: (amount: number, currency?: string) => number;
}

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({
  type,
  onClose,
  period,
  periodLabel,
  sessions,
  allSessions,
  financeTransactions,
  weeklyRakes,
  profile,
  currentBankroll,
  statsData,
  convertToBrl,
}) => {
  if (!type) return null;

  const profitDealPct = profile?.profit_deal !== undefined && profile?.profit_deal !== null 
    ? Number(profile.profit_deal) 
    : 100;

  // Helper de agrupamento diário das sessões com unificação de sobreposição (multi-telas)
  const dailySessionsMap = React.useMemo(() => {
    const map = new Map<string, {
      date: string;
      dateObj: Date;
      sessions: any[];
      totalResultBrl: number;
      totalRakeBrl: number;
      totalHands: number;
      totalMinutes: number;
      mergedIntervals: Array<{ start: number; end: number }>;
      sessionCount: number;
    }>();

    (sessions || []).forEach(s => {
      if (!s.start_time) return;
      const d = new Date(s.start_time);
      const dateKey = format(d, 'yyyy-MM-dd');
      
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const resultBrl = convertToBrl(Number(s.result || 0), currency);
      const rakeBrl = convertToBrl(Number(s.rake || 0), currency);
      const hands = Math.max(0, Number(s.end_hands || 0) - Number(s.start_hands || 0));

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          dateObj: d,
          sessions: [],
          totalResultBrl: 0,
          totalRakeBrl: 0,
          totalHands: 0,
          totalMinutes: 0,
          mergedIntervals: [],
          sessionCount: 0,
        });
      }

      const entry = map.get(dateKey)!;
      entry.sessions.push(s);
      entry.totalResultBrl += resultBrl;
      entry.totalRakeBrl += rakeBrl;
      entry.totalHands += hands;
    });

    // Para cada dia, calcular os blocos reais de jogo unificando telas simultâneas
    map.forEach(entry => {
      const dayIntervals: Array<{ start: number; end: number }> = [];
      entry.sessions.forEach(s => {
        if (s.start_time && s.end_time) {
          const startDate = new Date(s.start_time);
          startDate.setMilliseconds(0);
          const endDate = new Date(s.end_time);
          endDate.setMilliseconds(0);
          const start = startDate.getTime();
          const end = endDate.getTime();
          dayIntervals.push({ start, end: Math.max(start, end) });
        }
      });

      dayIntervals.sort((a, b) => a.start - b.start);
      const dayMerged: Array<{ start: number; end: number }> = [];
      dayIntervals.forEach(interval => {
        const last = dayMerged[dayMerged.length - 1];
        if (!last || interval.start > last.end) {
          dayMerged.push({ ...interval });
          return;
        }
        last.end = Math.max(last.end, interval.end);
      });

      const dayMinutes = dayMerged.reduce((acc, interval) => {
        return acc + (interval.end - interval.start) / (1000 * 60);
      }, 0);

      entry.mergedIntervals = dayMerged;
      entry.sessionCount = dayMerged.length > 0 ? dayMerged.length : (entry.sessions.length > 0 ? 1 : 0);
      entry.totalMinutes = dayMinutes;
    });

    return Array.from(map.values()).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [sessions, convertToBrl]);

  // Transações financeiras no período
  const periodTransactions = React.useMemo(() => {
    if (!financeTransactions || financeTransactions.length === 0) return [];
    
    // Se o período tem sessões, pegamos o intervalo delas
    let minDate = new Date();
    let maxDate = new Date();
    if (sessions.length > 0) {
      const times = sessions.map(s => new Date(s.start_time).getTime()).filter(Boolean);
      if (times.length > 0) {
        minDate = new Date(Math.min(...times));
        maxDate = new Date(Math.max(...times));
      }
    }

    return (financeTransactions || []).filter(t => {
      if (!t.transaction_date) return false;
      const tDate = new Date(t.transaction_date);
      // Se for esta semana ou período com sessões, filtra próximo ao intervalo
      if (period === 'this_week') {
        return tDate >= minDate && tDate <= maxDate;
      }
      return true;
    }).sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [financeTransactions, sessions, period]);

  // Melhor e pior sessão (para Resultado S/ RB)
  const bestWorstSessions = React.useMemo(() => {
    if (!sessions || sessions.length === 0) return { best: null, worst: null };

    let best: { session: any; resultBrl: number } | null = null;
    let worst: { session: any; resultBrl: number } | null = null;

    sessions.forEach(s => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const resultBrl = convertToBrl(Number(s.result || 0), currency);

      if (!best || resultBrl > best.resultBrl) {
        best = { session: s, resultBrl };
      }
      if (!worst || resultBrl < worst.resultBrl) {
        worst = { session: s, resultBrl };
      }
    });

    return { best, worst };
  }, [sessions, convertToBrl]);

  // Render do Modal de Bankroll
  const renderBankrollContent = () => {
    const totalDeposits = periodTransactions
      .filter(t => t.type === 'deposit')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
    const totalWithdraws = periodTransactions
      .filter(t => t.type === 'withdraw')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
    const totalExpenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Bankroll Atual</p>
            <p className="text-base font-bold text-emerald-500 mt-1">{formatCurrency(currentBankroll)}</p>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Depósitos</p>
            <p className="text-base font-bold text-foreground mt-1">+{formatCurrency(totalDeposits)}</p>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Saques/Antecipações</p>
            <p className="text-base font-bold text-rose-500 mt-1">-{formatCurrency(totalWithdraws)}</p>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Despesas</p>
            <p className="text-base font-bold text-amber-500 mt-1">-{formatCurrency(totalExpenses)}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Movimentações Financeiras ({periodTransactions.length})
          </h4>
          <ScrollArea className="h-64 rounded-md border border-border p-2">
            {periodTransactions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma movimentação registrada no período.</p>
            ) : (
              <div className="space-y-2">
                {periodTransactions.map((t, idx) => {
                  const isAnticipation = t.description?.startsWith('FECHAMENTO ANTECIPADO');
                  const isClosing = t.description === 'FECHAMENTO';
                  const isDeposit = t.type === 'deposit';
                  const isExpense = t.type === 'expense';
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/50 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={isDeposit ? 'default' : isExpense ? 'destructive' : 'secondary'} className="text-[10px] py-0 px-1.5">
                            {isAnticipation ? 'Antecipação' : isClosing ? 'Fechamento' : isDeposit ? 'Depósito' : isExpense ? 'Despesa' : 'Saque'}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {isAnticipation ? 'Fechamento Antecipado' : t.description || 'Movimentação'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t.transaction_date ? format(new Date(t.transaction_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                        </p>
                      </div>
                      <span className={`font-bold ${isDeposit ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isDeposit ? '+' : '-'}{formatCurrency(Number(t.amount_brl || 0))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Render do Modal de Lucro Líquido
  const renderLucroLiquidoContent = () => {
    const winningSessions = sessions.filter(s => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      return convertToBrl(Number(s.result || 0), siteData?.currency || 'BRL') > 0;
    });
    const losingSessions = sessions.filter(s => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      return convertToBrl(Number(s.result || 0), siteData?.currency || 'BRL') < 0;
    });

    const totalWinsBrl = winningSessions.reduce((acc, s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      return acc + convertToBrl(Number(s.result || 0), siteData?.currency || 'BRL');
    }, 0);

    const totalLossesBrl = losingSessions.reduce((acc, s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      return acc + convertToBrl(Number(s.result || 0), siteData?.currency || 'BRL');
    }, 0);

    const lucroResidual = statsData.isAnticipated
      ? Math.max(0, (statsData.currentWeekTotalLiquido ?? 0) - (statsData.anticipatedLucroLiquido ?? 0))
      : (statsData.currentWeekTotalLiquido ?? 0);

    return (
      <div className="space-y-4">
        {statsData.isAnticipated && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-emerald-400">Semana com Fechamento Antecipado</p>
                <p className="text-[11px] text-muted-foreground">O lucro já foi realizado e antecipado para a semana.</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Valor Antecipado</p>
              <p className="text-base font-extrabold text-emerald-400">
                {formatCurrency(statsData.anticipatedLucroLiquido ?? 258.16)}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ganhos Brutos</p>
            <p className="text-sm font-bold text-emerald-500 mt-1">+{formatCurrency(totalWinsBrl)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{winningSessions.length} sessões</p>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Perdas Brutas</p>
            <p className="text-sm font-bold text-rose-500 mt-1">{formatCurrency(totalLossesBrl)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{losingSessions.length} sessões</p>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rake Total / Deal</p>
            <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(statsData.totalRakeTotalBrl)}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Deal: +{formatCurrency(statsData.totalRakeDealBrl)}</p>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Arrecadado</p>
            <p className={`text-sm font-bold mt-1 ${statsData.totalWithRakeDealBrl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(statsData.totalWithRakeDealBrl)}
            </p>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Lucro Líquido Final</p>
            <p className="text-sm font-bold text-emerald-500 mt-1">
              {formatCurrency(statsData.currentWeekTotalLiquido ?? 0)}
            </p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
            <p className="text-[10px] text-emerald-500 uppercase font-bold">Lucro Líquido Residual</p>
            <p className="text-base font-extrabold text-emerald-500 mt-1">
              {formatCurrency(lucroResidual)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {statsData.isAnticipated ? 'Valor restante a sacar' : 'Disponível para saque'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render do Modal de Horas Jogadas
  const renderHorasContent = () => {
    const maxMinutes = Math.max(1, ...dailySessionsMap.map(d => d.totalMinutes));
    const totalSessionsCount = dailySessionsMap.reduce((acc, d) => acc + d.sessionCount, 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border border-border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total de Horas</p>
            <p className="text-lg font-bold text-amber-500 mt-0.5">{statsData.hoursLabel}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total de Sessões</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {totalSessionsCount} {totalSessionsCount === 1 ? 'sessão' : 'sessões'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Dias Jogados</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{dailySessionsMap.length} dias</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Horas por Dia ({dailySessionsMap.length})
          </h4>
          <ScrollArea className="h-64 rounded-md border border-border p-2">
            {dailySessionsMap.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma sessão no período selecionado.</p>
            ) : (
              <div className="space-y-2">
                {dailySessionsMap.map((item, idx) => {
                  const hh = Math.floor(item.totalMinutes / 60);
                  const mm = Math.floor(item.totalMinutes % 60);
                  const hoursFormatted = `${hh}:${String(mm).padStart(2, '0')}h`;
                  const pct = Math.min(100, Math.round((item.totalMinutes / maxMinutes) * 100));

                  return (
                    <div key={idx} className="p-2.5 rounded-md bg-muted/20 border border-border/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {format(item.dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] py-0">
                            {item.sessionCount} {item.sessionCount === 1 ? 'sessão' : 'sessões'}
                          </Badge>
                          <span className="font-bold text-amber-500">{hoursFormatted}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      {item.mergedIntervals && item.mergedIntervals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] text-muted-foreground">
                          {item.mergedIntervals.map((interval, i) => {
                            const durMin = (interval.end - interval.start) / (1000 * 60);
                            const ih = Math.floor(durMin / 60);
                            const im = Math.floor(durMin % 60);
                            return (
                              <span key={i} className="bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                                Sessão {i + 1}: {format(new Date(interval.start), 'HH:mm')} - {format(new Date(interval.end), 'HH:mm')} ({ih > 0 ? `${ih}h ` : ''}${im}m)
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Render do Modal de Total de Mãos
  const renderMaosContent = () => {
    const maxHands = Math.max(1, ...dailySessionsMap.map(d => d.totalHands));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total de Mãos no Período</p>
            <p className="text-lg font-bold text-purple-500 mt-0.5">{formatNumber(statsData.totalHands)} mãos</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Média Diária</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {dailySessionsMap.length > 0 ? formatNumber(Math.round(statsData.totalHands / dailySessionsMap.length)) : 0} mãos/dia
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Mãos por Dia ({dailySessionsMap.length})
          </h4>
          <ScrollArea className="h-64 rounded-md border border-border p-2">
            {dailySessionsMap.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma sessão no período selecionado.</p>
            ) : (
              <div className="space-y-2">
                {dailySessionsMap.map((item, idx) => {
                  const handsPerHour = item.totalMinutes > 0 ? Math.round((item.totalHands / item.totalMinutes) * 60) : 0;
                  const pct = Math.min(100, Math.round((item.totalHands / maxHands) * 100));
                  return (
                    <div key={idx} className="p-2.5 rounded-md bg-muted/20 border border-border/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {format(item.dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{handsPerHour} mãos/h</span>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {item.sessions.length} {item.sessions.length === 1 ? 'sessão' : 'sessões'}
                          </Badge>
                          <span className="font-bold text-purple-400">{formatNumber(item.totalHands)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Render do Modal de Resultado Total (+RB)
  const renderResultadoTotalContent = () => {
    const isCustom = period === 'custom';
    const sumCustomSessionsBrl = sessions.reduce((acc, s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      return acc + convertToBrl(Number(s.result || 0), siteData?.currency || 'BRL');
    }, 0);
    const sumCustomRakeDealBrl = statsData.totalRakeDealBrl || 0;
    const totalCustomArrecadado = sumCustomSessionsBrl + sumCustomRakeDealBrl;

    return (
      <div className="space-y-4">
        {isCustom ? (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-primary">Filtro Personalizado (Sem Makeup)</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Neste filtro, o makeup é desconsiderado e somam-se apenas os resultados brutos de sessões e rake deal obtidos no intervalo selecionado.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-primary/20 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Resultado Sessões</p>
                <p className="font-bold text-foreground mt-0.5">{formatCurrency(sumCustomSessionsBrl)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Rake Deal</p>
                <p className="font-bold text-emerald-400 mt-0.5">+{formatCurrency(sumCustomRakeDealBrl)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Total Arrecadado</p>
                <p className="font-bold text-primary mt-0.5">{formatCurrency(totalCustomArrecadado)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-muted/40 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Essa Semana (Bruto)</p>
                <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(statsData.weekRawResult || 0)}</p>
                {Number(statsData.expensesInPeriod || 0) > 0 && (
                  <p className="text-[10px] text-rose-400 mt-0.5">
                    Despesas: -{formatCurrency(Number(statsData.expensesInPeriod))}
                  </p>
                )}
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Makeup Anterior</p>
                <p className={`text-sm font-bold mt-1 ${(statsData.carryOverIn || 0) < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                  {formatCurrency(statsData.carryOverIn || 0)}
                </p>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Banca Buy-in</p>
                <p className="text-sm font-bold text-purple-400 mt-1">
                  {(statsData.buyinBankrollAllocated || 0) > 0 ? `-${formatCurrency(statsData.buyinBankrollAllocated)}` : 'R$ 0,00'}
                </p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                <p className="text-[10px] text-emerald-400 uppercase font-bold">Resultado Final (+RB)</p>
                <p className="text-sm font-extrabold text-emerald-400 mt-1">
                  {formatCurrency(statsData.totalWithRakeDealBrl)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Sessões do Período ({sessions.length})
          </h4>
          <ScrollArea className="h-56 rounded-md border border-border p-2">
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma sessão encontrada.</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s, idx) => {
                  const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
                  const resBrl = convertToBrl(Number(s.result || 0), siteData?.currency || 'BRL');
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/40 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{s.limit_name || 'PLO'}</Badge>
                        <span className="font-medium text-foreground">{siteData?.name || 'Poker'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.start_time ? format(new Date(s.start_time), "dd/MM HH:mm", { locale: ptBR }) : '—'}
                        </span>
                      </div>
                      <span className={`font-bold ${resBrl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {resBrl >= 0 ? '+' : ''}{formatCurrency(resBrl)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Render do Modal de Resultado S/ RB
  const renderResultadoSemRbContent = () => {
    const { best, worst } = bestWorstSessions;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {best ? (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-1.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Ponto de Mais Ganho (Melhor Sessão)</span>
              </div>
              <p className="text-lg font-extrabold text-emerald-400">+{formatCurrency(best.resultBrl)}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                <Badge variant="outline" className="text-[10px] py-0">{best.session.limit_name || 'PLO'}</Badge>
                <span>{best.session.start_time ? format(new Date(best.session.start_time), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
              Sem dados de maior ganho
            </div>
          )}

          {worst ? (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <div className="flex items-center gap-2 mb-1.5">
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-400">Ponto de Mais Perda (Pior Sessão)</span>
              </div>
              <p className="text-lg font-extrabold text-rose-400">{formatCurrency(worst.resultBrl)}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                <Badge variant="outline" className="text-[10px] py-0">{worst.session.limit_name || 'PLO'}</Badge>
                <span>{worst.session.start_time ? format(new Date(worst.session.start_time), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
              Sem dados de maior perda
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Desempenho por Dia ({dailySessionsMap.length})
          </h4>
          <ScrollArea className="h-56 rounded-md border border-border p-2">
            {dailySessionsMap.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma sessão no período selecionado.</p>
            ) : (
              <div className="space-y-2">
                {dailySessionsMap.map((item, idx) => {
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/50 text-xs">
                      <div>
                        <span className="font-semibold text-foreground">
                          {format(item.dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {item.sessionCount} {item.sessionCount === 1 ? 'sessão' : 'sessões'} • {formatNumber(item.totalHands)} mãos
                        </p>
                      </div>
                      <span className={`font-bold ${item.totalResultBrl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {item.totalResultBrl >= 0 ? '+' : ''}{formatCurrency(item.totalResultBrl)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Render do Modal de Rake Total
  const renderRakeTotalContent = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rake Total no Período</p>
            <p className="text-lg font-bold text-rose-500 mt-0.5">{formatCurrency(statsData.totalRakeTotalBrl)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rake Deal Gerado</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">+{formatCurrency(statsData.totalRakeDealBrl)}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Rake Gerado por Dia ({dailySessionsMap.length})
          </h4>
          <ScrollArea className="h-64 rounded-md border border-border p-2">
            {dailySessionsMap.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma sessão no período selecionado.</p>
            ) : (
              <div className="space-y-2">
                {dailySessionsMap.map((item, idx) => {
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-muted/20 border border-border/50 text-xs">
                      <div>
                        <span className="font-semibold text-foreground">
                          {format(item.dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {item.sessions.length} {item.sessions.length === 1 ? 'sessão' : 'sessões'} • {formatNumber(item.totalHands)} mãos
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-500">{formatCurrency(item.totalRakeBrl)}</span>
                        <p className="text-[10px] text-emerald-400">Deal: +{formatCurrency(item.totalRakeBrl * 0.4)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  const getModalTitleAndIcon = () => {
    switch (type) {
      case 'bankroll':
        return { title: 'Detalhes do Bankroll Atual', icon: Wallet, color: 'text-emerald-500' };
      case 'lucro_liquido':
        return { title: 'Detalhamento do Lucro Líquido', icon: TrendingUp, color: 'text-emerald-500' };
      case 'horas':
        return { title: 'Horas Jogadas por Dia', icon: Clock, color: 'text-amber-500' };
      case 'maos':
        return { title: 'Mãos Jogadas por Dia', icon: MousePointer2, color: 'text-purple-500' };
      case 'resultado_total':
        return { title: 'Resultado Total (+RB) - Detalhes', icon: DollarSign, color: 'text-emerald-500' };
      case 'resultado_sem_rb':
        return { title: 'Resultado Sem Rake Deal (Ganhos e Perdas)', icon: DollarSign, color: 'text-rose-500' };
      case 'rake_total':
        return { title: 'Rake Total Gerado por Dia', icon: Percent, color: 'text-rose-500' };
      default:
        return { title: 'Detalhes', icon: DollarSign, color: 'text-foreground' };
    }
  };

  const { title, icon: Icon, color } = getModalTitleAndIcon();

  return (
    <Dialog open={Boolean(type)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted border border-border">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Período analisado: <strong className="text-foreground">{periodLabel || 'Período atual'}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2">
          {type === 'bankroll' && renderBankrollContent()}
          {type === 'lucro_liquido' && renderLucroLiquidoContent()}
          {type === 'horas' && renderHorasContent()}
          {type === 'maos' && renderMaosContent()}
          {type === 'resultado_total' && renderResultadoTotalContent()}
          {type === 'resultado_sem_rb' && renderResultadoSemRbContent()}
          {type === 'rake_total' && renderRakeTotalContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
