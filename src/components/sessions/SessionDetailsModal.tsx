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

  const sessions = session.sessions || [session];
  const firstSession = sessions[0];
  const totalResultBrl = sessions.reduce((total: number, accountSession: any) => {
    const siteData = Array.isArray(accountSession.sites) ? accountSession.sites[0] : accountSession.sites;
    return total + convertToBrl(Number(accountSession.result || 0), siteData?.currency || 'BRL');
  }, 0);
  const totalHands = sessions.reduce((total: number, accountSession: any) => (
    total + Number(accountSession.end_hands || 0) - Number(accountSession.start_hands || 0)
  ), 0);

  const titleDate = firstSession.start_time ? new Date(firstSession.start_time).toLocaleDateString('pt-BR') : '-';
  const titleTime = `${formatTime24(firstSession.start_time)} → ${formatTime24(firstSession.end_time)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Sessão de {titleDate} • {titleTime}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{sessions.length} {sessions.length === 1 ? 'conta' : 'contas'}</Badge>
          <Badge variant="outline">Mãos: {formatNumber(totalHands)}</Badge>
          <Badge variant="outline" className={cn(totalResultBrl >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
            Resultado: {formatCurrency(totalResultBrl)}
          </Badge>
          <Badge variant="outline">Duração: {calculateDuration(firstSession.start_time, firstSession.end_time)}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((accountSession: any, index: number) => {
            const siteData = Array.isArray(accountSession.sites) ? accountSession.sites[0] : accountSession.sites;
            const currency = siteData?.currency || 'BRL';
            const hands = Number(accountSession.end_hands || 0) - Number(accountSession.start_hands || 0);
            const resultBrl = convertToBrl(Number(accountSession.result || 0), currency);

            return (
              <div key={accountSession.id || index} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">Conta {index + 1}</h3>
                  <Badge variant="outline">{accountSession.sites?.name || '—'}</Badge>
                  <Badge variant="outline">{accountSession.limit_name || '—'}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {accountSession.site_accounts?.nickname || '—'}
                  {accountSession.site_accounts?.account_external_id ? ` (${accountSession.site_accounts.account_external_id})` : ''}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-xs text-muted-foreground uppercase">Mãos início</div><div className="font-bold">{formatNumber(accountSession.start_hands)}</div></div>
                  <div><div className="text-xs text-muted-foreground uppercase">Mãos fim</div><div className="font-bold">{formatNumber(accountSession.end_hands)}</div></div>
                  <div><div className="text-xs text-muted-foreground uppercase">Mãos jogadas</div><div className="font-bold text-emerald-500">{formatNumber(hands)}</div></div>
                </div>

                <div className="border-t border-border/50 pt-4 grid grid-cols-2 gap-4">
                  <div><div className="text-xs text-muted-foreground uppercase">Saldo início</div><div className="font-bold">{formatCurrency(accountSession.start_balance, currency)}</div></div>
                  <div><div className="text-xs text-muted-foreground uppercase">Saldo fim</div><div className="font-bold">{formatCurrency(accountSession.end_balance, currency)}</div></div>
                </div>
                <div className={cn('border-t border-border/50 pt-4 text-lg font-bold', resultBrl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                  Resultado: {formatCurrency(accountSession.result || 0, currency)}
                  <div className="text-xs font-normal text-muted-foreground">BRL: {formatCurrency(resultBrl)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsModal;
