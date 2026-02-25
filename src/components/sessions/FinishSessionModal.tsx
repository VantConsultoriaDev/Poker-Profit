"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface FinishSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onFinish: (data: any) => void;
}

const FinishSessionModal = ({ isOpen, onClose, session, onFinish }: FinishSessionModalProps) => {
  if (!session) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const endBalance = Number(formData.get('endBalance'));
    const endHands = Number(formData.get('endHands'));
    const rake = Number(formData.get('rake'));
    
    const finishedData = {
      ...session,
      type: 'completed',
      endTime: new Date().toISOString(),
      end_hands: endHands,
      end_balance: endBalance,
      result: endBalance - (session.start_balance || 0),
      rake: rake,
    };

    onFinish(finishedData);
    showSuccess("Sessão finalizada e salva!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Finalizar Sessão</DialogTitle>
          <p className="text-sm text-slate-400">{session.sites?.name} - {session.limit_name}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Mãos Início</p>
              <p className="text-sm font-bold text-white">{session.start_hands?.toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Saldo Início</p>
              <p className="text-sm font-bold text-white">${session.start_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mãos Final</Label>
            <Input name="endHands" type="number" required className="bg-slate-950 border-slate-800" />
          </div>

          <div className="space-y-2">
            <Label>Saldo Final ($)</Label>
            <Input name="endBalance" type="number" step="0.01" required className="bg-slate-950 border-slate-800" />
          </div>

          <div className="space-y-2">
            <Label>Rake Total ($)</Label>
            <Input name="rake" type="number" step="0.01" required className="bg-slate-950 border-slate-800" />
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Finalizar e Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FinishSessionModal;