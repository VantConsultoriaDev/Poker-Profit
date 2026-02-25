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
import { Play, Save, Loader2 } from 'lucide-react';
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
  const [fetchingHistory, setFetchingHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    site_id: '',
    account_id: '',
    limit: '',
    start_hands: '',
    end_hands: '',
    start_balance: '',
    end_balance: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: new Date().toTimeString().slice(0, 5),
    end_time: new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [sitesRes, accountsRes, profileRes, lastSessionRes] = await Promise.all([
        supabase.from('sites').select('*').order('name'),
        supabase.from('site_accounts').select('*'),
        supabase.from('profiles').select('default_limit').eq('id', user.id).single(),
        supabase.from('sessions').select('site_id, account_id, limit_name').order('created_at', { ascending: false }).limit(1).single()
      ]);

      setSites(sitesRes.data || []);
      setAccounts(accountsRes.data || []);

      setFormData(prev => ({
        ...prev,
        limit: profileRes.data?.default_limit || lastSessionRes.data?.limit_name || '',
        site_id: lastSessionRes.data?.site_id || '',
        account_id: lastSessionRes.data?.account_id || ''
      }));

      setLoading(false);
    };

    if (isOpen) fetchInitialData();
  }, [isOpen]);

  useEffect(() => {
    const fetchAccountHistory = async () => {
      if (!formData.account_id || !isOpen) return;
      
      setFetchingHistory(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('end_hands, end_balance')
        .eq('account_id', formData.account_id)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          start_hands: data.end_hands?.toString() || '',
          start_balance: data.end_balance?.toString() || ''
        }));
      }
      setFetchingHistory(false);
    };

    fetchAccountHistory();
  }, [formData.account_id, isOpen]);

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

  const inputClasses = "bg-background border-input text-foreground focus:ring-emerald-500 w-full";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Registrar Sessão</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="start" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
            <TabsTrigger value="start">Iniciar Agora</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="mt-6 space-y-4">
            <form onSubmit={handleStartSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select value={formData.site_id} onValueChange={v => setFormData({...formData, site_id: v})} required>
                    <SelectTrigger className={inputClasses}><SelectValue placeholder="Site" /></SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={formData.account_id} onValueChange={v => setFormData({...formData, account_id: v})} required disabled={!formData.site_id}>
                    <SelectTrigger className={inputClasses}><SelectValue placeholder="Conta" /></SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Limite</Label>
                <Select value={formData.limit} onValueChange={v => setFormData({...formData, limit: v})} required>
                  <SelectTrigger className={inputClasses}><SelectValue placeholder="Selecione o limite" /></SelectTrigger>
                  <SelectContent>
                    {PLO_LIMITS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Mãos Início</p>
                  <p className="text-sm font-medium text-foreground">{fetchingHistory ? '...' : Number(formData.start_hands).toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Início</p>
                  <p className="text-sm font-medium text-foreground">{fetchingHistory ? '...' : `$ ${Number(formData.start_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p>
                </div>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                <Play className="w-4 h-4 fill-current" /> Começar Jogatina
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <form onSubmit={handleManualSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select value={formData.site_id} onValueChange={v => setFormData({...formData, site_id: v})} required>
                    <SelectTrigger className={inputClasses}><SelectValue placeholder="Site" /></SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={formData.account_id} onValueChange={v => setFormData({...formData, account_id: v})} required disabled={!formData.site_id}>
                    <SelectTrigger className={inputClasses}>
                      <div className="flex items-center gap-2">
                        <SelectValue placeholder="Conta" />
                        {fetchingHistory && <Loader2 className="w-3 h-3 animate-spin" />}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Limite</Label>
                <Select value={formData.limit} onValueChange={v => setFormData({...formData, limit: v})} required>
                  <SelectTrigger className={inputClasses}><SelectValue placeholder="Selecione o limite" /></SelectTrigger>
                  <SelectContent>
                    {PLO_LIMITS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 h-5">
                    Mãos Início {fetchingHistory && <Loader2 className="w-3 h-3 animate-spin" />}
                  </Label>
                  <Input type="number" value={formData.start_hands} onChange={e => setFormData({...formData, start_hands: e.target.value})} className={inputClasses} required />
                </div>
                <div className="space-y-2">
                  <Label className="h-5 flex items-center">Mãos Fim</Label>
                  <Input type="number" value={formData.end_hands} onChange={e => setFormData({...formData, end_hands: e.target.value})} className={inputClasses} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 h-5">
                    Saldo Início ($) {fetchingHistory && <Loader2 className="w-3 h-3 animate-spin" />}
                  </Label>
                  <Input type="number" step="0.01" value={formData.start_balance} onChange={e => setFormData({...formData, start_balance: e.target.value})} className={inputClasses} required />
                </div>
                <div className="space-y-2">
                  <Label className="h-5 flex items-center">Saldo Fim ($)</Label>
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

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2">
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