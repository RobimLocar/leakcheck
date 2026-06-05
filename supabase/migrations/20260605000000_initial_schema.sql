-- =================================================================
-- LeakCheck — Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =================================================================


-- -----------------------------------------------------------------
-- TABLE: profiles
-- One row per auth user, created automatically on signup via trigger.
-- -----------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text,
  is_pro              boolean     not null default false,
  stripe_customer_id  text,
  created_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- TABLE: stripe_connections
-- Stores the OAuth token obtained after a user connects their Stripe
-- account. One connection per user (unique on stripe_account_id).
-- NOTE: access_token is stored in plaintext here. For production,
-- consider encrypting with Supabase Vault (vault.create_secret).
-- -----------------------------------------------------------------
create table if not exists public.stripe_connections (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  stripe_account_id text        unique not null,
  access_token      text        not null,
  created_at        timestamptz not null default now()
);

create index if not exists stripe_connections_user_id_idx
  on public.stripe_connections(user_id);

-- -----------------------------------------------------------------
-- TABLE: failed_payments
-- One row per failed Stripe invoice. Synced server-side using the
-- service role key; status transitions: open → recovered | lost.
-- amount is in the smallest currency unit (cents for USD).
-- -----------------------------------------------------------------
create table if not exists public.failed_payments (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  stripe_invoice_id text        unique not null,
  customer_name     text,
  customer_email    text,
  amount            integer     not null,
  currency          text        not null default 'usd',
  failure_reason    text,
  status            text        not null default 'open'
                    check (status in ('open', 'recovered', 'lost')),
  created_at        timestamptz not null default now()
);

create index if not exists failed_payments_user_id_idx
  on public.failed_payments(user_id);
create index if not exists failed_payments_status_idx
  on public.failed_payments(status);


-- =================================================================
-- ROW LEVEL SECURITY
-- =================================================================
alter table public.profiles          enable row level security;
alter table public.stripe_connections enable row level security;
alter table public.failed_payments    enable row level security;


-- -----------------------------------------------------------------
-- POLICIES: profiles
-- -----------------------------------------------------------------
create policy "profiles: owner select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);


-- -----------------------------------------------------------------
-- POLICIES: stripe_connections
-- -----------------------------------------------------------------
create policy "stripe_connections: owner select"
  on public.stripe_connections for select
  using (auth.uid() = user_id);

create policy "stripe_connections: owner insert"
  on public.stripe_connections for insert
  with check (auth.uid() = user_id);

create policy "stripe_connections: owner delete"
  on public.stripe_connections for delete
  using (auth.uid() = user_id);


-- -----------------------------------------------------------------
-- POLICIES: failed_payments
-- (inserts/updates are done server-side with the service role key,
--  which bypasses RLS — these policies cover client-side reads)
-- -----------------------------------------------------------------
create policy "failed_payments: owner select"
  on public.failed_payments for select
  using (auth.uid() = user_id);

create policy "failed_payments: owner update"
  on public.failed_payments for update
  using (auth.uid() = user_id);


-- =================================================================
-- TRIGGER: auto-create profile on new user signup
-- =================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
