"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Sessions from "./pages/Sessions";
import Studies from "./pages/Studies";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Financeiro from "./pages/Financeiro";
import AdminLogs from "./pages/AdminLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error || !currentSession) {
          if (mounted) {
            setSession(null);
            setLoading(false);
          }
          return;
        }

        // Verifica se o access_token já expirou ou está a menos de 60 segundos de expirar
        const expiresAt = currentSession.expires_at; // timestamp em segundos
        const isExpired = expiresAt ? (expiresAt * 1000) < (Date.now() + 60000) : false;

        if (isExpired) {
          // Token expirado: tenta renovar antes de liberar as rotas da aplicação
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.warn("Sessão expirada e não pôde ser renovada. Redirecionando para login.");
            await supabase.auth.signOut();
            if (mounted) {
              setSession(null);
              setLoading(false);
            }
            return;
          }
          if (mounted) {
            setSession(refreshData.session);
            setLoading(false);
          }
        } else {
          if (mounted) {
            setSession(currentSession);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Erro ao inicializar sessão:", err);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // Quando o token é renovado ou o usuário entra, invalida todas as queries para recarregar dados frescos
        queryClient.invalidateQueries();
      } else if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
                <Route path="/" element={session ? <Index /> : <Navigate to="/login" />} />
                <Route path="/sessions" element={session ? <Sessions /> : <Navigate to="/login" />} />
                <Route path="/studies" element={session ? <Studies /> : <Navigate to="/login" />} />
                <Route path="/reports" element={session ? <Reports /> : <Navigate to="/login" />} />
                <Route path="/financeiro" element={session ? <Financeiro /> : <Navigate to="/login" />} />
                <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" />} />
                <Route path="/admin/logs" element={session ? <AdminLogs /> : <Navigate to="/login" />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;