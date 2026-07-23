-- MacroBook Phase 1 schema: profiles, food_logs, saved_recipes
-- All tables use row-level security so each user only ever sees their own data.

create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type food_source as enum ('usda', 'manual');
create type recipe_source_type as enum ('spoonacular', 'youtube', 'tiktok', 'manual');

-- profiles: one row per auth user, created via trigger on signup
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  daily_calorie_goal integer,
  protein_goal_g integer,
  carbs_goal_g integer,
  fat_goal_g integer,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: select own" on profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- food_logs
create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_name text not null,
  calories integer not null,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  source food_source not null default 'manual',
  meal_type meal_type not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index food_logs_user_logged_at_idx on food_logs (user_id, logged_at desc);

alter table food_logs enable row level security;

create policy "food_logs: select own" on food_logs
  for select using (auth.uid() = user_id);
create policy "food_logs: insert own" on food_logs
  for insert with check (auth.uid() = user_id);
create policy "food_logs: update own" on food_logs
  for update using (auth.uid() = user_id);
create policy "food_logs: delete own" on food_logs
  for delete using (auth.uid() = user_id);

-- saved_recipes
create table saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source_type recipe_source_type not null default 'manual',
  source_url text,
  raw_caption text,
  created_at timestamptz not null default now()
);

create index saved_recipes_user_created_idx on saved_recipes (user_id, created_at desc);

alter table saved_recipes enable row level security;

create policy "saved_recipes: select own" on saved_recipes
  for select using (auth.uid() = user_id);
create policy "saved_recipes: insert own" on saved_recipes
  for insert with check (auth.uid() = user_id);
create policy "saved_recipes: update own" on saved_recipes
  for update using (auth.uid() = user_id);
create policy "saved_recipes: delete own" on saved_recipes
  for delete using (auth.uid() = user_id);
