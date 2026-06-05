import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac, timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'

// ── Signature verification ────────────────────────────────────────────────────
// Implemented manually (no SDK) — mirrors the algorithm in stripe-node.

const TOLERANCE_SEC = 300 // reject events older than 5 minutes

function verifySignature(rawBody: string, sigHeader: string, secret: string): boolean {
  const parts: Record<string, string[]> = {}
  sigHeader.split(',').forEach(part => {
    const [k, ...v] = part.split('=')
    ;(parts[k] ??= []).push(v.join('='))
  })

  const timestamp = parts['t']?.[0]
  const sigs = parts['v1'] ?? []
  if (!timestamp || !sigs.length) return false

  const skew = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10))
  if (skew > TOLERANCE_SEC) return false

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')

  return sigs.some(sig => {
    try {
      return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
    } catch {
      return false
    }
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────
// Must read the raw body BEFORE parsing — signature is over the raw bytes.

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sigHeader = request.headers.get('stripe-signature') ?? ''

  if (!verifySignature(rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET!)) {
    return new NextResponse('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(rawBody)
  const admin = createAdminClient()

  try {
    // ── checkout.session.completed ──────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId     = session.metadata?.user_id as string | undefined
      const plan       = (session.metadata?.plan ?? 'monthly') as string
      const customerId = session.customer as string | null

      if (userId) {
        await admin
          .from('profiles')
          .update({
            is_pro: true,
            stripe_customer_id: customerId,
            // plan_type requires: ALTER TABLE public.profiles
            //   ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free';
            // (see webhook-config.ts for the full migration SQL)
            plan_type: plan === 'lifetime' ? 'lifetime' : 'monthly',
          })
          .eq('id', userId)
      }
    }

    // ── customer.subscription.deleted ───────────────────────────────────────
    // Fires when a monthly subscription is cancelled or payment fails
    // fatally. Lifetime users have no subscription so this never fires for them.
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const customerId   = subscription.customer as string

      await admin
        .from('profiles')
        .update({ is_pro: false, plan_type: 'free' })
        .eq('stripe_customer_id', customerId)
    }
  } catch (err) {
    // Return 200 anyway — Stripe would keep retrying on 5xx, but a DB error
    // won't be fixed by retrying the same event.
    console.error('[stripe-webhook]', event.type, err)
  }

  return new NextResponse(null, { status: 200 })
}
