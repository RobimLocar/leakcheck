import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/resend/client'
import { NextResponse } from 'next/server'

// Called right after a successful client-side verifyOtp() on /auth/confirm.
// Separate from that page so the Resend API key never reaches the browser.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('welcome_sent')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && !profile.welcome_sent) {
    await admin.from('profiles').update({ welcome_sent: true }).eq('id', user.id)
    sendWelcomeEmail(user.email).catch(err =>
      console.error('[post-confirm] welcome email error:', err)
    )
  }

  return NextResponse.json({ ok: true })
}
