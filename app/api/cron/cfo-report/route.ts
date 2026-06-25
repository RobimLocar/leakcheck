import { createAdminClient } from '@/lib/supabase/admin'
import { sendCfoReport } from '@/lib/resend/client'
import { type NextRequest, NextResponse } from 'next/server'

type Payment = {
  amount: number
  currency: string
  status: 'open' | 'recovered' | 'lost'
  customer_name: string | null
  customer_email: string | null
}

// Runs on the 1st of each month at 09:00 UTC (see vercel.json).
// For each Pro user with a connected Stripe account, computes recovery
// metrics for the previous calendar month and sends an email summary.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const month = firstOfLastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const { data: connections } = await admin
    .from('stripe_connections')
    .select('user_id')

  let sent = 0

  for (const conn of (connections ?? []) as { user_id: string }[]) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email, is_pro')
      .eq('id', conn.user_id)
      .maybeSingle()

    if (!profile?.is_pro || !profile.email) continue

    const { data: payments } = await admin
      .from('failed_payments')
      .select('amount, currency, status, customer_name, customer_email')
      .eq('user_id', conn.user_id)
      .gte('created_at', firstOfLastMonth.toISOString())
      .lt('created_at', firstOfThisMonth.toISOString())

    if (!payments?.length) continue

    const currency = (payments as Payment[])[0].currency || 'usd'
    const open = (payments as Payment[]).filter(p => p.status === 'open' || p.status === 'lost')
    const recovered = (payments as Payment[]).filter(p => p.status === 'recovered')

    const atRiskAmount = open.reduce((s, p) => s + p.amount, 0)
    const recoveredAmount = recovered.reduce((s, p) => s + p.amount, 0)
    const total = atRiskAmount + recoveredAmount
    const recoveryRate = total > 0 ? Math.round((recoveredAmount / total) * 100) : 0

    // Group open payments by customer, sum amounts
    const accountMap = new Map<string, { name: string | null; email: string | null; amount: number; failureCount: number }>()
    for (const p of open) {
      const key = p.customer_email ?? p.customer_name ?? 'unknown'
      const existing = accountMap.get(key)
      if (existing) {
        existing.amount += p.amount
        existing.failureCount++
      } else {
        accountMap.set(key, { name: p.customer_name, email: p.customer_email, amount: p.amount, failureCount: 1 })
      }
    }
    const topAccounts = [...accountMap.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    await sendCfoReport({
      userEmail: profile.email,
      month,
      atRiskAmount,
      recoveredAmount,
      recoveryRate,
      currency,
      topAccounts,
    }).catch(err => console.error('[cfo-report] email failed:', profile.email, err))

    sent++
  }

  return NextResponse.json({ sent, month })
}
