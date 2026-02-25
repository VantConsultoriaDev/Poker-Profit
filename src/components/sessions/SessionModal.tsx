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
import { supabase } from '@/integrations/supabase/client';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: any) => void;
  initialData?: any;
}

const PLO_LIMITS = [
  "PLO10", "PLO20", "PLO40", "PLO50", "PLO100", "PLO200", "PLO400", "PLO600", "PLO1000"
];

const SessionModal = ({ isOpen, onClose, onSave, initialData }: SessionModalProps) => {
  const [sites, setSites] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    site_id: '',
    account_id: '',
    limit: '',
    start_hands: '',
    end_hands: '',
    start_balance: '',
    end_balance: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '12:00',
    end_time: '14:00'
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: sitesData } = await supabase.from('sites').select('*');
      const { data: accountsData } = await supabase.from('site_accounts').select('*');
      setSites(sitesData || []);
      setAccounts(accountsData || []);
      setLoading(false);
    };

    if (isOpen) fetchData();
  }, [isOpen]);

  const filteredAccounts = accounts.filter(a => a.site_id === formData.site_id);

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`).toISOString();
    const endDateTime = new Date(`${formData.start_date}T${formData.end_time}`).toISOString();
    
    const result = Number(formData.end_balance) - Number(formData.start_balance);
    const hands = Number(formData.end_hands) - Number(formData.start_hands);

    onSave({
      site_id: formData.site_id,
      account_id: formData.account_id,
      limit: formData.limit,
      start_hands: Number(formData.start_hands),
      end_hands: Number(formData.end_hands),
      start_balance: Number(formData.start_balance),
      end_balance: Number(formData.end_balance),
      startTime: startDateTime,
      endTime: endDateTime,
      result,
      hands,
      type: 'completed'
    });
    onClose();
  };

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type: 'active',
      site_id: formData.site_id,
      account_id: formData.account_id,
      limit: formData.limit,
      startTime: new Date().toISOString(),
      startHands: Number(formData.start_hands) || 0,
      startBalance: Number(formData.start_balance) || 0,
    });
    onClose();
  };

  const inputClasses = "bg-slate-950 border-slate-800 text-white";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Registrar Sessão</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="start" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
            <TabsTrigger value="start">Iniciar Agora</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="mt-6 space-y-4">
            <form onSubmit={handleStartSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select onValueChange={v => setFormData({...formData, site_id: v})} required>
                    <SelectTrigger className={inputClasses}><SelectValue placeholder="Site" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select onValueChange={v => setFormData({...formData, account_id: v})} required disabled={!formData.site_id}>
                    <SelectTrigger className={inputClasses}><SelectValue placeholder="Conta" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {filteredAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Limite</Label>
                <Select onValueChange={v => setFormData({...formData, limit: v})} required>
                  <SelectTrigger className={inputClasses}><SelectValue placeholder="Selecione o limite" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {PLO_LIMITS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
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
                  <Select onValueChange={v => setFormData({...formData, site_id: v})} required>
                    <SelectTrigger className={inputClasses}><SelectValue placeholder="Site" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select onValueChange={v => setFormData({...formData, account_id: v})} required disabled={!formData.site_id}>
                    <SelectTrigger className={inputClasses}><SelectValue placeholder="Conta" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {filteredAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Limite</Label>
                <Select onValueChange={v => setFormData({...formData, limit: v})} required>
                  <SelectTrigger className={inputClasses}><SelectValue placeholder="Selecione o limite" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {PLO_LIMITS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mãos Iniciais</Label>
                  <Input type="number" value={formData.start_hands} onChange={e => setFormData({...formData, start_hands: e.target.value})} className={inputClasses} required />
                </div>
                <div className="space-y-2">
                  <Label>Mãos Finais</Label>
                  <Input type="number" value={formData.end_hands} onChange={e => setFormData({...formData, end_hands: e.target.value})} className={inputClasses} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Saldo Inicial ($)</Label>
                  <Input type="number" step="0.01" value={formData.start_balance} onChange={e => setFormData({...formData, start_balance: e.target.value})} className={inputClasses} required />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Final ($)</Label>
                  <Input type="number" step="0.01" value={formData.end_balance} onChange={e => setFormData({...formData, end_balance: e.target.value})} className={inputClasses} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className={inputClasses} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Início</Label>
                  <Input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className={inputClasses} required />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className={inputClasses} required />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 gap-2">
                <Save className="w-4 h-4" /> Salvar Registro
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SessionModal;