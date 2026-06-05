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

    if (!error) {
      const user = data.user
      if (user?.email) {
        const admin = createAdminClient()
        // Fire-and-forget: do not block the redirect on email delivery
        admin
          .from('profiles')
          .select('welcome_sent')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile && !profile.welcome_sent) {
              return sendWelcomeEmail(user.email!).then(() =>
                admin
                  .from('profiles')
                  .update({ welcome_sent: true })
                  .eq('id', user.id),
              )
            }
          })
          .catch(err => console.error('[auth/callback] welcome email:', err))
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate+user`)
}
