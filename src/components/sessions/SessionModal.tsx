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
import { Play, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: any) => void;
  initialData?: any;
}

const PLO_LIMITS = [
  "PLO20", "PLO40", "PLO60", "PLO80", "PLO100", "PLO200", "PLO400", "PLO600", "PLO1000"
];

const SessionModal = ({ isOpen, onClose, onSave, initialData }: SessionModalProps) => {
  const [sites, setSites] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoadingStatic, setIsLoadingStatic] = useState(true);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('start');
  const [tables, setTables] = useState<any[]>([]);
  const [tablesStart, setTablesStart] = useState<any[]>([]);
  const [defaultLimit, setDefaultLimit] = useState<string>('PLO20');
  
  const formatTime24 = (date: Date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  const formatDateBR = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear());
    return `${d}/${m}/${y}`;
  };
  const parseDateBRToISO = (br: string) => {
    const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    return `${m[3]}-${m[2]}-${m[1]}`;
  };
  const normalizeDateBRInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let dd = digits.slice(0, 2);
    let mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    if (dd.length === 2) {
      const d = Math.max(1, Math.min(31, parseInt(dd, 10) || 0));
      dd = String(d).padStart(2, '0');
    }
    if (mm.length === 2) {
      const m = Math.max(1, Math.min(12, parseInt(mm, 10) || 0));
      mm = String(m).padStart(2, '0');
    }
    const parts = [];
    if (dd) parts.push(dd);
    if (mm) parts.push(mm);
    if (yyyy) parts.push(yyyy);
    return parts.join('/');
  };
  const sanitizeCurrencyInput = (raw: string) => {
    return raw.replace(/[^\d.,]/g, '');
  };
  const parseCurrencyBR = (raw: string) => {
    if (!raw) return 0;
    const cleaned = raw.replace(/\s/g, '').replace(/[Rr]\$?/g, '');
    const parts = cleaned.split(',');
    if (parts.length > 1) {
      const integer = parts[0].replace(/\./g, '');
      const decimal = parts[1].slice(0, 2);
      return Number(`${integer}.${decimal}`);
    }
    // fallback for dot decimals
    const dotParts = cleaned.split('.');
    if (dotParts.length > 1) {
      const integer = dotParts.slice(0, -1).join('').replace(/\D/g, '');
      const decimal = dotParts[dotParts.length - 1].slice(0, 2);
      return Number(`${integer}.${decimal}`);
    }
    return Number(cleaned.replace(/\D/g, '')) || 0;
  };
  
  const parseTimeTo24 = (str: string) => {
    if (!str) return '';
    const trimmed = str.trim();
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hh = parseInt(ampmMatch[1], 10);
      const mm = ampmMatch[2];
      const ss = ampmMatch[3] || '00';
      const period = ampmMatch[4].toUpperCase();
      if (period === 'PM' && hh < 12) hh += 12;
      if (period === 'AM' && hh === 12) hh = 0;
      const hhStr = hh === 24 ? '00' : String(hh).padStart(2, '0');
      return `${hhStr}:${mm}:${ss}`;
    }
    const hms = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hms) {
      let hh = Math.min(parseInt(hms[1], 10), 24);
      let mm = hms[2];
      let ss = hms[3] || '00';
      hh = Math.max(0, hh);
      const m = Math.max(0, Math.min(59, parseInt(mm, 10)));
      const s = Math.max(0, Math.min(59, parseInt(ss, 10)));
      const hhStr = hh === 24 ? '00' : String(hh).padStart(2, '0');
      return `${hhStr}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return trimmed.replace(/[^0-9:]/g, '');
  };
  const normalizeTimeStrict = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    let hh = digits.slice(0, 2);
    let mm = digits.slice(2, 4);
    let ss = digits.slice(4, 6);
    if (hh.length === 2) {
      const h = Math.max(0, Math.min(24, parseInt(hh, 10) || 0));
      hh = h === 24 ? '00' : String(h).padStart(2, '0');
    }
    if (mm.length === 2) {
      const m = Math.max(0, Math.min(59, parseInt(mm, 10) || 0));
      mm = String(m).padStart(2, '0');
    }
    if (ss.length === 2) {
      const s = Math.max(0, Math.min(59, parseInt(ss, 10) || 0));
      ss = String(s).padStart(2, '0');
    }
    const parts = [];
    if (hh) parts.push(hh);
    if (mm) parts.push(mm);
    if (ss) parts.push(ss);
    const joined = parts.join(':');
    return joined.length > 0 ? joined : '';
  };
  const adjustDateFor24h = (isoDate: string, time: string) => {
    const m = time.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return { isoDate, time };
    let hh = parseInt(m[1], 10);
    const mm = m[2];
    const ss = m[3];
    if (hh === 24) {
      const base = new Date(isoDate);
      base.setDate(base.getDate() + 1);
      return { isoDate: base.toISOString().split('T')[0], time: `00:${mm}:${ss}` };
    }
    return { isoDate, time };
  };
  
  const handleTimeChange = (field: 'start_time' | 'end_time', raw: string) => {
    const value = normalizeTimeStrict(raw);
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const [formData, setFormData] = useState({
    site_id: '',
    account_id: '',
    limit: '',
    start_hands: '',
    end_hands: '',
    start_hands_bp: '',
    end_hands_bp: '',
    start_balance: '',
    end_balance: '',
    start_date: formatDateBR(new Date()),
    start_time: new Date().toTimeString().slice(0, 5),
    end_time: new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)
  });

  // 1. Busca dados estáticos (Sites e Contas) apenas uma vez ou quando o modal abre
  useEffect(() => {
    const fetchStaticData = async () => {
      setIsLoadingStatic(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const promises: any[] = [
        supabase.from('sites').select('*').order('name'),
        supabase.from('site_accounts').select('*').order('nickname')
      ];

      if (user) {
        promises.push(supabase.from('profiles').select('default_limit').eq('id', user.id).maybeSingle());
      }

      const [sitesRes, accountsRes, profileRes] = await Promise.all(promises);
      
      setSites(sitesRes.data || []);
      setAccounts(accountsRes.data || []);
      if (profileRes && profileRes.data) {
        setDefaultLimit(profileRes.data.default_limit || 'PLO20');
      }
      setIsLoadingStatic(false);
    };

    if (isOpen) {
      fetchStaticData();
    }
  }, [isOpen]);

  // 2. Popula o formulário quando initialData ou o status do modal muda
  useEffect(() => {
    if (!isOpen) return;

    const initializeForm = async () => {
      if (initialData) {
        // MODO EDIÇÃO
        setActiveTab('manual');
        const startDate = new Date(initialData.start_time);
        const endDate = initialData.end_time ? new Date(initialData.end_time) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        
        // Garante que o valor venha preenchido, mesmo que seja zero ou string vazia
        setFormData({
          site_id: String(initialData.sites?.id || initialData.site_id || ''),
          account_id: String(initialData.site_accounts?.id || initialData.account_id || ''),
          limit: initialData.limit_name || '',
          start_hands: String(initialData.start_hands ?? '0'),
          end_hands: String(initialData.end_hands ?? ''),
          start_hands_bp: String(initialData.start_hands_bp ?? '0'),
          end_hands_bp: String(initialData.end_hands_bp ?? ''),
          start_balance: String(initialData.start_balance ?? '0'),
          end_balance: String(initialData.end_balance ?? ''),
          start_date: formatDateBR(startDate),
          start_time: formatTime24(startDate),
          end_time: formatTime24(endDate)
        });
      } else {
        // MODO CRIAÇÃO (Novo Registro)
        setActiveTab('start');
        setTables([]);
        setTablesStart([]);
        
        setFormData({
          site_id: '',
          account_id: '',
          limit: defaultLimit,
          start_hands: '',
          end_hands: '',
          start_hands_bp: '',
          end_hands_bp: '',
          start_balance: '',
          end_balance: '',
          start_date: formatDateBR(new Date()),
          start_time: formatTime24(new Date()),
          end_time: formatTime24(new Date(new Date().getTime() + 2 * 60 * 60 * 1000))
        });
      }
    };

    initializeForm();
  }, [isOpen, initialData, defaultLimit]);

  // 3. Busca histórico da conta apenas ao CRIAR uma nova sessão e mudar a conta
  useEffect(() => {
    const fetchAccountHistory = async () => {
      if (!formData.account_id || !isOpen || initialData) return;
      
      setFetchingHistory(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('end_hands, end_hands_bp, end_balance')
        .eq('account_id', formData.account_id)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          start_hands: data.end_hands?.toString() || '0',
          start_hands_bp: data.end_hands_bp?.toString() || '0',
          start_balance: data.end_balance?.toString() || '0',
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          start_hands: '0',
          start_hands_bp: '0',
          start_balance: '0',
        }));
      }
      setFetchingHistory(false);
    };

    fetchAccountHistory();
  }, [formData.account_id, isOpen, !!initialData]);

  const filteredAccounts = accounts.filter(a => String(a.site_id) === formData.site_id);
  const filteredAccountsFor = (siteId: string) => accounts.filter(a => String(a.site_id) === siteId);
  const addTable = () => {
    setTables(prev => [...prev, { site_id: '', account_id: '', limit: formData.limit || '', start_hands: '', end_hands: '', start_hands_bp: '', end_hands_bp: '', start_balance: '', end_balance: '' }]);
  };
  const removeTable = (index: number) => {
    setTables(prev => prev.filter((_, i) => i !== index));
  };
  const updateTable = (index: number, field: string, value: string) => {
    setTables(prev => prev.map((t, i) => i === index ? { ...t, [field]: value, ...(field === 'site_id' ? { account_id: '' } : {}) } : t));
  };
  const fetchAccountHistoryFor = async (index: number, accountId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('end_hands, end_hands_bp, end_balance')
      .eq('account_id', accountId)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTables(prev => prev.map((t, i) => i === index ? { 
      ...t, 
      start_hands: data?.end_hands?.toString() || '0', 
      start_hands_bp: data?.end_hands_bp?.toString() || '0', 
      start_balance: data?.end_balance?.toString() || '0' 
    } : t));
  };
  const addStartEntry = () => {
    setTablesStart(prev => [...prev, { site_id: '', account_id: '', limit: formData.limit || '', start_hands: '', start_hands_bp: '', start_balance: '' }]);
  };
  const removeStartEntry = (index: number) => {
    setTablesStart(prev => prev.filter((_, i) => i !== index));
  };
  const updateStartEntry = (index: number, field: string, value: string) => {
    setTablesStart(prev => prev.map((t, i) => i === index ? { ...t, [field]: value, ...(field === 'site_id' ? { account_id: '' } : {}) } : t));
  };
  const fetchAccountHistoryStart = async (index: number, accountId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('end_hands, end_hands_bp, end_balance')
      .eq('account_id', accountId)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTablesStart(prev => prev.map((t, i) => i === index ? { 
      ...t, 
      start_hands: data?.end_hands?.toString() || '0', 
      start_hands_bp: data?.end_hands_bp?.toString() || '0', 
      start_balance: data?.end_balance?.toString() || '0' 
    } : t));
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.site_id || !formData.account_id) return;
    const isoDate = parseDateBRToISO(formData.start_date);
    const startHMS = formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time;
    const startAdj = adjustDateFor24h(isoDate, startHMS.length === 8 ? startHMS : `${startHMS}:00`);
    const startDateObj = new Date(`${startAdj.isoDate}T${startAdj.time}`);
    const startDateTime = startDateObj.toISOString();
    
    // Check if end time is before start time (meaning it crossed midnight)
    const endHMS = formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time;
    const endAdj = adjustDateFor24h(isoDate, endHMS.length === 8 ? endHMS : `${endHMS}:00`);
    const endDateObj = new Date(`${endAdj.isoDate}T${endAdj.time}`);
    if (endDateObj.getTime() < startDateObj.getTime()) {
      endDateObj.setDate(endDateObj.getDate() + 1);
    }
    const endDateTime = endDateObj.toISOString();
    
    if (tables.length > 0) {
      const combined = [
        {
          site_id: formData.site_id,
          account_id: formData.account_id,
          limit: formData.limit,
          start_hands: formData.start_hands,
          end_hands: formData.end_hands,
          start_hands_bp: formData.start_hands_bp,
          end_hands_bp: formData.end_hands_bp,
          start_balance: formData.start_balance,
          end_balance: formData.end_balance,
        },
        ...tables,
      ].filter((t: any) => t.site_id && t.account_id);

      const seen = new Set<string>();
      const unique = combined.filter((t: any) => {
        const key = `${t.site_id}|${t.account_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const payload = unique.map((t: any) => ({
        site_id: t.site_id,
        account_id: t.account_id,
        limit: t.limit,
        start_hands: Number(t.start_hands),
        end_hands: Number(t.end_hands),
        start_hands_bp: Number(t.start_hands_bp || 0),
        end_hands_bp: Number(t.end_hands_bp || 0),
        start_balance: parseCurrencyBR(t.start_balance),
        end_balance: parseCurrencyBR(t.end_balance),
        startTime: startDateTime,
        endTime: endDateTime,
        result: parseCurrencyBR(t.end_balance) - parseCurrencyBR(t.start_balance),
        type: 'completed'
      }));
      onSave(payload);
    } else {
      onSave({
        site_id: formData.site_id,
        account_id: formData.account_id,
        limit: formData.limit,
        start_hands: Number(formData.start_hands),
        end_hands: Number(formData.end_hands),
        start_hands_bp: Number(formData.start_hands_bp || 0),
        end_hands_bp: Number(formData.end_hands_bp || 0),
        start_balance: parseCurrencyBR(formData.start_balance),
        end_balance: parseCurrencyBR(formData.end_balance),
        startTime: startDateTime,
        endTime: endDateTime,
        result: parseCurrencyBR(formData.end_balance) - parseCurrencyBR(formData.start_balance),
        type: 'completed'
      });
    }
    onClose();
  };

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (tablesStart.length > 0) {
      const combined = [
        {
          site_id: formData.site_id,
          account_id: formData.account_id,
          limit: formData.limit,
          start_hands: formData.start_hands,
          start_hands_bp: formData.start_hands_bp,
          start_balance: formData.start_balance,
        },
        ...tablesStart,
      ].filter((t: any) => t.site_id && t.account_id);

      const seen = new Set<string>();
      const unique = combined.filter((t: any) => {
        const key = `${t.site_id}|${t.account_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const startTime = new Date().toISOString();
      const payload = unique.map((t: any) => ({
        type: 'active',
        site_id: t.site_id,
        account_id: t.account_id,
        limit: t.limit,
        startTime,
        start_hands: Number(t.start_hands) || 0,
        start_hands_bp: Number(t.start_hands_bp) || 0,
        start_balance: parseCurrencyBR(t.start_balance) || 0,
      }));
      if (payload.length === 0) return;
      onSave(payload);
    } else {
      if (!formData.site_id || !formData.account_id) return;
      onSave({
        type: 'active',
        site_id: formData.site_id,
        account_id: formData.account_id,
        limit: formData.limit,
        startTime: new Date().toISOString(),
        start_hands: Number(formData.start_hands) || 0,
        start_hands_bp: Number(formData.start_hands_bp) || 0,
        start_balance: parseCurrencyBR(formData.start_balance) || 0,
      });
    }
    onClose();
  };

  const inputClasses = "bg-background border-input text-foreground focus:ring-emerald-500 w-full";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {initialData ? 'Editar Sessão' : 'Registrar Sessão'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
            <TabsTrigger value="start" disabled={!!initialData}>Iniciar Agora</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="mt-6 space-y-4">
            <form onSubmit={handleStartSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select 
                    value={formData.site_id} 
                    onValueChange={v => setFormData({...formData, site_id: v})} 
                    required
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue placeholder={isLoadingStatic ? "Carregando..." : "Site"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select 
                    value={formData.account_id} 
                    onValueChange={v => setFormData({...formData, account_id: v})} 
                    required 
                    disabled={!formData.site_id}
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue placeholder={isLoadingStatic ? "Carregando..." : "Conta"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>)}
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contas</Label>
                  <Button type="button" onClick={addStartEntry} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Adicionar conta</Button>
                </div>
                {tablesStart.map((t, idx) => (
                  <div key={idx} className="p-3 border border-border rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Site</Label>
                        <Select value={t.site_id} onValueChange={v => updateStartEntry(idx, 'site_id', v)}>
                          <SelectTrigger className={inputClasses}>
                            <SelectValue placeholder="Site" />
                          </SelectTrigger>
                          <SelectContent>
                            {sites.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Conta</Label>
                        <Select 
                          value={t.account_id} 
                          onValueChange={v => { updateStartEntry(idx, 'account_id', v); fetchAccountHistoryStart(idx, v); }} 
                          disabled={!t.site_id}
                        >
                          <SelectTrigger className={inputClasses}>
                            <SelectValue placeholder="Conta" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAccountsFor(t.site_id).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Limite</Label>
                      <Select value={t.limit} onValueChange={v => updateStartEntry(idx, 'limit', v)}>
                        <SelectTrigger className={inputClasses}><SelectValue placeholder="Selecione o limite" /></SelectTrigger>
                        <SelectContent>
                          {PLO_LIMITS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 h-6">Mãos Início</Label>
                        <Input type="number" value={t.start_hands} onChange={e => updateStartEntry(idx, 'start_hands', e.target.value)} className={inputClasses} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 h-6">Mãos BP Início</Label>
                        <Input type="number" value={t.start_hands_bp} onChange={e => updateStartEntry(idx, 'start_hands_bp', e.target.value)} className={inputClasses} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 h-6">Saldo Início (R$)</Label>
                      <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={t.start_balance} onChange={e => updateStartEntry(idx, 'start_balance', sanitizeCurrencyInput(e.target.value))} className={inputClasses} />
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="destructive" onClick={() => removeStartEntry(idx)} className="gap-2"><Trash2 className="w-4 h-4" /> Remover conta</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Mãos Início</p>
                  <p className="text-sm font-medium text-foreground">{fetchingHistory ? '...' : Number(formData.start_hands || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Mãos BP Início</p>
                  <p className="text-sm font-medium text-foreground">{fetchingHistory ? '...' : Number(formData.start_hands_bp || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Início</p>
                  <p className="text-sm font-medium text-foreground">{fetchingHistory ? '...' : `R$ ${Number(formData.start_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p>
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
                  <Select 
                    value={formData.site_id} 
                    onValueChange={v => setFormData({...formData, site_id: v})} 
                    required
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue placeholder={isLoadingStatic ? "Carregando..." : "Site"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select 
                    value={formData.account_id} 
                    onValueChange={v => setFormData({...formData, account_id: v})} 
                    required 
                    disabled={!formData.site_id}
                  >
                    <SelectTrigger className={inputClasses}>
                      <div className="flex items-center gap-2">
                        <SelectValue placeholder={isLoadingStatic ? "Carregando..." : "Conta"} />
                        {fetchingHistory && <Loader2 className="w-3 h-3 animate-spin" />}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>)}
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contas</Label>
                  <Button type="button" onClick={addTable} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Adicionar conta</Button>
                </div>
                {tables.map((t, idx) => (
                  <div key={idx} className="p-3 border border-border rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Site</Label>
                        <Select value={t.site_id} onValueChange={v => updateTable(idx, 'site_id', v)}>
                          <SelectTrigger className={inputClasses}>
                            <SelectValue placeholder="Site" />
                          </SelectTrigger>
                          <SelectContent>
                            {sites.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Conta</Label>
                        <Select 
                          value={t.account_id} 
                          onValueChange={v => { updateTable(idx, 'account_id', v); fetchAccountHistoryFor(idx, v); }} 
                          disabled={!t.site_id}
                        >
                          <SelectTrigger className={inputClasses}>
                            <SelectValue placeholder="Conta" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAccountsFor(t.site_id).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Limite</Label>
                      <Select value={t.limit} onValueChange={v => updateTable(idx, 'limit', v)}>
                        <SelectTrigger className={inputClasses}><SelectValue placeholder="Selecione o limite" /></SelectTrigger>
                        <SelectContent>
                          {PLO_LIMITS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 h-6">Mãos Início</Label>
                        <Input type="number" value={t.start_hands} onChange={e => updateTable(idx, 'start_hands', e.target.value)} className={inputClasses} />
                      </div>
                      <div className="space-y-2">
                        <Label className="h-6 flex items-center">Mãos Fim</Label>
                        <Input type="number" value={t.end_hands} onChange={e => updateTable(idx, 'end_hands', e.target.value)} className={inputClasses} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 h-6">Mãos BP Início</Label>
                        <Input type="number" value={t.start_hands_bp} onChange={e => updateTable(idx, 'start_hands_bp', e.target.value)} className={inputClasses} />
                      </div>
                      <div className="space-y-2">
                        <Label className="h-6 flex items-center">Mãos BP Fim</Label>
                        <Input type="number" value={t.end_hands_bp} onChange={e => updateTable(idx, 'end_hands_bp', e.target.value)} className={inputClasses} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 h-6">Saldo Início (R$)</Label>
                        <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={t.start_balance} onChange={e => updateTable(idx, 'start_balance', sanitizeCurrencyInput(e.target.value))} className={inputClasses} />
                      </div>
                      <div className="space-y-2">
                        <Label className="h-6 flex items-center">Saldo Fim (R$)</Label>
                        <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={t.end_balance} onChange={e => updateTable(idx, 'end_balance', sanitizeCurrencyInput(e.target.value))} className={inputClasses} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="destructive" onClick={() => removeTable(idx)} className="gap-2"><Trash2 className="w-4 h-4" /> Remover conta</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 h-6">
                    Mãos Início {fetchingHistory && <Loader2 className="w-3 h-3 animate-spin" />}
                  </Label>
                  <Input type="number" value={formData.start_hands} onChange={e => setFormData({...formData, start_hands: e.target.value})} className={inputClasses} required />
                </div>
                <div className="space-y-2">
                  <Label className="h-6 flex items-center">Mãos Fim</Label>
                  <Input type="number" value={formData.end_hands} onChange={e => setFormData({...formData, end_hands: e.target.value})} className={inputClasses} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 h-6">Mãos BP Início</Label>
                  <Input type="number" value={formData.start_hands_bp} onChange={e => setFormData({...formData, start_hands_bp: e.target.value})} className={inputClasses} />
                </div>
                <div className="space-y-2">
                  <Label className="h-6 flex items-center">Mãos BP Fim</Label>
                  <Input type="number" value={formData.end_hands_bp} onChange={e => setFormData({...formData, end_hands_bp: e.target.value})} className={inputClasses} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 h-6">
                  Saldo Início (R$) {fetchingHistory && <Loader2 className="w-3 h-3 animate-spin" />}
                  </Label>
                <Input 
                  type="text" 
                  inputMode="decimal" 
                  placeholder="R$ 0,00"
                  value={formData.start_balance} 
                  onChange={e => setFormData({...formData, start_balance: sanitizeCurrencyInput(e.target.value)})} 
                  className={inputClasses} 
                  required 
                />
                </div>
                <div className="space-y-2">
                <Label className="h-6 flex items-center">Saldo Fim (R$)</Label>
                <Input 
                  type="text" 
                  inputMode="decimal" 
                  placeholder="R$ 0,00"
                  value={formData.end_balance} 
                  onChange={e => setFormData({...formData, end_balance: sanitizeCurrencyInput(e.target.value)})} 
                  className={inputClasses} 
                  required 
                />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  value={formData.start_date}
                  onChange={e => setFormData(prev => ({ ...prev, start_date: normalizeDateBRInput(e.target.value) }))}
                  maxLength={10}
                  className={inputClasses} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Início</Label>
                  <Input 
                    type="text" 
                    placeholder="HH:MM:SS"
                    value={formData.start_time}
                    onChange={e => handleTimeChange('start_time', e.target.value)}
                    maxLength={8}
                    className={inputClasses} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Input 
                    type="text" 
                    placeholder="HH:MM:SS"
                    value={formData.end_time}
                    onChange={e => handleTimeChange('end_time', e.target.value)}
                    maxLength={8}
                    className={inputClasses} 
                    required 
                  />
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