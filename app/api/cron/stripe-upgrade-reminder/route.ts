import { createAdminClient } from '@/lib/supabase/admin'
import { sendStripeUpgradeReminder } from '@/lib/resend/client'
import { type NextRequest, NextResponse } from 'next/server'

// Sequence for users who connected Stripe but haven't upgraded to Pro
// step 0 = none sent, 1 = 24h, 2 = 3d, 3 = 7d, 4 = 14d (final)
const STEPS = [
  { step: 1, minAge: 24 * 60 * 60 * 1000 },
  { step: 2, minAge: 3  * 24 * 60 * 60 * 1000 },
  { step: 3, minAge: 7  * 24 * 60 * 60 * 1000 },
  { step: 4, minAge: 14 * 24 * 60 * 60 * 1000 },
]

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = Date.now()

  // Users who connected Stripe but are not Pro
  const { data: connections, error: connErr } = await admin
    .from('stripe_connections')
    .select('user_id, created_at')

  if (connErr) {
    console.error('[stripe-upgrade-reminder] connections query failed:', connErr.message)
    return NextResponse.json({ error: connErr.message }, { status: 500 })
  }
  if (!connections?.length) return NextResponse.json({ sent: 0 })

  const connectedUserIds = connections.map(c => c.user_id)

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id, email, is_pro, stripe_upgrade_step, stripe_upgrade_sent_at')
    .in('id', connectedUserIds)
    .eq('is_pro', false)
    .not('email', 'is', null)

  if (profErr) {
    console.error('[stripe-upgrade-reminder] profiles query failed:', profErr.message)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }
  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  // Map connection created_at by user_id
  const connMap = new Map(connections.map(c => [c.user_id, c.created_at]))

  let sent = 0

  for (const user of profiles) {
    const currentStep: number = user.stripe_upgrade_step ?? 0

    // Stop after step 4
    if (currentStep >= 4) continue

    const connectedAt = connMap.get(user.id)
    if (!connectedAt) continue

    const ageMs = now - new Date(connectedAt).getTime()
    const upcoming = STEPS.find(s => s.step === currentStep + 1)
    if (!upcoming || ageMs < upcoming.minAge) continue

    // Buscar dados reais de pagamentos falhados para personalizar o email
    const { data: payments } = await admin
      .from('failed_payments')
      .select('amount, failure_reason, status')
      .eq('user_id', user.id)
      .eq('status', 'open')

    const totalLostCents = payments?.reduce((s, p) => s + p.amount, 0) ?? 0
    const totalLost = Math.round(totalLostCents / 100)
    const failCount = payments?.length ?? 0

    // Reason mais frequente
    const reasonCounts = (payments ?? []).reduce<Record<string, number>>((acc, p) => {
      acc[p.failure_reason] = (acc[p.failure_reason] ?? 0) + 1
      return acc
    }, {})
    const topReason = Object.keys(reasonCounts).length > 0
      ? Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

    // Dias desde a conexão (para calcular urgência de janela)
    const daysConnected = Math.floor(ageMs / 86400000)
    const daysLeft = Math.max(0, 30 - daysConnected)

    await sendStripeUpgradeReminder(user.email!, upcoming.step, {
      totalLost,
      failCount,
      topReason,
      daysLeft,
    })

    await admin
      .from('profiles')
      .update({
        stripe_upgrade_step: upcoming.step,
        stripe_upgrade_sent_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    sent++
  }

  console.log(`[stripe-upgrade-reminder] sent ${sent} reminder(s)`)
  return NextResponse.json({ sent })
}
