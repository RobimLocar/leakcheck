import { createAdminClient } from '@/lib/supabase/admin'
import { sendActivationReminder } from '@/lib/resend/client'
import { type NextRequest, NextResponse } from 'next/server'

// Sequence: step 0 = none sent, 1 = 24h, 2 = 72h, 3 = 7d, 4 = 30d, 5+ = monthly
const STEPS = [
  { step: 1, minAge: 24 * 60 * 60 * 1000 },
  { step: 2, minAge: 72 * 60 * 60 * 1000 },
  { step: 3, minAge: 7  * 24 * 60 * 60 * 1000 },
  { step: 4, minAge: 30 * 24 * 60 * 60 * 1000 },
]
const MONTHLY_INTERVAL = 30 * 24 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = Date.now()

  // All users who signed up, have welcome_sent, and haven't connected Stripe
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, created_at, activation_reminder_step, activation_reminder_sent_at')
    .eq('welcome_sent', true)
    .eq('is_test', false)
    .not('email', 'is', null)

  if (error) {
    console.error('[activation-reminder] query failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  // Remove users who already connected Stripe
  const { data: connections } = await admin
    .from('stripe_connections')
    .select('user_id')
    .in('user_id', profiles.map(p => p.id))

  const connectedIds = new Set((connections ?? []).map(c => c.user_id))
  const targets = profiles.filter(p => !connectedIds.has(p.id))

  let sent = 0

  for (const user of targets) {
    const ageMs = now - new Date(user.created_at).getTime()
    const currentStep: number = user.activation_reminder_step ?? 0
    const lastSentAt: number | null = user.activation_reminder_sent_at
      ? new Date(user.activation_reminder_sent_at).getTime()
      : null

    let nextStep: number | null = null

    if (currentStep < 4) {
      // Fixed sequence: check if age crosses the threshold for the next step
      const upcoming = STEPS.find(s => s.step === currentStep + 1)
      if (upcoming && ageMs >= upcoming.minAge) {
        nextStep = upcoming.step
      }
    } else {
      // Monthly cadence after step 4
      const sinceLastSent = lastSentAt ? now - lastSentAt : Infinity
      if (sinceLastSent >= MONTHLY_INTERVAL) {
        nextStep = currentStep + 1
      }
    }

    if (nextStep === null) continue

    await sendActivationReminder(user.email!, nextStep)
    await admin
      .from('profiles')
      .update({
        activation_reminder_step: nextStep,
        activation_reminder_sent_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    sent++
  }

  console.log(`[activation-reminder] sent ${sent} reminder(s)`)
  return NextResponse.json({ sent })
}
