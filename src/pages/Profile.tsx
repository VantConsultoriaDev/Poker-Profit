"use client";

import React, { useState } from 'react';
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
  Calendar, 
  Mail, 
  Phone, 
  TrendingUp, 
  Globe, 
  Plus, 
  Trash2,
  CreditCard
} from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

const Profile = () => {
  const [loading, setLoading] = useState(false);
  
  // Mock de dados
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

  const [accounts, setAccounts] = useState([
    { id: 1, siteId: 1, username: 'vini_poker' },
    { id: 2, siteId: 2, username: 'vini_gg' },
  ]);

  const [newSite, setNewSite] = useState({ name: '', currency: 'BRL' });
  const [newAccount, setNewAccount] = useState({ siteId: '', username: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showSuccess("Perfil atualizado com sucesso!");
    }, 800);
  };

  const addSite = () => {
    if (!newSite.name) return;
    setSites([...sites, { ...newSite, id: Date.now() }]);
    setNewSite({ name: '', currency: 'BRL' });
    showSuccess("Site adicionado!");
  };

  const addAccount = () => {
    if (!newAccount.siteId || !newAccount.username) return;
    setAccounts([...accounts, { ...newAccount, id: Date.now(), siteId: Number(newAccount.siteId) }]);
    setNewAccount({ siteId: '', username: '' });
    showSuccess("Conta vinculada!");
  };

  const removeSite = (id: number) => {
    setSites(sites.filter(s => s.id !== id));
    setAccounts(accounts.filter(a => a.siteId !== id));
  };

  const removeAccount = (id: number) => {
    setAccounts(accounts.filter(a => a.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
              <p className="text-slate-400 mt-1">Gerencie seus dados, sites e contas de poker.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Usuário Verificado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna da Esquerda: Dados Pessoais */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" /> Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-400">Nome Completo</Label>
                        <Input value={profile.fullName} onChange={(e) => setProfile({...profile, fullName: e.target.value})} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400">Email</Label>
                        <Input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400">Celular</Label>
                        <Input value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400">Data de Nascimento</Label>
                        <Input type="date" value={profile.birthDate} onChange={(e) => setProfile({...profile, birthDate: e.target.value})} className="bg-slate-950 border-slate-800" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 gap-2">
                        <Save className="w-4 h-4" /> {loading ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Gestão de Sites */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" /> Sites de Poker
                  </CardTitle>
                  <CardDescription>Adicione as salas onde você joga e defina a moeda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Nome do Site (ex: PokerStars)" 
                      value={newSite.name}
                      onChange={(e) => setNewSite({...newSite, name: e.target.value})}
                      className="bg-slate-950 border-slate-800"
                    />
                    <Select value={newSite.currency} onValueChange={(v) => setNewSite({...newSite, currency: v})}>
                      <SelectTrigger className="w-32 bg-slate-950 border-slate-800">
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
                        <Button variant="ghost" size="icon" onClick={() => removeSite(site.id)} className="text-slate-500 hover:text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna da Direita: Contas e Limite */}
            <div className="space-y-8">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-400" /> Minhas Contas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Select value={newAccount.siteId} onValueChange={(v) => setNewAccount({...newAccount, siteId: v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Selecione o Site" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {sites.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Username / Nickname" 
                        value={newAccount.username}
                        onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                        className="bg-slate-950 border-slate-800"
                      />
                      <Button onClick={addAccount} className="bg-purple-600 hover:bg-purple-500">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {accounts.map((acc) => {
                      const site = sites.find(s => s.id === acc.siteId);
                      return (
                        <div key={acc.id} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div>
                            <p className="text-xs font-bold text-white">{acc.username}</p>
                            <p className="text-[10px] text-slate-500">{site?.name}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeAccount(acc.id)} className="h-8 w-8 text-slate-600 hover:text-rose-500">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" /> Limite Atual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={profile.limit} onValueChange={(v) => setProfile({...profile, limit: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {['0.20', '0.40', '0.60', '0.80', '1', '2', '4', '6', '10'].map(l => (
                        <SelectItem key={l} value={l}>BB ${l}</SelectItem>
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