-- Tracks the actual OAuth scope Stripe granted for each connection, so the
-- app can tell read-only connections (default, Free) apart from read_write
-- ones (granted separately when a user enables Auto-Recovery / Pro) instead
-- of assuming every connection can charge invoices.
alter table public.stripe_connections
  add column if not exists scope text not null default 'read_only'
  check (scope in ('read_only', 'read_write'));

-- Existing connections were created before this column existed, under the
-- old flow that always requested read_write — backfill to match what
-- Stripe actually granted them (not reducing real, already-granted access).
update public.stripe_connections set scope = 'read_write';
