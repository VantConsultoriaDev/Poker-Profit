"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Clock3, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const weekdays = [
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

type StudyRecord = {
  id: string;
  title: string;
  study_type: 'fixed' | 'one_off';
  weekday: number | null;
  study_date: string | null;
  start_time: string | null;
  duration_minutes: number;
  active: boolean;
};

const Studies = () => {
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [studyType, setStudyType] = useState<'fixed' | 'one_off'>('fixed');
  const [title, setTitle] = useState('');
  const [weekday, setWeekday] = useState('1');
  const [studyDate, setStudyDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('19:00');
  const [duration, setDuration] = useState('60');
  const [isSaving, setIsSaving] = useState(false);

  const loadRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('study_records')
      .select('*')
      .eq('user_id', user.id)
      .order('study_type')
      .order('weekday')
      .order('study_date');
    if (error) {
      showError(error.code === 'PGRST205'
        ? 'A estrutura de estudos ainda não foi aplicada no Supabase. Execute a migration 20260909_add_weekly_goals_and_studies.sql.'
        : 'Não foi possível carregar os estudos.');
      return;
    }
    setRecords((data || []) as StudyRecord[]);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const resetForm = () => {
    setTitle('');
    setWeekday('1');
    setStudyDate(new Date().toISOString().slice(0, 10));
    setStartTime('19:00');
    setDuration('60');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const durationMinutes = Math.round(Number(duration));
    if (!title.trim() || !durationMinutes || durationMinutes < 1) {
      showError('Informe um título e uma duração válida.');
      return;
    }
    if (studyType === 'one_off' && !studyDate) {
      showError('Informe a data do estudo.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase.from('study_records').insert({
      user_id: user.id,
      title: title.trim(),
      study_type: studyType,
      weekday: studyType === 'fixed' ? Number(weekday) : null,
      study_date: studyType === 'one_off' ? studyDate : null,
      start_time: startTime || null,
      duration_minutes: durationMinutes,
    });
    setIsSaving(false);
    if (error) {
      showError(error.code === 'PGRST205'
        ? 'A tabela de estudos ainda não existe no Supabase. Execute a migration 20260909_add_weekly_goals_and_studies.sql.'
        : 'Não foi possível salvar o estudo.');
      return;
    }
    showSuccess('Estudo registrado!');
    resetForm();
    loadRecords();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('study_records').delete().eq('id', id);
    if (error) {
      showError('Erro ao excluir estudo.');
      return;
    }
    setRecords(current => current.filter(record => record.id !== id));
    showSuccess('Estudo removido.');
  };

  const formatSchedule = (record: StudyRecord) => {
    const time = record.start_time ? ` às ${record.start_time.slice(0, 5)}` : '';
    if (record.study_type === 'fixed') {
      return `${weekdays.find(day => day.value === String(record.weekday))?.label || 'Dia não definido'}${time}`;
    }
    return `${new Date(`${record.study_date}T12:00:00`).toLocaleDateString('pt-BR')}${time}`;
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Estudos</h1>
            <p className="text-muted-foreground mt-1">Registre aulas fixas e paradas de estudo para acompanhar sua meta semanal.</p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-500" /> Novo registro</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de estudo</Label>
                    <Select value={studyType} onValueChange={value => setStudyType(value as 'fixed' | 'one_off')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Aula fixa semanal</SelectItem>
                        <SelectItem value="one_off">Parada de estudo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do estudo</Label>
                    <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Aula de pós-flop" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {studyType === 'fixed' ? (
                    <div className="space-y-2"><Label>Dia da semana</Label><Select value={weekday} onValueChange={setWeekday}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{weekdays.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent></Select></div>
                  ) : (
                    <div className="space-y-2"><Label>Data</Label><Input type="date" value={studyDate} onChange={event => setStudyDate(event.target.value)} required /></div>
                  )}
                  <div className="space-y-2"><Label>Horário</Label><Input lang="en-GB" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></div>
                  <div className="space-y-2"><Label>Duração (minutos)</Label><Input type="number" min="1" step="1" value={duration} onChange={event => setDuration(event.target.value)} required /></div>
                </div>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white">{isSaving ? 'Salvando...' : 'Registrar estudo'}</Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(['fixed', 'one_off'] as const).map(type => (
              <Card key={type} className="bg-card border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-sky-500" />{type === 'fixed' ? 'Aulas fixas' : 'Paradas registradas'}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {records.filter(record => record.study_type === type).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro.</p> : records.filter(record => record.study_type === type).map(record => (
                    <div key={record.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                      <div className="min-w-0"><p className="font-semibold truncate">{record.title}</p><p className="text-sm text-muted-foreground">{formatSchedule(record)} · {record.duration_minutes} min</p></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="text-rose-500 shrink-0" title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="w-4 h-4" /> Aulas fixas são contabilizadas uma vez por semana, no dia configurado.</div>
        </div>
      </main>
    </div>
  );
};

export default Studies;
