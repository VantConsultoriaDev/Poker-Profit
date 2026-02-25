"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
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
import { Play, Save } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: any) => void;
}

const SessionModal = ({ isOpen, onClose, onSave }: SessionModalProps) => {
  // Mock de dados que viriam do perfil/banco
  const sites = [
    { id: 1, name: 'PokerStars', currency: 'USD' },
    { id: 2, name: 'GG Poker', currency: 'USD' },
    { id: 3, name: 'Bodog', currency: 'BRL' },
  ];

  const accounts = [
    { id: 1, siteId: 1, username: 'vini_poker' },
    { id: 2, siteId: 2, username: 'vini_gg' },
    { id: 3, siteId: 3, username: 'vini_bodog' },
  ];

  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (selectedSiteId) {
      setAvailableAccounts(accounts.filter(a => a.siteId === Number(selectedSiteId)));
    } else {
      setAvailableAccounts([]);
    }
  }, [selectedSiteId]);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const site = sites.find(s => s.id === Number(selectedSiteId));
    
    const data = {
      type: 'active',
      site: site?.name,
      currency: site?.currency,
      account: formData.get('account'),
      limit: formData.get('limit'),
      startTime: new Date().toISOString(),
      startHands: 145200, // Mock
      startBalance: 2500.50, // Mock
      date: new Date().toLocaleDateString('pt-BR'),
    };
    onSave(data);
    showSuccess("Sessão iniciada!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Registrar Sessão</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="start" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
            <TabsTrigger value="start" className="data-[state=active]:bg-emerald-600">Iniciar Agora</TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-blue-600">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="mt-6">
            <form onSubmit={handleStartSession} className="space-y-4">
              <div className="space-y-2">
                <Label>Site / Sala</Label>
                <Select onValueChange={setSelectedSiteId} required>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecione o site" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {sites.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.currency})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta / Nickname</Label>
                <Select name="account" required disabled={!selectedSiteId}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {availableAccounts.map(a => <SelectItem key={a.id} value={a.username}>{a.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Limite</Label>
                <Select name="limit" required>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecione o limite" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="NL10">NL10</SelectItem>
                    <SelectItem value="NL25">NL25</SelectItem>
                    <SelectItem value="NL50">NL50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 gap-2">
                <Play className="w-4 h-4 fill-current" /> Começar Jogatina
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            {/* Conteúdo manual similar, mas com inputs de valores */}
            <p className="text-center text-slate-500 text-sm py-8">Formulário manual simplificado para este exemplo.</p>
            <Button className="w-full bg-blue-600 hover:bg-blue-500 gap-2">
              <Save className="w-4 h-4" /> Salvar Registro
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SessionModal;