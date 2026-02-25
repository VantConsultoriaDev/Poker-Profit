"use client";

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { History, Info, AlertTriangle, CheckCircle } from 'lucide-react';

const logs = [
  { id: 1, user: 'Vinícius', action: 'Login realizado', time: '24/05/2024 14:20', type: 'info' },
  { id: 2, user: 'João', action: 'Sessão finalizada (NL50)', time: '24/05/2024 13:45', type: 'success' },
  { id: 3, user: 'Sistema', action: 'Backup automático concluído', time: '24/05/2024 03:00', type: 'info' },
  { id: 4, user: 'Maria', action: 'Tentativa de acesso negada', time: '23/05/2024 22:10', type: 'warning' },
];

const AdminLogs = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Logs de Atividades</h1>
            <p className="text-slate-400 mt-1">Histórico de eventos do sistema.</p>
          </div>

          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  log.type === 'info' ? 'bg-blue-500/10 text-blue-400' :
                  log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  {log.type === 'info' && <Info className="w-5 h-5" />}
                  {log.type === 'success' && <CheckCircle className="w-5 h-5" />}
                  {log.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{log.action}</p>
                  <p className="text-xs text-slate-500">Por <span className="text-slate-300">{log.user}</span> • {log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLogs;