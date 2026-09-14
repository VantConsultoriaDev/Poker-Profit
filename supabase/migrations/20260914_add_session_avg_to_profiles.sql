-- Add weekly_session_avg_hours to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weekly_session_avg_hours numeric DEFAULT 2;

COMMENT ON COLUMN public.profiles.weekly_session_avg_hours IS 'Duração média estimada de uma sessão de grind em horas (ex: 2.0)';
