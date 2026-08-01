-- Phase 4: unified goals framework (priority, cap + overflow, templates, optional
-- account linking), replacing savings_goals with a single migration.

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  template text,
  target_basis text not null check (target_basis in ('fixed_amount', 'n_months_expenses')) default 'fixed_amount',
  target_amount numeric(14, 2),
  target_months_expenses numeric(5, 2),
  target_date date,
  current_amount numeric(14, 2) not null default 0,
  linked_account_id uuid references accounts (id) on delete set null,
  priority integer not null default 0,
  cap_amount numeric(14, 2),
  overflow_goal_id uuid references goals (id) on delete set null,
  emoji text not null default '🎯',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table goals enable row level security;

drop policy if exists "goals_all_own" on goals;
create policy "goals_all_own" on goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists goals_user_idx on goals (user_id);

-- Migrate existing savings_goals into goals, preserving relative order via created_at.
insert into goals (user_id, name, emoji, target_basis, target_amount, target_date, current_amount, priority, created_at)
select user_id, name, emoji, 'fixed_amount', target_amount, deadline, current_amount,
       row_number() over (partition by user_id order by created_at) - 1, created_at
from savings_goals;

drop table if exists savings_goals;
