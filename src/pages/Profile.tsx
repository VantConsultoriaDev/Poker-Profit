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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  User, 
  Save, 
  ShieldCheck, 
  Globe, 
  Plus, 
  Trash2,
  CreditCard,
  TrendingUp,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

const Profile = () => {
  const { usdToBrlRate, setUsdToBrlRate } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  
  const [profile, setProfile] = useState({
    fullName: 'Vinícius Oliveira',
    email: 'vinicius@pokerprofit.com',
    limit: '1',
    phone: '(11) 99999-9999',
    birthDate: '1995-05-20',
  });

  const [sites, setSites] = useState([
    { id: 1, name: 'PokerStars', currency: 'USD' },
    { id: 2, name: 'GG Poker', currency: 'USD' },
    { id: 3, name: 'Bodog', currency: 'BRL' },
  ]);

  const [newSite, setNewSite] = useState({ name: '', currency: 'BRL' });
  const [tempRate, setTempRate] = useState(usdToBrlRate.toString());

  const fetchCurrentRate = async () => {
    setFetchingRate(true);
    try {
      // Simulando chamada de API para cotação atual
      // Em um cenário real, usaria: fetch('https://economia.awesomeapi.com.br/last/USD-BRL')
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockRate = 5.62; 
      setTempRate(mockRate.toString());
      showSuccess(`Cotação sugerida: R$ ${mockRate}`);
    } catch (err) {
      showError("Erro ao buscar cotação.");
    } finally {
      setFetchingRate(false);
    }
  };

  const handleSaveRate = () => {
    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate <= 0) {
      showError("Taxa inválida.");
      return;
    }
    setUsdToBrlRate(rate);
    showSuccess("Taxa de conversão atualizada!");
  };

  const addSite = () => {
    if (!newSite.name) return;
    
    if (newSite.currency === 'USD') {
      const confirmRate = window.confirm(`Este site usa USD. A taxa de conversão atual é R$ ${usdToBrlRate}. Deseja usar esta taxa para os cálculos?`);
      if (!confirmRate) return;
    }

    setSites([...sites, { ...newSite, id: Date.now() }]);
    setNewSite({ name: '', currency: 'BRL' });
    showSuccess("Site adicionado!");
  };

  const inputClasses = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:ring-emerald-500";

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
              <p className="text-slate-400 mt-1">Gerencie seus dados e configurações de moeda.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Usuário Verificado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" /> Conversão de Moeda
                  </CardTitle>
                  <CardDescription>Defina a taxa do Dólar para converter seus ganhos nos gráficos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-slate-400">Taxa USD para BRL (R$)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={tempRate} 
                        onChange={(e) => setTempRate(e.target.value)}
                        className={inputClasses} 
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={fetchCurrentRate} 
                      disabled={fetchingRate}
                      className="bg-slate-800 border-slate-700 gap-2"
                    >
                      <RefreshCw className={cn("w-4 h-4", fetchingRate && "animate-spin")} />
                      Sugerir Hoje
                    </Button>
                    <Button onClick={handleSaveRate} className="bg-emerald-600 hover:bg-emerald-500">
                      Atualizar Taxa
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    * Todos os valores em USD serão multiplicados por esta taxa nos gráficos e relatórios.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" /> Sites de Poker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Nome do Site" 
                      value={newSite.name}
                      onChange={(e) => setNewSite({...newSite, name: e.target.value})}
                      className={inputClasses}
                    />
                    <Select value={newSite.currency} onValueChange={(v) => setNewSite({...newSite, currency: v})}>
                      <SelectTrigger className="w-32 bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="BRL">R$ (BRL)</SelectItem>
                        <SelectItem value="USD">$ (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addSite} className="bg-blue-600 hover:bg-blue-500">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sites.map((site) => (
                      <div key={site.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold">
                            {site.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{site.name}</p>
                            <Badge variant="outline" className={cn(
                              "text-[10px] px-1 py-0",
                              site.currency === 'BRL' ? "text-emerald-400 border-emerald-500/30" : "text-blue-400 border-blue-500/30"
                            )}>
                              {site.currency}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSites(sites.filter(s => s.id !== site.id))} className="text-slate-500 hover:text-rose-500">
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
                    <TrendingUp className="w-5 h-5 text-amber-400" /> Limite Atual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={profile.limit} onValueChange={(v) => setProfile({...profile, limit: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {['0.20', '0.40', '0.60', '0.80', '1', '2', '4', '6', '10'].map(l => (
                        <SelectItem key={l} value={l}>BB R$ {l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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