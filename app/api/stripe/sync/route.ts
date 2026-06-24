import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchFailedPayments } from '@/lib/stripe/fetchFailedPayments'
import { sendPaymentRecoveryEmail } from '@/lib/resend/client'
import { sendSlackAlert } from '@/lib/slack/client'
import { sendSms } from '@/lib/sms/client'
import { getSmsTemplate, getCustomEmailTemplate, renderTemplate, type MessageTemplates } from '@/lib/recovery/messageTemplates'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Authenticate the caller
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Load the stored Stripe connection for this user
  const { data: connection, error: connError } = await supabase
    .from('stripe_connections')
    .select('stripe_account_id, access_token')
    .eq('user_id', user.id)
    .single()

  if (connError || !connection) {
    return NextResponse.json(
      { error: 'No Stripe connection found. Connect your account first.' },
      { status: 400 },
    )
  }

  // Fetch failed payments using the connected account's OAuth access token
  let payments
  try {
    payments = await fetchFailedPayments(connection.access_token)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe fetch failed'
    console.error('[sync] fetchFailedPayments failed:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (payments.length === 0) {
    return NextResponse.json({ synced: 0, total_lost: 0 })
  }

  const admin = createAdminClient()

  // Snapshot existing invoice IDs BEFORE the upsert so we can identify truly new rows
  const { data: existing } = await admin
    .from('failed_payments')
    .select('stripe_invoice_id')
    .eq('user_id', user.id)

  const existingIds = new Set((existing ?? []).map((r: { stripe_invoice_id: string }) => r.stripe_invoice_id))

  // Write to the DB using the service role client (bypasses RLS).
  // ignoreDuplicates: true preserves any status the user has already set
  // (e.g., 'recovered') without overwriting it on re-sync.
  const rows = payments.map(p => ({ user_id: user.id, ...p }))

  const { error: upsertError } = await admin
    .from('failed_payments')
    .upsert(rows, { onConflict: 'stripe_invoice_id', ignoreDuplicates: true })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  const total_lost = payments.reduce((sum, p) => sum + p.amount, 0)

  // Send recovery emails for new payments — pro users only, non-blocking
  const newPayments = payments.filter(p => !existingIds.has(p.stripe_invoice_id))

  if (newPayments.length > 0) {
    const { data: profile } = await admin
      .from('profiles')
      .select('is_pro, slack_webhook_url, message_templates, sender_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_pro) {
      const templates = profile.message_templates as MessageTemplates
      const sender = { name: profile.sender_name, replyTo: user.email }
      for (const p of newPayments) {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: p.currency.toUpperCase(),
        }).format(p.amount / 100)
        const vars = { amount: formatted, reason: p.failure_reason, name: p.customer_name ?? 'there', link: p.hosted_invoice_url ?? 'https://billing.stripe.com' }

        if (p.customer_email) {
          const customEmail = getCustomEmailTemplate(templates, '1')
          await sendPaymentRecoveryEmail(p.customer_email, {
            customerName: p.customer_name,
            amount: p.amount,
            currency: p.currency,
            failureReason: p.failure_reason,
          }, customEmail ? renderTemplate(customEmail, vars) : undefined, sender, p.hosted_invoice_url).catch(err => console.error('[sync] recovery email:', p.stripe_invoice_id, err))
        }

        await sendSms(
          p.customer_phone,
          renderTemplate(getSmsTemplate(templates, '1'), vars),
        ).catch(err => console.error('[sync] sms:', p.stripe_invoice_id, err))

        await sendSlackAlert(
          profile.slack_webhook_url,
          `🔴 New failed payment: ${formatted} from ${p.customer_name ?? p.customer_email ?? 'a customer'} — ${p.failure_reason}`,
        ).catch(err => console.error('[sync] slack alert:', p.stripe_invoice_id, err))
      }
    }
  }

  return NextResponse.json({ synced: payments.length, total_lost })
}
