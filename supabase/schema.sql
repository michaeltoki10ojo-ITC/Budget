create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  rounding_default_mode text not null default 'nearest_5',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  opening_balance_cents integer not null default 0,
  logo_path text,
  rounding_override_mode text not null default 'inherit_default',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'adjustment', 'transfer_out', 'transfer_in')),
  name text not null,
  amount_cents integer not null,
  date date not null,
  linked_transfer_id uuid,
  recurring_rule_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  constraint transactions_recurring_occurrence_key unique (recurring_rule_id, date)
);

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'adjustment')),
  name text not null,
  amount_cents integer not null,
  cadence text not null check (cadence in ('weekly', 'biweekly', 'monthly')),
  start_date date not null,
  next_run_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_recurring_rule_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_recurring_rule_id_fkey
      foreign key (recurring_rule_id)
      references public.recurring_rules (id)
      on delete set null;
  end if;
end
$$;

create table if not exists public.wants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents > 0),
  url text not null,
  image_path text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists rounding_default_mode text;

update public.profiles
set rounding_default_mode = 'nearest_5'
where rounding_default_mode is null;

alter table public.profiles
  alter column rounding_default_mode set default 'nearest_5';

alter table public.profiles
  alter column rounding_default_mode set not null;

alter table public.accounts
  add column if not exists rounding_override_mode text;

update public.accounts
set rounding_override_mode = 'inherit_default'
where rounding_override_mode is null;

alter table public.accounts
  alter column rounding_override_mode set default 'inherit_default';

alter table public.accounts
  alter column rounding_override_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_rounding_default_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_rounding_default_mode_check
      check (rounding_default_mode in ('exact', 'nearest_5', 'nearest_10'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_rounding_override_mode_check'
  ) then
    alter table public.accounts
      add constraint accounts_rounding_override_mode_check
      check (rounding_override_mode in ('inherit_default', 'exact', 'nearest_5', 'nearest_10'));
  end if;
end
$$;

create index if not exists accounts_user_id_sort_order_idx
  on public.accounts (user_id, sort_order);

create index if not exists transactions_user_id_account_id_date_idx
  on public.transactions (user_id, account_id, date desc, created_at desc);

create index if not exists recurring_rules_user_id_next_run_date_idx
  on public.recurring_rules (user_id, next_run_date);

create index if not exists wants_user_id_created_at_idx
  on public.wants (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.wants enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_write_own" on public.profiles;
drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_write_own" on public.accounts;
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_write_own" on public.transactions;
drop policy if exists "recurring_rules_select_own" on public.recurring_rules;
drop policy if exists "recurring_rules_write_own" on public.recurring_rules;
drop policy if exists "wants_select_own" on public.wants;
drop policy if exists "wants_write_own" on public.wants;
drop policy if exists "budget_images_select_own" on storage.objects;
drop policy if exists "budget_images_insert_own" on storage.objects;
drop policy if exists "budget_images_update_own" on storage.objects;
drop policy if exists "budget_images_delete_own" on storage.objects;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_write_own"
  on public.profiles
  for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "accounts_select_own"
  on public.accounts
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "accounts_write_own"
  on public.accounts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "transactions_select_own"
  on public.transactions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "transactions_write_own"
  on public.transactions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "recurring_rules_select_own"
  on public.recurring_rules
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "recurring_rules_write_own"
  on public.recurring_rules
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wants_select_own"
  on public.wants
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "wants_write_own"
  on public.wants
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, rounding_default_mode)
  values (new.id, new.email, 'nearest_5')
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('budget-images', 'budget-images', false, 5242880, array['image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "budget_images_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'budget-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "budget_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'budget-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "budget_images_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'budget-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'budget-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "budget_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'budget-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
