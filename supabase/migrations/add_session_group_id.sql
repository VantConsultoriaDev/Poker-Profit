alter table public.sessions
add column if not exists session_group_id uuid;

create index if not exists sessions_session_group_id_idx
on public.sessions (session_group_id);