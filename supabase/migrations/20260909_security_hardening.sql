-- Restrict user-owned tables to the authenticated owner.
-- The dynamic block keeps this migration safe when a table was created by an earlier schema migration.
do $$
declare
  table_name text;
  policy_name text;
  table_names text[] := array[
    'profiles',
    'sessions',
    'sites',
    'site_accounts',
    'activity_logs',
    'weekly_rake',
    'finance_transactions',
    'study_records',
    'database_uploads'
  ];
begin
  foreach table_name in array table_names loop
    if to_regclass(format('public.%s', table_name)) is not null
       and exists (
         select 1
        from information_schema.columns as c
         where c.table_schema = 'public'
           and c.table_name = table_name
           and c.column_name = 'user_id'
       ) then
      execute format('alter table public.%I enable row level security', table_name);

      for policy_name in
        select policyname
        from pg_policies as p
        where p.schemaname = 'public'
          and p.tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;

      execute format(
        'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        table_name || '_owner_only',
        table_name
      );
    end if;
  end loop;
end $$;

-- Prevent invalid financial values through direct API calls as well as through the UI.
do $$
begin
  if to_regclass('public.finance_transactions') is not null
     and not exists (select 1 from pg_constraint where conname = 'finance_transactions_amount_nonnegative') then
    alter table public.finance_transactions
      add constraint finance_transactions_amount_nonnegative check (amount_brl >= 0) not valid;
  end if;

  if to_regclass('public.weekly_rake') is not null
     and not exists (select 1 from pg_constraint where conname = 'weekly_rake_amounts_nonnegative') then
    alter table public.weekly_rake
      add constraint weekly_rake_amounts_nonnegative check (
        rake_total_brl >= 0 and bankroll_initial >= 0 and bankroll_final >= 0
      ) not valid;
  end if;

  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'profiles_weekly_goals_nonnegative') then
    alter table public.profiles
      add constraint profiles_weekly_goals_nonnegative check (
        weekly_grind_goal_hours >= 0 and weekly_study_goal_hours >= 0
      ) not valid;
  end if;
end $$;
