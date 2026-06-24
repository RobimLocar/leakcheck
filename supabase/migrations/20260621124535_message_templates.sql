-- Lets Pro users customize their own recovery email/SMS copy instead of
-- being stuck with a hardcoded message (the #1 complaint about the market
-- leader, Paddle/ProfitWell Retain, is that customers can't edit the email
-- text themselves without contacting support).
-- Shape: { "sms": { "1": "...", "2": "...", "3": "..." }, "email": { "1": "...", "2": "...", "3": "..." } }
-- Missing/empty keys fall back to the built-in defaults in lib/recovery/messageTemplates.ts.
alter table public.profiles
  add column if not exists message_templates jsonb not null default '{}'::jsonb;
