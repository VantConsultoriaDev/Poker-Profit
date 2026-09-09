alter table public.profiles
add column if not exists retro_hours numeric not null default 0,
add column if not exists retro_hands numeric not null default 0,
add column if not exists retro_rake_total numeric not null default 0,
add column if not exists retro_rake_deal numeric not null default 0,
add column if not exists retro_result numeric not null default 0;