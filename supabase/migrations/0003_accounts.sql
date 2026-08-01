-- Phase 1: accounts (checking/savings/investment/debt/etc.), net worth tracking,
-- and a trigger that keeps cash-account balances in sync with transactions.

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  institution_name text,
  account_class text not null check (account_class in ('cash', 'investment', 'debt')),
  account_type text not null,
  is_custom_type boolean not null default false,
  starting_balance numeric(14, 2) not null default 0,
  current_balance numeric(14, 2) not null default 0,
  min_balance_floor numeric(14, 2),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table accounts enable row level security;

drop policy if exists "accounts_all_own" on accounts;
create policy "accounts_all_own" on accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists accounts_user_idx on accounts (user_id);

-- Link transactions to an account (optional)
alter table transactions add column if not exists account_id uuid references accounts (id) on delete set null;

create index if not exists transactions_account_idx on transactions (account_id);

-- Keep cash-account current_balance in sync with linked transactions.
-- Only account_class='cash' is auto-maintained in this phase; investment/debt
-- balances stay manually editable until Phases 5/6 add holdings and payoff logic.
create or replace function sync_account_balance() returns trigger as $$
declare
  old_class text;
  new_class text;
begin
  -- Reverse the old row's effect, if it was linked to a cash account.
  if tg_op in ('UPDATE', 'DELETE') and old.account_id is not null then
    select account_class into old_class from accounts where id = old.account_id;
    if old_class = 'cash' then
      update accounts
        set current_balance = current_balance - (case when old.type = 'income' then old.amount else -old.amount end),
            updated_at = now()
        where id = old.account_id;
    end if;
  end if;

  -- Apply the new row's effect, if it's linked to a cash account.
  if tg_op in ('UPDATE', 'INSERT') and new.account_id is not null then
    select account_class into new_class from accounts where id = new.account_id;
    if new_class = 'cash' then
      update accounts
        set current_balance = current_balance + (case when new.type = 'income' then new.amount else -new.amount end),
            updated_at = now()
        where id = new.account_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists transactions_sync_account_balance on transactions;
create trigger transactions_sync_account_balance
  after insert or update or delete on transactions
  for each row execute function sync_account_balance();
