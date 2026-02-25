"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { BookOpen, Plus, ExternalLink, Trash2, Search, Edit2, Save, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const Studies = () => {
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    link: '',
    content: ''
  });

  const fetchStudies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('studies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) showError("Erro ao carregar estudos.");
    else setStudies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudies();
  }, []);

  const handleOpenModal = (study?: any) => {
    if (study) {
      setEditingStudy(study);
      setFormData({
        title: study.title,
        category: study.category || '',
        link: study.link || '',
        content: study.content || ''
      });
    } else {
      setEditingStudy(null);
      setFormData({ title: '', category: '', link: '', content: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingStudy) {
      const { error } = await supabase
        .from('studies')
        .update(formData)
        .eq('id', editingStudy.id);

      if (error) showError("Erro ao atualizar.");
      else {
        showSuccess("Estudo atualizado!");
        fetchStudies();
      }
    } else {
      const { error } = await supabase
        .from('studies')
        .insert([{ ...formData, user_id: user.id }]);

      if (error) showError("Erro ao salvar.");
      else {
        showSuccess("Novo estudo adicionado!");
        fetchStudies();
      }
    }
    setIsModalOpen(false);
  };

  const removeStudy = async (id: string) => {
    const { error } = await supabase.from('studies').delete().eq('id', id);
    if (error) showError("Erro ao remover.");
    else {
      showSuccess("Estudo removido.");
      fetchStudies();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Estudos</h1>
              <p className="text-slate-400 mt-1">Organize seus materiais e revisões.</p>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-500 gap-2">
              <Plus className="w-4 h-4" /> Novo Material
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Buscar estudos..." 
              className="pl-10 bg-slate-900 border-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="p-20 flex justify-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studies.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).map((study) => (
                <Card key={study.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {study.category || 'Geral'}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(study.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <CardTitle className="text-lg text-white mt-2">{study.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-4">{study.content}</p>
                    <div className="flex gap-2">
                      {study.link && (
                        <Button variant="outline" size="sm" asChild className="flex-1 bg-slate-800 border-slate-700 gap-2">
                          <a href={study.link} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3 h-3" /> Acessar
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(study)} className="bg-slate-800 border-slate-700">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeStudy(study.id)}
                        className="text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-white">{editingStudy ? 'Editar Estudo' : 'Novo Estudo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="bg-slate-950 border-slate-800" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="bg-slate-950 border-slate-800" 
                placeholder="Ex: Pre-flop, Post-flop"
              />
            </div>
            <div className="space-y-2">
              <Label>Link Externo (opcional)</Label>
              <Input 
                value={formData.link} 
                onChange={e => setFormData({...formData, link: e.target.value})}
                className="bg-slate-950 border-slate-800" 
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo / Notas</Label>
              <Textarea 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})}
                className="bg-slate-950 border-slate-800 min-h-[100px]" 
              />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 gap-2">
              <Save className="w-4 h-4" /> Salvar Estudo
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Studies;