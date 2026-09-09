alter table public.site_accounts
add column if not exists account_external_id text;

create index if not exists site_accounts_user_external_id_idx
on public.site_accounts (user_id, account_external_id);

create table if not exists public.database_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text,
  file_count integer not null default 0,
  hands_found integer not null default 0,
  total_hours numeric not null default 0,
  sessions_found integer not null default 0,
  sessions_imported integer not null default 0,
  account_external_ids text[] not null default '{}'::text[],
  matched_account_external_ids text[] not null default '{}'::text[],
  missing_account_external_ids text[] not null default '{}'::text[],
  created_at timestamp with time zone not null default now()
);

alter table public.database_uploads enable row level security;

create policy "database_uploads_select_own"
on public.database_uploads
for select
using (auth.uid() = user_id);

create policy "database_uploads_insert_own"
on public.database_uploads
for insert
with check (auth.uid() = user_id);

create policy "database_uploads_delete_own"
on public.database_uploads
for delete
using (auth.uid() = user_id);

alter table public.sessions
add column if not exists import_upload_id uuid references public.database_uploads(id) on delete set null;

create index if not exists sessions_import_upload_id_idx
on public.sessions (import_upload_id);
