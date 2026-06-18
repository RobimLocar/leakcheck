import { createClient } from '@/lib/supabase/server'
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
  }

  // Replace any existing connection for this user, then insert the new one
  await supabase.from('stripe_connections').delete().eq('user_id', user.id)

  const { error: dbError } = await supabase
    .from('stripe_connections')
    .insert({
      user_id: user.id,
      stripe_account_id: token.stripe_user_id,
      access_token: token.access_token,
    })

  if (dbError) {
    return NextResponse.redirect(`${origin}/onboarding?error=db`)
  }

  return NextResponse.redirect(`${origin}/onboarding?connected=true`)
}
