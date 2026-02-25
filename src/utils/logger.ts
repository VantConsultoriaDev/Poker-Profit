import { supabase } from "@/integrations/supabase/client";

export const logActivity = async (action: string, details?: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_logs').insert([{
    user_id: user.id,
    action,
    details,
    type
  }]);
};