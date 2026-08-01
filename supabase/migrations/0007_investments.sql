-- Phase 5a: investment holdings, trades, dividends, and a shared live-price cache
-- (written by the market-prices Edge Function via the service-role key).

create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  asset_class text not null default 'equity',
  shares numeric(20, 8) not null default 0,
  cost_basis_total numeric(14, 2) not null default 0,
  purchase_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, ticker)
);

alter table holdings enable row level security;

drop policy if exists "holdings_all_own" on holdings;
create policy "holdings_all_own" on holdings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  side text not null check (side in ('buy', 'sell')),
  shares numeric(20, 8) not null,
  price_per_share numeric(14, 4) not null,
  fees numeric(10, 2) not null default 0,
  trade_date date not null,
  realized_gain numeric(14, 2),
  cost_basis_at_sale numeric(14, 2),
  note text,
  created_at timestamptz not null default now()
);

alter table trades enable row level security;

drop policy if exists "trades_all_own" on trades;
create policy "trades_all_own" on trades for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists trades_account_idx on trades (account_id, ticker);

create table if not exists dividends (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  amount numeric(12, 2) not null,
  reinvested boolean not null default false,
  pay_date date not null,
  created_at timestamptz not null default now()
);

alter table dividends enable row level security;

drop policy if exists "dividends_all_own" on dividends;
create policy "dividends_all_own" on dividends for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared across all users; only the market-prices Edge Function (service-role key,
-- which bypasses RLS) writes here. Everyone signed in can read.
create table if not exists price_cache (
  ticker text primary key,
  price numeric(14, 4) not null,
  prev_close numeric(14, 4),
  fetched_at timestamptz not null default now()
);

alter table price_cache enable row level security;

drop policy if exists "price_cache_read_all" on price_cache;
create policy "price_cache_read_all" on price_cache for select
  using (auth.role() = 'authenticated');
