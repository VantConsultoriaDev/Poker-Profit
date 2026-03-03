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
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Financeiro from "./pages/Financeiro";
import AdminLogs from "./pages/AdminLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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