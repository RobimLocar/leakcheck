-- Tracks when a user's Pro subscription ended, so win-back email sequences
-- can anchor their day-count on the cancellation date instead of the much
-- older signup/Stripe-connection date.
alter table public.profiles
  add column if not exists churned_at timestamptz;
