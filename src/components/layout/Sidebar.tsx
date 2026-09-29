"use client";

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlayCircle, 
  BookOpen, 
  BarChart3, 
  History, 
  UserCircle,
  LogOut, 
  TrendingUp, 
  Wallet,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';
import { ThemeToggle } from './ThemeToggle';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Início', path: '/' },
    { icon: PlayCircle, label: 'Sessões', shortLabel: 'Sessões', path: '/sessions' },
    { icon: BookOpen, label: 'Estudos', shortLabel: 'Estudos', path: '/studies' },
    { icon: Wallet, label: 'Financeiro', shortLabel: 'Financeiro', path: '/financeiro' },
    { icon: BarChart3, label: 'Fechamentos', shortLabel: 'Fechamentos', path: '/reports' },
  ];

  const adminItems = [
    { icon: History, label: 'Logs de Atividades', path: '/admin/logs' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess("Você saiu do sistema.");
    navigate('/login');
  };

  return (
    <>
      {/* 1. TOP HEADER MOBILE (< md) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 -ml-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <TrendingUp className="text-white w-4 h-4" />
            </div>
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Poker Profit</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link 
            to="/profile" 
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              location.pathname === '/profile'
                ? "text-emerald-500 bg-emerald-500/10"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
            )}
            aria-label="Perfil"
          >
            <UserCircle className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* 2. DRAWER OVERLAY MOBILE (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500 p-1.5 rounded-lg">
                  <TrendingUp className="text-white w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Poker Profit</h2>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Menu Principal</p>
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    location.pathname === item.path 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500")} />
                  <span>{item.label}</span>
                </Link>
              ))}

              <div className="pt-6">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Administração</p>
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                      location.pathname === item.path 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500")} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  location.pathname === '/profile' ? "bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900"
                )}
              >
                <UserCircle className="w-5 h-5" />
                <span className="font-medium">Meu Perfil</span>
              </Link>
              <button 
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SIDEBAR DESKTOP (Inalterada, apenas em telas md para cima) */}
      <aside className="hidden md:flex w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex-col h-screen sticky top-0 shrink-0">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Poker Profit</h1>
          </div>
          <ThemeToggle />
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
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200")} />
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
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
              location.pathname === '/profile' ? "bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <UserCircle className="w-5 h-5" />
            <span className="font-medium">Meu Perfil</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* 4. BOTTOM NAVIGATION BAR MOBILE (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-1 py-1.5 shadow-lg">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-all",
                isActive 
                  ? "text-emerald-500 font-bold" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-5 h-5 mb-0.5", isActive ? "text-emerald-500 stroke-[2.5]" : "text-slate-400")} />
              <span className="text-[10px] leading-tight tracking-tight">{item.shortLabel || item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;