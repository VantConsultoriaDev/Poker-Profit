BEGIN;
ALTER TABLE public.finance_transactions ADD COLUMN IF NOT EXISTS affects_bankroll boolean;
COMMENT ON COLUMN public.finance_transactions.affects_bankroll IS 'true: pagamento pela banca; false: despesa externa. NULL: lançamento legado.';
COMMIT;
-- Verificação após aplicar:
SELECT type, affects_bankroll, count(*) FROM public.finance_transactions GROUP BY type, affects_bankroll;
-- Revisão de despesas legadas:
SELECT id, transaction_date, description, amount_brl FROM public.finance_transactions
WHERE type = 'expense' AND affects_bankroll IS NULL ORDER BY transaction_date;
-- Para uma despesa antiga cadastrada no Financeiro, confirme seu ID e execute:
-- UPDATE public.finance_transactions SET affects_bankroll = false WHERE id = 'ID_CONFIRMADO' AND type = 'expense';
