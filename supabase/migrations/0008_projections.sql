-- Phase 5b: per-account investment projection assumptions (conservative/expected/
-- optimistic rate + monthly contribution). Rows are created lazily by the app the
-- first time a user saves/adjusts a projection, not backfilled for existing accounts.

create table if not exists account_projection_settings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  conservative_rate numeric(5, 2),
  expected_rate numeric(5, 2),
  optimistic_rate numeric(5, 2),
  monthly_contribution numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table account_projection_settings enable row level security;

drop policy if exists "account_projection_settings_all_own" on account_projection_settings;
create policy "account_projection_settings_all_own" on account_projection_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
