create table if not exists public.weekly_rake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  rake_total_brl numeric not null default 0,
  rake_deal_pct integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_rake_week_range_check check (week_end >= week_start),
  constraint weekly_rake_pct_check check (rake_deal_pct >= 0 and rake_deal_pct <= 100),
  constraint weekly_rake_unique unique (user_id, week_start, week_end)
);

alter table public.weekly_rake enable row level security;

create policy "weekly_rake_select_own"
on public.weekly_rake
for select
using (auth.uid() = user_id);

create policy "weekly_rake_insert_own"
on public.weekly_rake
for insert
with check (auth.uid() = user_id);

create policy "weekly_rake_update_own"
on public.weekly_rake
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "weekly_rake_delete_own"
on public.weekly_rake
for delete
using (auth.uid() = user_id);

create index if not exists weekly_rake_user_week_idx
on public.weekly_rake (user_id, week_start, week_end);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists weekly_rake_set_updated_at on public.weekly_rake;
create trigger weekly_rake_set_updated_at
before update on public.weekly_rake
for each row
execute function public.set_updated_at_timestamp();

