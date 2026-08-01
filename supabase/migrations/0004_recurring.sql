-- Phase 2: recurring transaction rules (bills, paycheck schedules) and per-occurrence
-- skip/edit exceptions.

create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  category_id uuid references categories (id) on delete set null,
  account_id uuid references accounts (id) on delete set null,
  name text not null,
  amount numeric(12, 2) not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
  start_date date not null,
  end_date date,
  next_occurrence date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table recurring_rules enable row level security;

drop policy if exists "recurring_rules_all_own" on recurring_rules;
create policy "recurring_rules_all_own" on recurring_rules for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists recurring_rules_user_idx on recurring_rules (user_id);

create table if not exists recurring_rule_exceptions (
  id uuid primary key default gen_random_uuid(),
  recurring_rule_id uuid not null references recurring_rules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  occurrence_date date not null,
  action text not null check (action in ('skip', 'edit')),
  override_amount numeric(12, 2),
  override_date date,
  override_note text,
  created_at timestamptz not null default now(),
  unique (recurring_rule_id, occurrence_date)
);

alter table recurring_rule_exceptions enable row level security;

drop policy if exists "recurring_rule_exceptions_all_own" on recurring_rule_exceptions;
create policy "recurring_rule_exceptions_all_own" on recurring_rule_exceptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table transactions add column if not exists recurring_rule_id uuid references recurring_rules (id) on delete set null;
alter table transactions add column if not exists is_recurring_generated boolean not null default false;
