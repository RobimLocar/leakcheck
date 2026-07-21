import { createAdminClient } from '@/lib/supabase/admin'
import { sendStripeUpgradeReminder } from '@/lib/resend/client'
import { type NextRequest, NextResponse } from 'next/server'

// Sequence for non-Pro users (never upgraded, or upgraded and churned back
// to free — is_pro=false covers both, no separate handling needed).
// step 0 = none sent, 1 = 24h, 2 = 3d, 3 = 5d (Stripe-vs-LeakCheck
// objection handling), 4 = 7d, 5 = 14d, 6 = 30d (final)
const STEPS = [
  { step: 1, minAge: 24 * 60 * 60 * 1000 },
  { step: 2, minAge: 3  * 24 * 60 * 60 * 1000 },
  { step: 3, minAge: 5  * 24 * 60 * 60 * 1000 },
  { step: 4, minAge: 7  * 24 * 60 * 60 * 1000 },
  { step: 5, minAge: 14 * 24 * 60 * 60 * 1000 },
  { step: 6, minAge: 30 * 24 * 60 * 60 * 1000 },
]

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dryRun=true: compute who would get an email and what step, without
  // sending via Resend or advancing stripe_upgrade_step. Safe to run against
  // production data as many times as needed.
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true'

  const admin = createAdminClient()
  const now = Date.now()

  // All non-Pro users get the sequence. Stripe connection is optional — when
  // present we personalize with real failed-payment numbers; when absent we
  // fall back to generic copy and age the sequence off signup date instead.
  const { data: connections, error: connErr } = await admin
    .from('stripe_connections')
    .select('user_id, created_at')

  if (connErr) {
    console.error('[stripe-upgrade-reminder] connections query failed:', connErr.message)
    return NextResponse.json({ error: connErr.message }, { status: 500 })
  }

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id, email, is_pro, created_at, churned_at, stripe_upgrade_step, stripe_upgrade_sent_at')
    .eq('is_pro', false)
    .eq('is_test', false)
    .not('email', 'is', null)

  if (profErr) {
    console.error('[stripe-upgrade-reminder] profiles query failed:', profErr.message)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }
  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  // Map connection created_at by user_id
  const connMap = new Map((connections ?? []).map(c => [c.user_id, c.created_at]))

  let sent = 0
  const preview: Array<{ email: string; step: number; hasStripe: boolean; totalLost: number; failCount: number }> = []

  for (const user of profiles) {
    const currentStep: number = user.stripe_upgrade_step ?? 0

    // Stop after step 6
    if (currentStep >= 6) continue

    // Win-back users (churned_at set) age off their cancellation date — the
    // webhook resets stripe_upgrade_step to 0 at the same time, so this
    // always lines up with a fresh sequence. Otherwise: connection date, or
    // signup date if Stripe was never connected.
    const connectedAt = connMap.get(user.id)
    const anchorAt = user.churned_at ?? connectedAt ?? user.created_at
    if (!anchorAt) continue

    const ageMs = now - new Date(anchorAt).getTime()
    const upcoming = STEPS.find(s => s.step === currentStep + 1)
    if (!upcoming || ageMs < upcoming.minAge) continue

    // Dados reais de pagamentos falhados só existem se o Stripe foi conectado;
    // sem conexão, buildUpgradeCopy cai na copy genérica (totalLost === 0).
    const payments = connectedAt
      ? (await admin
          .from('failed_payments')
          .select('amount, failure_reason, status')
          .eq('user_id', user.id)
          .eq('status', 'open')).data
      : null

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

    if (dryRun) {
      preview.push({ email: user.email!, step: upcoming.step, hasStripe: !!connectedAt, totalLost, failCount })
      sent++
      continue
    }

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

  console.log(`[stripe-upgrade-reminder] ${dryRun ? 'would send' : 'sent'} ${sent} reminder(s)`)
  return NextResponse.json(dryRun ? { wouldSend: sent, preview } : { sent })
}
