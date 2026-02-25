"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Save, Clock, MousePointer2, DollarSign } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: any) => void;
}

const SessionModal = ({ isOpen, onClose, onSave }: SessionModalProps) => {
  const [mode, setMode] = useState<'start' | 'manual'>('start');
  
  // Mock de dados da última sessão para preenchimento automático
  const lastSessionMock = {
    hands: 145200,
    balance: 2500.50
  };

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      type: 'active',
      site: formData.get('site'),
      limit: formData.get('limit'),
      startTime: new Date().toISOString(),
      startHands: lastSessionMock.hands,
      startBalance: lastSessionMock.balance,
      date: new Date().toLocaleDateString('pt-BR'),
    };
    onSave(data);
    showSuccess("Sessão iniciada com sucesso!");
    onClose();
  };

  const handleManualSession = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const startBalance = Number(formData.get('startBalance'));
    const endBalance = Number(formData.get('endBalance'));
    
    const data = {
      type: 'completed',
      site: formData.get('site'),
      limit: formData.get('limit'),
      date: formData.get('date'),
      hands: Number(formData.get('endHands')) - Number(formData.get('startHands')),
      result: endBalance - startBalance,
      rake: Number(formData.get('rake')),
    };
    onSave(data);
    showSuccess("Sessão manual registrada!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Registrar Sessão</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="start" onValueChange={(v) => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
            <TabsTrigger value="start" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              Iniciar Agora
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="mt-6">
            <form onSubmit={handleStartSession} className="space-y-4">
              <div className="space-y-2">
                <Label>Site / Sala</Label>
                <Select name="site" required>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecione o site" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="PokerStars">PokerStars</SelectItem>
                    <SelectItem value="GG Poker">GG Poker</SelectItem>
                    <SelectItem value="888Poker">888Poker</SelectItem>
                    <SelectItem value="Bodog">Bodog</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Limite (Big Blind)</Label>
                <Select name="limit" required>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecione o limite" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="NL10">NL10 ($0.10)</SelectItem>
                    <SelectItem value="NL25">NL25 ($0.25)</SelectItem>
                    <SelectItem value="NL50">NL50 ($0.50)</SelectItem>
                    <SelectItem value="NL100">NL100 ($1.00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-emerald-400 uppercase">Dados Automáticos</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Mãos Início</p>
                    <p className="text-sm font-bold text-white">{lastSessionMock.hands.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Saldo Início</p>
                    <p className="text-sm font-bold text-white">${lastSessionMock.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                <Play className="w-4 h-4 fill-current" />
                Começar Jogatina
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <form onSubmit={handleManualSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input name="date" type="date" required className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Input name="site" placeholder="Ex: PokerStars" required className="bg-slate-950 border-slate-800" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Limite</Label>
                <Input name="limit" placeholder="Ex: NL50" required className="bg-slate-950 border-slate-800" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mãos Início</Label>
                  <Input name="startHands" type="number" required className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label>Mãos Final</Label>
                  <Input name="endHands" type="number" required className="bg-slate-950 border-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Saldo Início ($)</Label>
                  <Input name="startBalance" type="number" step="0.01" required className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Final ($)</Label>
                  <Input name="endBalance" type="number" step="0.01" required className="bg-slate-950 border-slate-800" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rake Total ($)</Label>
                <Input name="rake" type="number" step="0.01" required className="bg-slate-950 border-slate-800" />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2">
                <Save className="w-4 h-4" />
                Salvar Registro
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SessionModal;