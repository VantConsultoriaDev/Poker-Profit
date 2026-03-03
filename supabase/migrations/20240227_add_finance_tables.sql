-- Adiciona colunas de bankroll e transações à tabela weekly_rake
alter table public.weekly_rake 
add column if not exists bankroll_initial numeric default 0,
add column if not exists bankroll_final numeric default 0;

-- Tabela para extrato financeiro (recargas e saques)
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  type text not null check (type in ('deposit', 'withdraw')),
  amount_brl numeric not null default 0,
  account_id uuid references public.site_accounts(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  transaction_date timestamptz not null default now()
);

alter table public.finance_transactions enable row level security;

create policy "finance_transactions_select_own" on public.finance_transactions for select using (auth.uid() = user_id);
create policy "finance_transactions_insert_own" on public.finance_transactions for insert with check (auth.uid() = user_id);
create policy "finance_transactions_update_own" on public.finance_transactions for update using (auth.uid() = user_id);
create policy "finance_transactions_delete_own" on public.finance_transactions for delete using (auth.uid() = user_id);

create index if not exists finance_transactions_user_week_idx on public.finance_transactions (user_id, week_start, week_end);
