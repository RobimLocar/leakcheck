-- Recovery features: plan_type drift fix + auto-retry / email sequence / Slack alert columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

ALTER TABLE public.failed_payments
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_exhausted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_step INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_email_at TIMESTAMPTZ;
