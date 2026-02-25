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
  initialData?: any;
}

const SessionModal = ({ isOpen, onClose, onSave, initialData }: SessionModalProps) => {
  const sites = [
    { id: 1, name: 'PokerStars', currency: 'USD' },
    { id: 2, name: 'GG Poker', currency: 'USD' },
    { id: 3, name: 'Bodog', currency: 'BRL' },
  ];

  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [manualData, setManualData] = useState({
    site: '',
    limit: '',
    hands: '',
    result: '',
    rake: '',
    date: new Date().toLocaleDateString('pt-BR')
  });

  useEffect(() => {
    if (initialData) {
      setManualData({
        site: initialData.site,
        limit: initialData.limit,
        hands: initialData.hands.toString(),
        result: initialData.result.toString(),
        rake: initialData.rake.toString(),
        date: initialData.date
      });
    } else {
      setManualData({
        site: '',
        limit: '',
        hands: '',
        result: '',
        rake: '',
        date: new Date().toLocaleDateString('pt-BR')
      });
    }
  }, [initialData, isOpen]);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const site = sites.find(s => s.id === Number(selectedSiteId));
    
    const data = {
      type: 'active',
      site: site?.name,
      limit: formData.get('limit'),
      startTime: new Date().toISOString(),
      startHands: 145200,
      startBalance: 2500.50,
      date: new Date().toLocaleDateString('pt-BR'),
    };
    onSave(data);
    showSuccess("Sessão iniciada!");
    onClose();
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...manualData,
      hands: Number(manualData.hands),
      result: Number(manualData.result),
      rake: Number(manualData.rake),
      type: 'completed'
    };
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {initialData ? 'Editar Sessão' : 'Registrar Sessão'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={initialData ? "manual" : "start"} className="w-full">
          {!initialData && (
            <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
              <TabsTrigger value="start" className="data-[state=active]:bg-emerald-600">Iniciar Agora</TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-blue-600">Manual</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="start" className="mt-6">
            <form onSubmit={handleStartSession} className="space-y-4">
              <div className="space-y-2">
                <Label>Site / Sala</Label>
                <Select onValueChange={setSelectedSiteId} required>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecione o site" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {sites.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
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
            <form onSubmit={handleManualSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Input 
                    value={manualData.site} 
                    onChange={e => setManualData({...manualData, site: e.target.value})}
                    className="bg-slate-950 border-slate-800" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite</Label>
                  <Input 
                    value={manualData.limit} 
                    onChange={e => setManualData({...manualData, limit: e.target.value})}
                    className="bg-slate-950 border-slate-800" 
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mãos</Label>
                  <Input 
                    type="number"
                    value={manualData.hands} 
                    onChange={e => setManualData({...manualData, hands: e.target.value})}
                    className="bg-slate-950 border-slate-800" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resultado ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={manualData.result} 
                    onChange={e => setManualData({...manualData, result: e.target.value})}
                    className="bg-slate-950 border-slate-800" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rake ($)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={manualData.rake} 
                  onChange={e => setManualData({...manualData, rake: e.target.value})}
                  className="bg-slate-950 border-slate-800" 
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 gap-2">
                <Save className="w-4 h-4" /> {initialData ? 'Salvar Alterações' : 'Salvar Registro'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SessionModal;