"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Globe, 
  Plus, 
  Trash2,
  DollarSign,
  RefreshCw,
  ShieldCheck,
  Users
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { usdToBrlRate, setUsdToBrlRate } = useCurrency();
  const [fetchingRate, setFetchingRate] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [newSite, setNewSite] = useState({ name: '', currency: 'BRL' });
  const [newAccount, setNewAccount] = useState({ site_id: '', nickname: '' });
  const [tempRate, setTempRate] = useState(usdToBrlRate.toString());

  const fetchData = async () => {
    const { data: sitesData } = await supabase.from('sites').select('*').order('name');
    const { data: accountsData } = await supabase.from('site_accounts').select('*, sites(name)');
    setSites(sitesData || []);
    setAccounts(accountsData || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchCurrentRate = async () => {
    setFetchingRate(true);
    try {
      const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      const data = await response.json();
      const rate = parseFloat(data.USDBRL.bid);
      setTempRate(rate.toFixed(2));
      showSuccess(`Cotação atualizada: R$ ${rate.toFixed(2)}`);
    } catch (err) {
      showError("Erro ao buscar cotação.");
    } finally {
      setFetchingRate(false);
    }
  };

  const handleSaveRate = () => {
    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate <= 0) return showError("Taxa inválida.");
    setUsdToBrlRate(rate);
    showSuccess("Taxa de conversão atualizada!");
  };

  const addSite = async () => {
    if (!newSite.name) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sites').insert([{ ...newSite, user_id: user?.id }]);
    if (error) showError("Erro ao adicionar site.");
    else {
      showSuccess("Site adicionado!");
      setNewSite({ name: '', currency: 'BRL' });
      fetchData();
    }
  };

  const addAccount = async () => {
    if (!newAccount.site_id || !newAccount.nickname) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('site_accounts').insert([{ ...newAccount, user_id: user?.id }]);
    if (error) showError("Erro ao adicionar conta.");
    else {
      showSuccess("Conta adicionada!");
      setNewAccount({ site_id: '', nickname: '' });
      fetchData();
    }
  };

  const removeSite = async (id: string) => {
    const { error } = await supabase.from('sites').delete().eq('id', id);
    if (error) showError("Erro ao remover site.");
    else { showSuccess("Site removido."); fetchData(); }
  };

  const removeAccount = async (id: string) => {
    const { error } = await supabase.from('site_accounts').delete().eq('id', id);
    if (error) showError("Erro ao remover conta.");
    else { showSuccess("Conta removida."); fetchData(); }
  };

  const inputClasses = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:ring-emerald-500";

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Configurações</h1>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase">Verificado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" /> Câmbio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-slate-300">Taxa USD/BRL</Label>
                      <Input type="number" step="0.01" value={tempRate} onChange={(e) => setTempRate(e.target.value)} className={inputClasses} />
                    </div>
                    <Button variant="outline" onClick={fetchCurrentRate} disabled={fetchingRate} className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                      <RefreshCw className={cn("w-4 h-4", fetchingRate && "animate-spin")} />
                    </Button>
                    <Button onClick={handleSaveRate} className="bg-emerald-600 hover:bg-emerald-500 text-white">Salvar</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" /> Sites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="Nome do Site" value={newSite.name} onChange={(e) => setNewSite({...newSite, name: e.target.value})} className={inputClasses} />
                    <Select value={newSite.currency} onValueChange={(v) => setNewSite({...newSite, currency: v})}>
                      <SelectTrigger className="w-24 bg-slate-950 border-slate-800 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="BRL">BRL</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addSite} className="bg-blue-600 text-white hover:bg-blue-500"><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    {sites.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-sm font-medium text-white">{s.name} ({s.currency})</span>
                        <Button variant="ghost" size="icon" onClick={() => removeSite(s.id)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" /> Contas (Nicknames)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Select value={newAccount.site_id} onValueChange={(v) => setNewAccount({...newAccount, site_id: v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Selecione o Site" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input placeholder="Nickname / Conta" value={newAccount.nickname} onChange={(e) => setNewAccount({...newAccount, nickname: e.target.value})} className={inputClasses} />
                      <Button onClick={addAccount} className="bg-amber-600 text-white hover:bg-amber-500"><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {accounts.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-sm font-medium text-white">{a.nickname}</span>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{a.sites?.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeAccount(a.id)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;