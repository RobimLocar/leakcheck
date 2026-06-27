import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/resend/client'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('[auth/callback] exchange result:', {
      hasUser: !!data?.user,
      userEmail: data?.user?.email,
      error: error?.message,
    })

    if (!error && data.user?.email) {
      const user = data.user
      const admin = createAdminClient()

      const { data: profile } = await admin
        .from('profiles')
        .select('welcome_sent')
        .eq('id', user.id)
        .maybeSingle()

      console.log('[auth/callback] profile:', profile)

      const isNewUser = profile != null && !profile.welcome_sent
      if (isNewUser) {
        await admin
          .from('profiles')
          .update({ welcome_sent: true })
          .eq('id', user.id)

        sendWelcomeEmail(user.email!).catch(err =>
          console.error('[auth/callback] welcome email error:', err)
        )
      }

      // New users go straight to onboarding — skip the empty dashboard
      const destination = isNewUser ? '/onboarding' : next
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate+user`)
}
