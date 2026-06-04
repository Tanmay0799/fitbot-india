-- ============================================================
-- FitBot India — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text,
  language     text default 'en',
  voice_lang   text default 'en-IN',
  cal_goal     int  default 2000,
  protein_goal int  default 120,
  water_goal   int  default 8,
  burn_goal    int  default 500,
  created_at   timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can manage own profile"
  on profiles for all using (auth.uid() = id);

-- auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles(id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── FOOD LOGS ─────────────────────────────────────────────────
create table if not exists food_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,
  name       text not null,
  calories   numeric default 0,
  protein    numeric default 0,
  carbs      numeric default 0,
  fat        numeric default 0,
  meal_type  text default 'other',  -- breakfast/lunch/dinner/snack/other
  logged_at  timestamptz default now()
);
alter table food_logs enable row level security;
create policy "Users can manage own food logs"
  on food_logs for all using (auth.uid() = user_id);
create index food_logs_user_date on food_logs(user_id, logged_at);

-- ── WORKOUT LOGS ──────────────────────────────────────────────
create table if not exists workout_logs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references profiles(id) on delete cascade,
  name         text not null,
  calories_burned numeric default 0,
  duration_min int  default 0,
  logged_at    timestamptz default now()
);
alter table workout_logs enable row level security;
create policy "Users can manage own workout logs"
  on workout_logs for all using (auth.uid() = user_id);

-- ── WATER LOGS ────────────────────────────────────────────────
create table if not exists water_logs (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid references profiles(id) on delete cascade,
  glasses   numeric default 1,
  logged_at timestamptz default now()
);
alter table water_logs enable row level security;
create policy "Users can manage own water logs"
  on water_logs for all using (auth.uid() = user_id);

-- ── ALARMS ────────────────────────────────────────────────────
create table if not exists alarms (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,
  icon       text default '💧',
  label      text not null,
  time       text not null,   -- "HH:MM" 24h format
  repeat     text default 'daily',  -- daily/weekdays/weekends/once
  active     boolean default true,
  created_at timestamptz default now()
);
alter table alarms enable row level security;
create policy "Users can manage own alarms"
  on alarms for all using (auth.uid() = user_id);

-- ── CHAT HISTORY ──────────────────────────────────────────────
create table if not exists chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,
  role       text not null,   -- 'user' | 'assistant'
  content    text not null,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "Users can manage own chat"
  on chat_messages for all using (auth.uid() = user_id);
create index chat_messages_user_date on chat_messages(user_id, created_at);

-- ── DAILY SUMMARY VIEW ────────────────────────────────────────
create or replace view daily_summary as
select
  p.id as user_id,
  current_date as date,
  coalesce((select sum(calories) from food_logs f where f.user_id = p.id and f.logged_at::date = current_date), 0) as calories_in,
  coalesce((select sum(protein) from food_logs f where f.user_id = p.id and f.logged_at::date = current_date), 0) as protein_in,
  coalesce((select sum(glasses) from water_logs w where w.user_id = p.id and w.logged_at::date = current_date), 0) as water_glasses,
  coalesce((select sum(calories_burned) from workout_logs w where w.user_id = p.id and w.logged_at::date = current_date), 0) as calories_burned
from profiles p;

-- Done! ✅
