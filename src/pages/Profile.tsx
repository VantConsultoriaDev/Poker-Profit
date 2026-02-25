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
import { User, Save, ShieldCheck, Calendar, Mail, Phone, TrendingUp } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const Profile = () => {
  const [loading, setLoading] = useState(false);
  
  // Mock de dados iniciais
  const [profile, setProfile] = useState({
    fullName: 'Vinícius Oliveira',
    email: 'vinicius@pokerprofit.com',
    limit: '1',
    phone: '(11) 99999-9999',
    birthDate: '1995-05-20',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulando salvamento
    setTimeout(() => {
      setLoading(false);
      showSuccess("Perfil atualizado com sucesso!");
    }, 800);
  };

  const limits = ['0.20', '0.40', '0.60', '0.80', '1', '2', '4', '6', '10'];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Olá, {profile.fullName.split(' ')[0]}</h1>
              <p className="text-slate-400 mt-1">Gerencie suas informações pessoais e preferências.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Usuário Verificado</span>
            </div>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                  <User className="w-10 h-10 text-slate-500" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Meus Dados</CardTitle>
                  <CardDescription className="text-slate-400">Informações básicas da sua conta no time.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-400 flex items-center gap-2">
                      <User className="w-3 h-3" /> Nome Completo
                    </Label>
                    <Input 
                      value={profile.fullName}
                      onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Email
                    </Label>
                    <Input 
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" /> Limite Atual (Big Blind)
                    </Label>
                    <Select 
                      value={profile.limit} 
                      onValueChange={(v) => setProfile({...profile, limit: v})}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Selecione o limite" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        {limits.map((l) => (
                          <SelectItem key={l} value={l}>${l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 flex items-center gap-2">
                      <Phone className="w-3 h-3" /> Celular
                    </Label>
                    <Input 
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Data de Nascimento
                    </Label>
                    <Input 
                      type="date"
                      value={profile.birthDate}
                      onChange={(e) => setProfile({...profile, birthDate: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 gap-2"
                  >
                    {loading ? "Salvando..." : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h4 className="text-rose-400 font-bold">Zona de Perigo</h4>
              <p className="text-sm text-slate-500">A exclusão da conta é permanente e não pode ser desfeita.</p>
            </div>
            <Button variant="outline" className="border-rose-500/20 text-rose-500 hover:bg-rose-500/10">
              Excluir Minha Conta
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;