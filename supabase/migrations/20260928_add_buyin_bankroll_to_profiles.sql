-- Adiciona campos para a funcionalidade Banca de Buy-in
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS buyin_bankroll_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS buyin_bankroll_target NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyin_bankroll_manual_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyin_bankroll_is_manual BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS buyin_bankroll_current NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyin_bankroll_start_week TEXT DEFAULT NULL;
