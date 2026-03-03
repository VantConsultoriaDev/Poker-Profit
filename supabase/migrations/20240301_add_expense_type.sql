-- Atualiza a restrição de tipo para incluir 'expense'
ALTER TABLE public.finance_transactions 
DROP CONSTRAINT IF EXISTS finance_transactions_type_check;

ALTER TABLE public.finance_transactions 
ADD CONSTRAINT finance_transactions_type_check 
CHECK (type IN ('deposit', 'withdraw', 'expense'));
