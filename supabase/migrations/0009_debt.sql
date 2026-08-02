-- Phase 6: per-debt-account interest rate/minimum payment, and a remembered
-- portfolio-wide payoff strategy (avalanche/snowball) + extra monthly payment.

create table if not exists debt_details (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  interest_rate numeric(6, 3) not null default 0,
  minimum_payment numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table debt_details enable row level security;

drop policy if exists "debt_details_all_own" on debt_details;
create policy "debt_details_all_own" on debt_details for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists debt_payoff_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  strategy text not null check (strategy in ('avalanche', 'snowball')) default 'avalanche',
  extra_monthly_payment numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table debt_payoff_settings enable row level security;

drop policy if exists "debt_payoff_settings_all_own" on debt_payoff_settings;
create policy "debt_payoff_settings_all_own" on debt_payoff_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
