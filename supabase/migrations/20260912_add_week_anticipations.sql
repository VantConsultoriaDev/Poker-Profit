-- Migration: Add week anticipations support  
create index if not exists finance_transactions_type_date_idx on public.finance_transactions (user_id, week_start, week_end, type, transaction_date); 
