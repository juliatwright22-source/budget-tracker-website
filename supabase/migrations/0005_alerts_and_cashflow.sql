-- Phase 3: configurable budget alert thresholds, alert dismissal, and month-end
-- cash-flow intent/actual tracking.

alter table budget_goals add column if not exists alert_enabled boolean not null default false;
alter table budget_goals add column if not exists threshold_warning numeric(5, 2) not null default 80;
alter table budget_goals add column if not exists threshold_exceeded numeric(5, 2) not null default 100;
alter table budget_goals add column if not exists threshold_critical numeric(5, 2) not null default 110;

create table if not exists dismissed_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_key text not null,
  dismissed_at timestamptz not null default now(),
  unique (user_id, alert_key)
);

alter table dismissed_alerts enable row level security;

drop policy if exists "dismissed_alerts_all_own" on dismissed_alerts;
create policy "dismissed_alerts_all_own" on dismissed_alerts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists cash_flow_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  intent_description text,
  planned_amount numeric(12, 2),
  actual_description text,
  actual_amount numeric(12, 2),
  status text not null check (status in ('pending', 'declared', 'resolved')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

alter table cash_flow_intents enable row level security;

drop policy if exists "cash_flow_intents_all_own" on cash_flow_intents;
create policy "cash_flow_intents_all_own" on cash_flow_intents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
