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
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Logs de Atividades</h1>
            <p className="text-slate-400 mt-1">Histórico de eventos reais do sistema.</p>
          </div>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-20 bg-slate-900 border border-slate-800 rounded-xl">
              <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    log.type === 'info' ? 'bg-blue-500/10 text-blue-400' :
                    log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                    log.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>
                    {log.type === 'info' && <Info className="w-5 h-5" />}
                    {log.type === 'success' && <CheckCircle className="w-5 h-5" />}
                    {log.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                    {log.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{log.action}</p>
                    {log.details && <p className="text-sm text-slate-400">{log.details}</p>}
                    <p className="text-xs text-slate-500 mt-1">
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