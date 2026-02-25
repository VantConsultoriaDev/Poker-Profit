"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Plus, ExternalLink, Trash2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showSuccess } from '@/utils/toast';

const initialStudies = [
  { id: 1, title: 'Range de Open Raise - UTG', category: 'Pre-flop', date: '20/05/2024', link: 'https://pokerstudy.com/ranges' },
  { id: 2, title: 'Defesa de Big Blind vs BTN', category: 'Defesa', date: '18/05/2024', link: '#' },
  { id: 3, title: 'Conceitos de ICM em FT', category: 'Torneios', date: '15/05/2024', link: '#' },
];

const Studies = () => {
  const [studies, setStudies] = useState(initialStudies);
  const [searchTerm, setSearchTerm] = useState('');

  const removeStudy = (id: number) => {
    setStudies(studies.filter(s => s.id !== id));
    showSuccess("Estudo removido.");
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
            <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studies.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).map((study) => (
              <Card key={study.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {study.category}
                    </Badge>
                    <span className="text-xs text-slate-500">{study.date}</span>
                  </div>
                  <CardTitle className="text-lg text-white mt-2">{study.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 bg-slate-800 border-slate-700 gap-2">
                      <ExternalLink className="w-3 h-3" /> Acessar
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
        </div>
      </main>
    </div>
  );
};

export default Studies;