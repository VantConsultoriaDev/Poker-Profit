alter table public.profiles
add column if not exists weekly_grind_goal_hours numeric not null default 0,
add column if not exists weekly_study_goal_hours numeric not null default 0;

create table if not exists public.study_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  study_type text not null default 'one_off' check (study_type in ('fixed', 'one_off')),
  weekday integer check (weekday between 0 and 6),
  study_date date,
  start_time time,
  duration_minutes integer not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint study_record_schedule_check check (
    (study_type = 'fixed' and weekday is not null) or
    (study_type = 'one_off' and study_date is not null)
  )
);

alter table public.study_records enable row level security;

create policy "Users can view own study records" on public.study_records
  for select using (auth.uid() = user_id);
create policy "Users can insert own study records" on public.study_records
  for insert with check (auth.uid() = user_id);
create policy "Users can update own study records" on public.study_records
  for update using (auth.uid() = user_id);
create policy "Users can delete own study records" on public.study_records
  for delete using (auth.uid() = user_id);

create index if not exists study_records_user_schedule_idx
on public.study_records (user_id, study_type, study_date, weekday);
