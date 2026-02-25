"use client";

import { Toaster } from "@/components/ui/toast";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import Index from "./pages/Index";
import Sessions from "./pages/Sessions";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Studies from "./pages/Studies";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";
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
              <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" />} />
              
              {/* Admin Routes */}
              <Route path="/admin/users" element={session ? <AdminUsers /> : <Navigate to="/login" />} />
              <Route path="/admin/logs" element={session ? <AdminLogs /> : <Navigate to="/login" />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
};

export default App;