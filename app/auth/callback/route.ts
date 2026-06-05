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

    if (!error && data.user?.email) {
      const user = data.user
      const admin = createAdminClient()

      // Verificar se já enviou o email de boas-vindas
      const { data: profile } = await admin
        .from('profiles')
        .select('welcome_sent')
        .eq('id', user.id)
        .maybeSingle()

      if (profile && !profile.welcome_sent) {
        // Marcar como enviado primeiro para evitar duplicata
        await admin
          .from('profiles')
          .update({ welcome_sent: true })
          .eq('id', user.id)

        // Disparar email (fire-and-forget)
        sendWelcomeEmail(user.email!).catch(err =>
          console.error('[auth/callback] welcome email error:', err)
        )
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate+user`)
}
