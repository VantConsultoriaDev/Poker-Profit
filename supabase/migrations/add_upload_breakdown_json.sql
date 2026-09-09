alter table public.database_uploads
add column if not exists hands_by_account_id jsonb not null default '{}'::jsonb,
add column if not exists hours_by_account_id jsonb not null default '{}'::jsonb;
