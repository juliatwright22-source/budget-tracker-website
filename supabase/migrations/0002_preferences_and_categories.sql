-- Phase 0: user-configurable formatting preferences, and category ordering/visibility.

alter table profiles
  add column if not exists currency text not null default 'USD',
  add column if not exists locale text not null default 'en-US',
  add column if not exists date_format text not null default 'MM/DD/YYYY';

alter table categories
  add column if not exists display_order integer not null default 0,
  add column if not exists is_hidden boolean not null default false;
