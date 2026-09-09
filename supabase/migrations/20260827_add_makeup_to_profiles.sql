alter table public.profiles
add column if not exists makeup_value numeric not null default 0;
