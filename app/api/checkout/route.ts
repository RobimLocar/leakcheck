import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

type Plan = 'monthly' | 'lifetime'

const PLAN_CONFIG = {
  monthly: { name: 'LeakCheck Recovery', amount: 2900 },
  lifetime: { name: 'LeakCheck Lifetime', amount: 14900 },
} as const

// ── Stripe REST helpers ───────────────────────────────────────────────────────

async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
  })
  return res.json()
}

async function stripePost(path: string, params: Record<string, string>, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
    cache: 'no-store',
  })
  return res.json()
}

// ── Get or create a Stripe product + price for the given plan ─────────────────
// Uses metadata[leakcheck_plan] as the stable lookup key so we never create
// duplicates even across cold starts.

async function getOrCreatePrice(plan: Plan, key: string): Promise<string> {
  const { name, amount } = PLAN_CONFIG[plan]

  // 1. Find existing product
  const productQuery = new URLSearchParams({
    'metadata[leakcheck_plan]': plan,
    active: 'true',
    limit: '1',
  })
  const productList = await stripeGet(`/v1/products?${productQuery}`, key)

  let productId: string
  if (productList.data?.length > 0) {
    productId = productList.data[0].id as string
  } else {
    const product = await stripePost('/v1/products', {
      name,
      'metadata[leakcheck_plan]': plan,
    }, key)
    if (product.error) throw new Error(`Create product failed: ${product.error.message}`)
    productId = product.id as string
  }

  // 2. Find existing active price for this product
  const priceQuery = new URLSearchParams({
    product: productId,
    active: 'true',
    limit: '1',
  })
  const priceList = await stripeGet(`/v1/prices?${priceQuery}`, key)

  if (priceList.data?.length > 0) return priceList.data[0].id as string

  // 3. Create price
  const priceParams: Record<string, string> = {
    product: productId,
    currency: 'usd',
    unit_amount: String(amount),
  }
  if (plan === 'monthly') {
    priceParams['recurring[interval]'] = 'month'
  }
  const price = await stripePost('/v1/prices', priceParams, key)
  if (price.error) throw new Error(`Create price failed: ${price.error.message}`)
  return price.id as string
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const plan = body.plan as Plan
  if (plan !== 'monthly' && plan !== 'lifetime') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY!
  const origin = request.nextUrl.origin

  let priceId: string
  try {
    priceId = await getOrCreatePrice(plan, secretKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to prepare checkout'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const sessionParams: Record<string, string> = {
    mode: plan === 'monthly' ? 'subscription' : 'payment',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/dashboard?upgraded=true`,
    cancel_url: `${origin}/upgrade`,
    'metadata[user_id]': user.id,
    'metadata[plan]': plan,
  }
  if (user.email) sessionParams.customer_email = user.email

  const session = await stripePost('/v1/checkout/sessions', sessionParams, secretKey)

  if (session.error) {
    return NextResponse.json({ error: session.error.message }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
