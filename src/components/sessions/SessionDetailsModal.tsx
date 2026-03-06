"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Clock, DollarSign, Percent, TrendingUp } from 'lucide-react';

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
}

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

const SessionDetailsModal = ({ isOpen, onClose, session }: SessionDetailsModalProps) => {
  const { convertToBrl } = useCurrency();

  if (!session) return null;

  const siteData = Array.isArray(session.sites) ? session.sites[0] : session.sites;
  const currency = siteData?.currency || 'BRL';
  const handsStd = (Number(session.end_hands || 0) - Number(session.start_hands || 0));
  const handsBp = (Number(session.end_hands_bp || 0) - Number(session.start_hands_bp || 0));
  const hands = handsStd + handsBp;
  const resultBrl = convertToBrl(Number(session.result || 0), currency);

  const titleDate = session.start_time ? new Date(session.start_time).toLocaleDateString('pt-BR') : '-';
  const titleTime = `${formatTime24(session.start_time)} → ${formatTime24(session.end_time)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {titleDate} • {titleTime}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{session.sites?.name || '—'}</Badge>
          <Badge variant="outline">{session.site_accounts?.nickname || '—'}</Badge>
          <Badge variant="outline">{session.limit_name || '—'}</Badge>
          <Badge variant="outline">Duração: {calculateDuration(session.start_time, session.end_time)}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="w-4 h-4" /> Mãos
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Início (Std)</div>
                <div className="text-lg font-bold">{formatNumber(session.start_hands)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Fim (Std)</div>
                <div className="text-lg font-bold">{formatNumber(session.end_hands)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Início (BP)</div>
                <div className="text-lg font-bold">{formatNumber(session.start_hands_bp)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Fim (BP)</div>
                <div className="text-lg font-bold">{formatNumber(session.end_hands_bp)}</div>
              </div>
            </div>
            <div className="pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground uppercase">Total (Std + BP)</div>
              <div className="text-lg font-bold text-emerald-500">{formatNumber(hands)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="w-4 h-4" /> Saldo ({currency})
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Início</div>
                <div className="text-lg font-bold">{formatCurrency(session.start_balance, currency)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Fim</div>
                <div className="text-lg font-bold">{formatCurrency(session.end_balance, currency)}</div>
              </div>
            </div>
            <div className="pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground uppercase">Resultado</div>
              <div className={cn('text-lg font-bold', (session.result || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                {formatCurrency(session.result || 0, currency)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Percent className="w-4 h-4" /> Rake e Ganhos
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase">Rake Pago ({currency})</div>
              <div className="text-lg font-bold text-rose-500">{formatCurrency(session.rake || 0, currency)}</div>
            </div>
            <div className="pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground uppercase">Resultado em BRL</div>
              <div className={cn('text-lg font-bold', resultBrl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                {formatCurrency(resultBrl)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="w-4 h-4" /> Informações Extras
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase">Horário</div>
              <div className="text-lg font-bold">{titleTime}</div>
            </div>
            <div className="pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground uppercase">Duração</div>
              <div className="text-lg font-bold">{calculateDuration(session.start_time, session.end_time)}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsModal;
