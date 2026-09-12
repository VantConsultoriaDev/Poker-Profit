-- Add profit_deal column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profit_deal numeric DEFAULT 100;

COMMENT ON COLUMN public.profiles.profit_deal IS 'Percentual de deal do jogador sobre os lucros (0 a 100)';
