import { createAdminClient } from '@/lib/supabase/admin'
import { payInvoice } from '@/lib/stripe/connectedAccountApi'
import { isRetryDue, MAX_RETRIES } from '@/lib/recovery/retryPolicy'
import { nextEmailStep } from '@/lib/recovery/emailSequence'
import { sendRecoverySequenceEmail, sendOperatorAlert, sendOwnerPaymentAlert } from '@/lib/resend/client'
import { sendSlackAlert } from '@/lib/slack/client'
import { sendTelegramAlert } from '@/lib/telegram/client'
import { sendSms } from '@/lib/sms/client'
import { getSmsTemplate, getCustomEmailTemplate, renderTemplate, type MessageTemplates } from '@/lib/recovery/messageTemplates'
import { type NextRequest, NextResponse } from 'next/server'

type Connection = { user_id: string; access_token: string; scope: 'read_only' | 'read_write' }
type Profile = { email: string; is_pro: boolean; slack_webhook_url: string | null; telegram_chat_id: string | null; message_templates: MessageTemplates; sender_name: string | null; email_alerts_enabled: boolean }
type Payment = {
  id: string
  stripe_invoice_id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  amount: number
  currency: string
  failure_reason: string
  status: 'open' | 'recovered' | 'lost'
  created_at: string
  retry_count: number
  last_retry_at: string | null
  retry_exhausted: boolean
  email_step: number
  hosted_invoice_url: string | null
}

// Daily schedule (vercel.json) — if the previous run is more than this long
// ago, either Vercel's cron stopped firing or a prior run crashed before
// reaching the heartbeat update at the end. 30h gives a generous buffer over
// the 24h interval before treating it as a missed cycle.
const STALE_HEARTBEAT_HOURS = 30
// Sends are fire-and-forget per customer, so a handful of failures (a bounced
// address, a malformed phone number) is normal. This many failures in one
// run is a different signal — Resend/Twilio/our own code is probably broken
// for everyone, not just one payment.
const FAILURE_ALERT_THRESHOLD = 3

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
}

