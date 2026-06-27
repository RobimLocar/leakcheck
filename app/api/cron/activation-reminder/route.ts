import { createAdminClient } from '@/lib/supabase/admin'
import { sendActivationReminder } from '@/lib/resend/client'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find users who signed up 24–72h ago, haven't connected Stripe, and
  // haven't received a reminder yet.
  const now = new Date()
  const since = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()
  const after = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates, error } = await admin
    .from('profiles')
    .select('id, email')
    .eq('welcome_sent', true)
    .eq('activation_reminder_sent', false)
    .gte('created_at', since)
    .lte('created_at', after)

  if (error) {
    console.error('[activation-reminder] query failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Cross-check against stripe_connections to skip anyone who already connected
  const { data: connections } = await admin
    .from('stripe_connections')
    .select('user_id')
    .in('user_id', candidates.map(c => c.id))

  const connectedIds = new Set((connections ?? []).map(c => c.user_id))
  const targets = candidates.filter(c => !connectedIds.has(c.id) && c.email)

  let sent = 0
  for (const user of targets) {
    await sendActivationReminder(user.email!)
    await admin
      .from('profiles')
      .update({ activation_reminder_sent: true })
      .eq('id', user.id)
    sent++
  }

  console.log(`[activation-reminder] sent ${sent} reminder(s)`)
  return NextResponse.json({ sent })
}
