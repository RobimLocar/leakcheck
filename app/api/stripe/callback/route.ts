import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const stripeError = searchParams.get('error')

  if (stripeError || !code || !state) {
    return NextResponse.redirect(`${origin}/onboarding?error=stripe_denied`)
  }

  // Verify the user session and that state matches (CSRF guard)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Exchange authorization code for an access token
  const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text()
    console.error('Stripe OAuth token exchange failed', tokenRes.status, errorBody)
    return NextResponse.redirect(`${origin}/onboarding?error=token_exchange`)
  }

  const token = await tokenRes.json() as {
    stripe_user_id: string
    access_token: string
    scope: 'read_only' | 'read_write'
  }

  // Replace any existing connection — two passes:
  // 1. Delete by user_id (handles reconnect for this user)
  // 2. Delete by stripe_account_id via admin client (handles the same Stripe account
  //    previously connected by a different LeakCheck user — bypasses RLS)
  const admin = createAdminClient()
  await supabase.from('stripe_connections').delete().eq('user_id', user.id)
  await admin.from('stripe_connections').delete().eq('stripe_account_id', token.stripe_user_id)

  const { error: dbError } = await supabase
    .from('stripe_connections')
    .insert({
      user_id: user.id,
      stripe_account_id: token.stripe_user_id,
      access_token: token.access_token,
      scope: token.scope,
    })

  if (dbError) {
    console.error('[stripe/callback] db insert failed:', dbError.message, dbError.details, dbError.hint)
    return NextResponse.redirect(`${origin}/onboarding?error=db`)
  }

  return NextResponse.redirect(`${origin}/onboarding?connected=true`)
}
