alter table public.profiles
add column if not exists default_limit text default 'PLO40';
