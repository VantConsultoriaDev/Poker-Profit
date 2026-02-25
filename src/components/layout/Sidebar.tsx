"use client";

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlayCircle, 
  BookOpen, 
  BarChart3, 
  Users, 
  History, 
  UserCircle,
  LogOut,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: PlayCircle, label: 'Sessões', path: '/sessions' },
    { icon: BookOpen, label: 'Estudos', path: '/studies' },
    { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  ];

  const adminItems = [
    { icon: Users, label: 'Gestão de Usuários', path: '/admin/users' },
    { icon: History, label: 'Logs de Atividades', path: '/admin/logs' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess("Você saiu do sistema.");
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Poker Profit</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Menu Principal</p>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              location.pathname === item.path 
                ? "bg-emerald-500/10 text-emerald-400" 
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            )}
          >
            <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200")} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}

        <div className="pt-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Administração</p>
          {adminItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === item.path 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
            location.pathname === '/profile' ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          )}
        >
          <UserCircle className="w-5 h-5" />
          <span className="font-medium">Meu Perfil</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;