// Runs on a schedule (see vercel.json) — processes auto-retry and the
// email sequence for every Pro user's open failed payments.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // ── Heartbeat check — did the previous run actually happen on schedule? ──
  const { data: health } = await admin
    .from('system_health')
    .select('last_cron_run_at')
    .eq('id', true)
    .maybeSingle()

  if (health?.last_cron_run_at) {
    const hoursSinceLastRun = (now.getTime() - new Date(health.last_cron_run_at).getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastRun > STALE_HEARTBEAT_HOURS) {
      sendOperatorAlert(
        'Recovery cron missed a cycle',
        `The recovery cron hadn't run in ${hoursSinceLastRun.toFixed(1)} hours (expected ~24h). Last successful run: ${health.last_cron_run_at}. Check Vercel cron logs and recent deploys.`,
      ).catch(err => console.error('[cron] heartbeat alert failed:', err))
    }
  }

  const { data: connections } = await admin
    .from('stripe_connections')
    .select('user_id, access_token, scope')

  let retried = 0
  let recovered = 0
  let emailsSent = 0
  let sendFailures = 0

  for (const conn of (connections ?? []) as Connection[]) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email, is_pro, slack_webhook_url, telegram_chat_id, message_templates, sender_name, email_alerts_enabled')
      .eq('id', conn.user_id)
      .maybeSingle<Profile>()

    if (!profile?.is_pro) continue

    const { data: payments } = await admin
      .from('failed_payments')
      .select('*')
      .eq('user_id', conn.user_id)
      .eq('status', 'open')

    for (const payment of (payments ?? []) as Payment[]) {
      // ── Retry pass ──────────────────────────────────────────────────────
      // Only attempt the charge if the stored token actually has write
      // access — a read_only connection can't pay invoices, and we don't
      // want to burn through retry_count on calls we know will fail.
      if (conn.scope === 'read_write' && isRetryDue(payment, now)) {
        retried++
        const result = await payInvoice(payment.stripe_invoice_id, conn.access_token)

        if (result.ok) {
          recovered++
          await admin.from('failed_payments').update({ status: 'recovered' }).eq('id', payment.id)
          await sendSlackAlert(
            profile.slack_webhook_url,
            `💰 Recovered ${fmt(payment.amount, payment.currency)} from ${payment.customer_name ?? payment.customer_email ?? 'a customer'} via auto-retry`,
          ).catch(err => { sendFailures++; console.error('[cron] slack recovered alert:', payment.id, err) })

          await sendTelegramAlert(
            profile.telegram_chat_id,
            `💰 <b>Payment recovered</b>\n${fmt(payment.amount, payment.currency)} from ${payment.customer_name ?? payment.customer_email ?? 'a customer'} — auto-retry succeeded`,
          ).catch(err => { sendFailures++; console.error('[cron] telegram recovered alert:', payment.id, err) })

          if (profile.email_alerts_enabled) {
            await sendOwnerPaymentAlert({
              to: profile.email,
              event: 'recovered',
              customerName: payment.customer_name,
              amount: payment.amount,
              currency: payment.currency,
            }).catch(err => { sendFailures++; console.error('[cron] owner email alert recovered:', payment.id, err) })
          }
        } else {
          const newRetryCount = payment.retry_count + 1
          await admin.from('failed_payments').update({
            retry_count: newRetryCount,
            last_retry_at: now.toISOString(),
            retry_exhausted: newRetryCount >= MAX_RETRIES,
          }).eq('id', payment.id)
          console.error('[cron] retry failed:', payment.stripe_invoice_id, result.error)
        }
      }

      // ── Email + SMS sequence pass (independent of retry outcome) ──────────
      const step = nextEmailStep(payment, now)
      if (step) {
        emailsSent++
        const stepKey = String(step) as '2' | '3'
        const vars = {
          amount: fmt(payment.amount, payment.currency),
          reason: payment.failure_reason,
          name: payment.customer_name ?? 'there',
          link: payment.hosted_invoice_url ?? 'https://billing.stripe.com',
        }

        if (payment.customer_email) {
          const customEmail = getCustomEmailTemplate(profile.message_templates, stepKey)
          await sendRecoverySequenceEmail(payment.customer_email, step, {
            customerName: payment.customer_name,
            amount: payment.amount,
            currency: payment.currency,
            failureReason: payment.failure_reason,
          }, customEmail ? renderTemplate(customEmail, vars) : undefined, { name: profile.sender_name, replyTo: profile.email }, payment.hosted_invoice_url)
            .catch(err => { sendFailures++; console.error('[cron] sequence email:', payment.id, err) })
        }

        await sendSms(
          payment.customer_phone,
          renderTemplate(getSmsTemplate(profile.message_templates, stepKey), vars),
        ).catch(err => { sendFailures++; console.error('[cron] sms:', payment.id, err) })

        await admin.from('failed_payments').update({
          email_step: step - 1,
          last_email_at: now.toISOString(),
        }).eq('id', payment.id)
      }
    }
  }

  if (sendFailures >= FAILURE_ALERT_THRESHOLD) {
    sendOperatorAlert(
      'Elevated send failures in recovery cron',
      `${sendFailures} email/SMS/Slack sends failed in this run (${now.toISOString()}). Check Resend/Twilio status and Vercel function logs.`,
    ).catch(err => console.error('[cron] failure-rate alert failed:', err))
  }

  // ── Heartbeat update — always last, so a crash earlier in the run is
  // itself visible as a stale heartbeat on the next invocation. ──────────
  await admin
    .from('system_health')
    .update({ last_cron_run_at: now.toISOString(), last_cron_ok: true, last_send_failure_count: sendFailures })
    .eq('id', true)

  return NextResponse.json({ retried, recovered, emailsSent, sendFailures })
}
