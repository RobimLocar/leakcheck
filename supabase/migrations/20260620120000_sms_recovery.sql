-- SMS recovery channel: store the customer's phone number from Stripe invoices
ALTER TABLE public.failed_payments ADD COLUMN IF NOT EXISTS customer_phone TEXT;
