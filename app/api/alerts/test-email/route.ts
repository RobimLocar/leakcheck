import { createClient } from '@/lib/supabase/server'
import { sendOwnerPaymentAlert } from '@/lib/resend/client'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_alerts_enabled')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.email_alerts_enabled) {
    return NextResponse.json({ error: 'Email alerts are not enabled' }, { status: 400 })
  }

  await sendOwnerPaymentAlert({
    to: user.email,
    event: 'failed',
    customerName: 'Test Customer',
    amount: 4900,
    currency: 'usd',
    failureReason: 'Insufficient Funds',
  })

  return NextResponse.json({ ok: true })
}
