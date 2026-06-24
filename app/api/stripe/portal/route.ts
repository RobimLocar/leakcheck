import { createClient } from '@/lib/supabase/server'
import { stripePost } from '@/lib/stripe/connectedAccountApi'
import { type NextRequest, NextResponse } from 'next/server'

// Creates a Stripe-hosted Billing Portal session so Pro customers can manage
// or cancel their LeakCheck subscription themselves (Terms of Service §5
// promises self-service cancellation). Uses the PLATFORM Stripe account
// (STRIPE_SECRET_KEY) — this is billing for LeakCheck itself, unrelated to
// the customer's own connected Stripe account used for payment recovery.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found. Upgrade to Pro first.' },
      { status: 400 },
    )
  }

  const origin = request.nextUrl.origin
  const session = await stripePost('/v1/billing_portal/sessions', {
    customer: profile.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  }, process.env.STRIPE_SECRET_KEY!)

  if (session.error) {
    return NextResponse.json({ error: session.error.message }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
