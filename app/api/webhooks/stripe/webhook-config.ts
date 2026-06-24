/**
 * Stripe Webhook Setup Guide
 * ==========================
 *
 * STEP 1 — Add the plan_type column to Supabase (run once in SQL Editor):
 *
 *   alter table public.profiles
 *     add column if not exists plan_type text not null default 'free';
 *
 *
 * STEP 2 — Register the webhook endpoint in Stripe Dashboard:
 *
 *   1. Go to https://dashboard.stripe.com/webhooks
 *   2. Click "Add endpoint"
 *   3. Endpoint URL: <your production domain>/api/webhooks/stripe
 *   4. Under "Select events", add:
 *        ✓ checkout.session.completed
 *        ✓ customer.subscription.deleted
 *   5. Click "Add endpoint"
 *   6. On the endpoint detail page, reveal the "Signing secret" (starts with whsec_)
 *   7. Copy it into .env.local:
 *        STRIPE_WEBHOOK_SECRET=whsec_...
 *   8. Add the same variable to your Vercel project environment variables.
 *
 *
 * STEP 3 — Local development (optional, requires Stripe CLI):
 *
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *
 *   The CLI prints a temporary webhook secret (whsec_...) — use that as
 *   STRIPE_WEBHOOK_SECRET in .env.local while testing locally.
 *   The production secret from Step 2 goes into Vercel only.
 *
 *
 * Events handled by route.ts:
 *   checkout.session.completed    → sets is_pro=true, stores stripe_customer_id & plan_type
 *   customer.subscription.deleted → sets is_pro=false (monthly cancellations only;
 *                                    lifetime users are unaffected — no subscription exists)
 */

export const WEBHOOK_ENDPOINT = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leakcheck-three.vercel.app'}/api/webhooks/stripe`

export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.deleted',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]
