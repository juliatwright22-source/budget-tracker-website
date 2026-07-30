-- Baseline schema for Yachty, documenting the tables/RLS that already exist in the
-- live Supabase project (reconstructed from application code — no migrations existed
-- before this file). Written idempotently (IF NOT EXISTS / DROP POLICY IF EXISTS) so
-- it is safe to run against the existing live project without erroring on objects that
-- are already there, and also reproducible on a fresh project.

-- profiles: one row per auth user
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '📦',
  color text not null default '#004E72',
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

drop policy if exists "categories_all_own" on categories;
create policy "categories_all_own" on categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null,
  category_id uuid references categories (id) on delete set null,
  date date not null,
  note text,
  receipt_url text,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;

drop policy if exists "transactions_all_own" on transactions;
create policy "transactions_all_own" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists transactions_user_date_idx on transactions (user_id, date);

-- budget_goals
create table if not exists budget_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  monthly_limit numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table budget_goals enable row level security;

drop policy if exists "budget_goals_all_own" on budget_goals;
create policy "budget_goals_all_own" on budget_goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- savings_goals (superseded by the `goals` framework in a later phase — kept as-is here
-- since this migration only documents current state)
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '🎯',
  target_amount numeric(14, 2) not null,
  current_amount numeric(14, 2) not null default 0,
  deadline date,
  created_at timestamptz not null default now()
);

alter table savings_goals enable row level security;

drop policy if exists "savings_goals_all_own" on savings_goals;
create policy "savings_goals_all_own" on savings_goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- storage: receipts bucket + per-user folder policies (path convention: {user_id}/...)
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', true)
  on conflict (id) do nothing;

drop policy if exists "receipts_read_own" on storage.objects;
create policy "receipts_read_own" on storage.objects for select
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "receipts_write_own" on storage.objects;
create policy "receipts_write_own" on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_delete_own" on storage.objects for delete
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
