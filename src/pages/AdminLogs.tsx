"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { History, Info, AlertTriangle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logs de Atividades</h1>
            <p className="text-muted-foreground mt-1">Histórico de eventos reais do sistema.</p>
          </div>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-20 bg-card border border-border rounded-xl">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    log.type === 'info' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    log.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    log.type === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {log.type === 'info' && <Info className="w-5 h-5" />}
                    {log.type === 'success' && <CheckCircle className="w-5 h-5" />}
                    {log.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                    {log.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{log.action}</p>
                    {log.details && <p className="text-sm text-muted-foreground">{log.details}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminLogs;