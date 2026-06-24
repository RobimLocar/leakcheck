import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const clientId = process.env.STRIPE_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/onboarding?error=misconfigured', request.url))
  }

  const origin = request.nextUrl.origin

  // We'd prefer to default new connections to read-only (sync/dashboard never
  // need to write) and only request read_write when a user explicitly turns
  // on Auto-Recovery. Stripe rejects that for this platform's OAuth client
  // though: "Please use the `read_write` scope, or contact support... in
  // order to use read-only connections" — read-only Connect access has to be
  // separately enabled by Stripe support per-platform, and that hasn't
  // happened for this client_id yet. Until then, read_only here just breaks
  // every new connection outright, so request read_write unconditionally.
  // The scope actually GRANTED is still read back from Stripe's own token
  // response in /api/stripe/callback and stored as-is — nothing downstream
  // (cron's retry gate, the dashboard's "Activate Recovery" prompt) assumes
  // a specific scope, so this is safe to flip back once Stripe approves
  // read-only for this app.

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: `${origin}/api/stripe/callback`,
    state: user.id,
  })

  return NextResponse.redirect(
    `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  )
}
