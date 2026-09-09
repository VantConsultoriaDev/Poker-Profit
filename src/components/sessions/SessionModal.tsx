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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Clock3, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { parseCurrencyBR } from '@/lib/format';

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
  const [accountForms, setAccountForms] = useState<any[]>([]);
  const [accountCount, setAccountCount] = useState('1');
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
  const parseDateBRForPicker = (br: string) => {
    const iso = parseDateBRToISO(br);
    return iso ? new Date(`${iso}T12:00:00`) : undefined;
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
  const sanitizeHandsInput = (raw: string) => raw.replace(/[^\d.,]/g, '');
  const parseHandsBR = (raw: string | number) => {
    const cleaned = String(raw ?? '').replace(/[^\d]/g, '');
    return Number(cleaned) || 0;
  };
  const normalizeAccountIdForQuery = (accountId: string) => {
    return /^\d+$/.test(accountId) ? Number(accountId) : accountId;
  };
  const fetchLatestSessionSnapshot = async (accountId: string) => {
    const candidates: (string | number)[] = [accountId];
    const normalized = normalizeAccountIdForQuery(accountId);
    if (normalized !== accountId) candidates.push(normalized);

    for (const candidate of candidates) {
      let latestRes = await supabase
        .from('sessions')
        .select('end_hands, end_hands_bp, end_balance')
        .eq('account_id', candidate)
        .not('end_time', 'is', null)
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      const errorMessage = `${latestRes.error?.message || ''} ${latestRes.error?.details || ''}`.toLowerCase();
      if (latestRes.error && (errorMessage.includes('end_hands_bp') || latestRes.error.code === '42703')) {
        latestRes = await supabase
          .from('sessions')
          .select('end_hands, end_balance')
          .eq('account_id', candidate)
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      if (!latestRes.error && latestRes.data) return latestRes.data;
    }

    return null;
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
        const sessionsToEdit = initialData.sessions || [initialData];
        const firstSession = sessionsToEdit[0];
        const startDate = new Date(firstSession.start_time);
        const endDate = firstSession.end_time ? new Date(firstSession.end_time) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        
        // Garante que o valor venha preenchido, mesmo que seja zero ou string vazia
        setAccountForms(sessionsToEdit.map((session: any) => ({
          id: session.id,
          site_id: String(session.sites?.id || session.site_id || ''),
          account_id: String(session.site_accounts?.id || session.account_id || ''),
          limit: session.limit_name || defaultLimit,
          start_hands: String(session.start_hands ?? '0'),
          end_hands: String(session.end_hands ?? ''),
          start_balance: String(session.start_balance ?? '0'),
          end_balance: String(session.end_balance ?? ''),
        })));
        setAccountCount(String(sessionsToEdit.length));
        setFormData({
          start_date: formatDateBR(startDate),
          start_time: formatTime24(startDate),
          end_time: formatTime24(endDate)
        });
      } else {
        // MODO CRIAÇÃO (Novo Registro)
        setAccountForms([]);
        setAccountCount('1');
        setFormData({
          start_date: formatDateBR(new Date()),
          start_time: formatTime24(new Date()),
          end_time: formatTime24(new Date(new Date().getTime() + 2 * 60 * 60 * 1000))
        });
      }
    };

    initializeForm();
  }, [isOpen, initialData, defaultLimit]);

  const filteredAccountsFor = (siteId: string) => accounts.filter(a => String(a.site_id) === siteId);
  const updateAccountForm = (index: number, field: string, value: string) => {
    setAccountForms(prev => prev.map((account, accountIndex) => accountIndex === index
      ? { ...account, [field]: value, ...(field === 'site_id' ? { account_id: '' } : {}) }
      : account));
  };
  const fetchAccountHistoryFor = async (index: number, accountId: string) => {
    const data = await fetchLatestSessionSnapshot(accountId);
    setAccountForms(prev => prev.map((account, accountIndex) => accountIndex === index ? {
      ...account,
      start_hands: (data?.end_hands ?? data?.end_hands_bp ?? 0).toString(),
      start_balance: data?.end_balance?.toString() || '0'
    } : account));
  };
  const handleAccountCountChange = (value: string) => {
    const count = Math.max(1, Math.min(6, Number(value)));
    setAccountCount(String(count));
    setAccountForms(Array.from({ length: count }, (_, index) => accountForms[index] || {
      site_id: '',
      account_id: '',
      limit: defaultLimit,
      start_hands: '',
      end_hands: '',
      start_balance: '',
      end_balance: '',
    }));
  };
  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountForms.length === 0 || accountForms.some(account => !account.site_id || !account.account_id)) return;
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
    
    const seen = new Set<string>();
    const unique = accountForms.filter(account => {
        const key = `${account.site_id}|${account.account_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const payload = unique.map((account: any) => ({
        site_id: account.site_id,
        account_id: account.account_id,
        limit: account.limit,
        start_hands: parseHandsBR(account.start_hands),
        end_hands: parseHandsBR(account.end_hands),
        start_balance: parseCurrencyBR(account.start_balance),
        end_balance: parseCurrencyBR(account.end_balance),
        startTime: startDateTime,
        endTime: endDateTime,
        result: parseCurrencyBR(account.end_balance) - parseCurrencyBR(account.start_balance),
        type: 'completed'
      }));
    if (payload.length === 0) return;
    onSave(payload.length === 1 ? payload[0] : payload);
    onClose();
  };

  const inputClasses = "bg-background border-input text-foreground focus:ring-emerald-500 w-full";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {initialData ? 'Editar Sessão' : 'Registrar Sessão'}
          </DialogTitle>
        </DialogHeader>

        {!initialData && accountForms.length === 0 ? (
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-count">Quantas contas foram usadas?</Label>
              <Select value={accountCount} onValueChange={handleAccountCountChange}>
                <SelectTrigger id="account-count" className={inputClasses}>
                  <SelectValue placeholder="Selecione a quantidade" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, index) => String(index + 1)).map(value => (
                    <SelectItem key={value} value={value}>{value} {value === '1' ? 'conta' : 'contas'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" className="w-full" onClick={() => handleAccountCountChange(accountCount)}>
              Continuar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleManualSave} className="space-y-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {accountForms.map((account, index) => (
                <div key={index} className="p-4 border border-border rounded-lg space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Conta {index + 1}</h3>
                    <span className="text-xs text-muted-foreground">{accountCount} no total</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Select value={account.site_id} onValueChange={value => updateAccountForm(index, 'site_id', value)} required>
                      <SelectTrigger className={inputClasses}><SelectValue placeholder={isLoadingStatic ? "Carregando..." : "Site"} /></SelectTrigger>
                      <SelectContent>{sites.map(site => <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Select value={account.account_id} onValueChange={value => { updateAccountForm(index, 'account_id', value); fetchAccountHistoryFor(index, value); }} disabled={!account.site_id} required>
                      <SelectTrigger className={inputClasses}><SelectValue placeholder={isLoadingStatic ? "Carregando..." : "Conta"} /></SelectTrigger>
                      <SelectContent>{filteredAccountsFor(account.site_id).map(option => <SelectItem key={option.id} value={String(option.id)}>{option.nickname}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Limite</Label>
                    <Select value={account.limit} onValueChange={value => updateAccountForm(index, 'limit', value)} required>
                      <SelectTrigger className={inputClasses}><SelectValue placeholder="Selecione o limite" /></SelectTrigger>
                      <SelectContent>{PLO_LIMITS.map(limit => <SelectItem key={limit} value={limit}>{limit}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Mãos Início</Label><Input type="text" inputMode="numeric" value={account.start_hands} onChange={event => updateAccountForm(index, 'start_hands', sanitizeHandsInput(event.target.value))} className={inputClasses} required /></div>
                    <div className="space-y-2"><Label>Mãos Fim</Label><Input type="text" inputMode="numeric" value={account.end_hands} onChange={event => updateAccountForm(index, 'end_hands', sanitizeHandsInput(event.target.value))} className={inputClasses} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Saldo Início (R$)</Label><Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={account.start_balance} onChange={event => updateAccountForm(index, 'start_balance', sanitizeCurrencyInput(event.target.value))} className={inputClasses} required /></div>
                    <div className="space-y-2"><Label>Saldo Fim (R$)</Label><Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={account.end_balance} onChange={event => updateAccountForm(index, 'end_balance', sanitizeCurrencyInput(event.target.value))} className={inputClasses} required /></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label>Data</Label>
                <div className="flex gap-2">
                  <Input type="text" placeholder="DD/MM/AAAA" value={formData.start_date} onChange={event => setFormData(prev => ({ ...prev, start_date: normalizeDateBRInput(event.target.value) }))} maxLength={10} className={inputClasses} required />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="icon" title="Abrir calendário" aria-label="Abrir calendário">
                        <CalendarDays className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseDateBRForPicker(formData.start_date)}
                        onSelect={date => {
                          if (date) setFormData(prev => ({ ...prev, start_date: formatDateBR(date) }));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hora Início</Label>
                <div className="flex gap-2">
                  <Input type="text" placeholder="HH:MM:SS" value={formData.start_time} onChange={event => handleTimeChange('start_time', event.target.value)} maxLength={8} className={inputClasses} required />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="icon" title="Abrir relógio" aria-label="Abrir relógio">
                        <Clock3 className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto">
                      <Label htmlFor="start-time-picker">Selecione a hora</Label>
                      <Input id="start-time-picker" lang="en-GB" type="time" step="1" value={formData.start_time} onChange={event => handleTimeChange('start_time', event.target.value)} className={`${inputClasses} mt-2`} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hora Fim</Label>
                <div className="flex gap-2">
                  <Input type="text" placeholder="HH:MM:SS" value={formData.end_time} onChange={event => handleTimeChange('end_time', event.target.value)} maxLength={8} className={inputClasses} required />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="icon" title="Abrir relógio" aria-label="Abrir relógio">
                        <Clock3 className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto">
                      <Label htmlFor="end-time-picker">Selecione a hora</Label>
                      <Input id="end-time-picker" lang="en-GB" type="time" step="1" value={formData.end_time} onChange={event => handleTimeChange('end_time', event.target.value)} className={`${inputClasses} mt-2`} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2"><Save className="w-4 h-4" /> Salvar Registro</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SessionModal;
