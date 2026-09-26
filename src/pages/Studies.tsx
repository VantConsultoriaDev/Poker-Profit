"use client";

import React, { useState, useMemo } from 'react';
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
import { BookOpen, Clock3, Plus, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateFilter, { Period } from '@/components/dashboard/DateFilter';
import { 
  formatHoursMinutes, 
  getFilterPeriodRange, 
  calculateStudyMinutesInInterval 
} from '@/lib/goals';

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
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>('this_week');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | undefined>();

  const [studyType, setStudyType] = useState<'fixed' | 'one_off'>('fixed');
  const [title, setTitle] = useState('');
  const [weekday, setWeekday] = useState('1');
  const [studyDate, setStudyDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('19:00');
  const [duration, setDuration] = useState('60');
  const [isSaving, setIsSaving] = useState(false);

  // Perfil do usuário para meta semanal de estudos
  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('profiles')
        .select('weekly_study_goal_hours')
        .eq('id', user.id)
        .maybeSingle();
      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        return null;
      }
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  // Registros de estudo
  const { data: records = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['study_records'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('study_records')
        .select('*')
        .eq('user_id', user.id)
        .order('study_type')
        .order('weekday')
        .order('study_date');
      if (error) throw error;
      return (data || []) as StudyRecord[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  // Cálculos de período e meta de estudo proporcional
  const earliestStudyDate = useMemo(() => {
    const dates = records
      .filter(r => r.study_date)
      .map(r => new Date(r.study_date!).getTime());
    return dates.length > 0 ? new Date(Math.min(...dates)) : undefined;
  }, [records]);

  const periodRange = useMemo(() => {
    return getFilterPeriodRange(period, customRange, earliestStudyDate);
  }, [period, customRange, earliestStudyDate]);

  const { startDate, endDate, daysCount, periodLabel } = periodRange;

  const baseWeeklyStudy = Number(profile?.weekly_study_goal_hours || 0);
  const studyGoalHours = (baseWeeklyStudy / 7) * daysCount;

  const studyMinutesInPeriod = useMemo(() => {
    return calculateStudyMinutesInInterval(records, startDate, endDate);
  }, [records, startDate, endDate]);

  const studyCompletedHours = studyMinutesInPeriod / 60;
  const studyProgressPercent = studyGoalHours > 0
    ? Math.min(100, (studyCompletedHours / studyGoalHours) * 100)
    : 0;

  // Filtragem das paradas registradas (one_off) pelo período selecionado
  const filteredOneOffRecords = useMemo(() => {
    return records
      .filter(record => record.study_type === 'one_off')
      .filter(record => {
        if (!record.study_date) return false;
        const d = new Date(`${record.study_date}T12:00:00`);
        return d >= startDate && d <= endDate;
      });
  }, [records, startDate, endDate]);

  const fixedRecords = useMemo(() => {
    return records.filter(record => record.study_type === 'fixed');
  }, [records]);

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
    queryClient.invalidateQueries({ queryKey: ['study_records'] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('study_records').delete().eq('id', id);
    if (error) {
      showError('Erro ao excluir estudo.');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['study_records'] });
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Estudos</h1>
              <p className="text-muted-foreground mt-1">Registre aulas fixas e paradas de estudo para acompanhar sua meta.</p>
            </div>
            <DateFilter period={period} onPeriodChange={(p, r) => { setPeriod(p); setCustomRange(r); }} />
          </div>

          {/* Card de Meta de Estudo com Barra de Progresso */}
          {isLoadingProfile || isLoadingRecords ? (
            <Card className="bg-card border-border animate-pulse h-24" />
          ) : studyGoalHours > 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta de estudo</p>
                    <p className="text-lg font-bold">
                      {formatHoursMinutes(studyCompletedHours)} / {formatHoursMinutes(studyGoalHours)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-sky-500">{Math.round(studyProgressPercent)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-sky-500 transition-all" 
                    style={{ width: `${studyProgressPercent}%` }} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">Horas de estudo {periodLabel}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Formulário Novo Registro */}
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

          {/* Listagem em duas colunas: Aulas fixas e Paradas registradas (filtradas) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna 1: Aulas Fixas */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-sky-500" />
                    Aulas fixas
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Semanal recorrente
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fixedRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma aula fixa configurada.</p>
                ) : (
                  fixedRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{record.title}</p>
                        <p className="text-sm text-muted-foreground">{formatSchedule(record)} · {record.duration_minutes} min</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="text-rose-500 shrink-0" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Coluna 2: Paradas Registradas (Filtradas pelo Período) */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-500" />
                    Paradas registradas
                  </span>
                  <span className="text-xs font-normal text-muted-foreground capitalize">
                    {periodLabel} ({filteredOneOffRecords.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredOneOffRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma parada de estudo registrada {periodLabel}.</p>
                ) : (
                  filteredOneOffRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{record.title}</p>
                        <p className="text-sm text-muted-foreground">{formatSchedule(record)} · {record.duration_minutes} min</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="text-rose-500 shrink-0" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="w-4 h-4" /> Aulas fixas são contabilizadas de acordo com a ocorrência do dia configurado dentro do período selecionado.
          </div>
        </div>
      </main>
    </div>
  );
};

export default Studies;
