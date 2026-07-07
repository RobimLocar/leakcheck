import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'LeakCheck <onboarding@resend.dev>'
const SEND_ADDRESS = DEFAULT_FROM.match(/<(.+)>/)?.[1] ?? 'onboarding@resend.dev'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leakcheck-three.vercel.app'
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

// User-supplied template text (Settings → Message Templates) gets rendered
// into HTML emails — escape it so a customer's copy can't break the layout
// or inject markup. Our own hardcoded default copy is trusted and skips this.
function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// A real, recognizable sender name (instead of a generic "LeakCheck" /
// no-reply address) plus a working reply-to is the single biggest factor in
// whether customers trust and open a dunning email instead of ignoring it
// as spam. Name comes from the merchant's own Settings; falls back to
// "LeakCheck" if they haven't set one. Strips header-injection characters
// since this is free-text user input going straight into an email header.
function senderDisplayName(senderName?: string | null): string {
  return (senderName ?? '').replace(/[\r\n<>]/g, '').trim() || 'LeakCheck'
}

function buildFrom(senderName?: string | null): string {
  return `${senderDisplayName(senderName)} <${SEND_ADDRESS}>`
}

// Table-based layout (not flex/grid divs) because Outlook desktop's Word
// rendering engine ignores most modern CSS — tables are the one layout
// primitive every email client still renders consistently.
function lightWrapper(bodyHtml: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e8e8ea;">
      ${bodyHtml}
    </table>
  </td></tr>
</table>`
}

// Sent to the merchant's own email when a customer payment fails or recovers.
// Recipient is a LeakCheck user so dark brand theme is appropriate.
export async function sendOwnerPaymentAlert(opts: {
  to: string
  event: 'failed' | 'recovered'
  customerName: string | null
  amount: number
  currency: string
  failureReason?: string
}): Promise<boolean> {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: opts.currency.toUpperCase() }).format(opts.amount / 100)
  const isFailed = opts.event === 'failed'
  const accent = isFailed ? '#ff3d3d' : '#22c55e'
  const icon = isFailed ? '🔴' : '💰'
  const subject = isFailed
    ? `${icon} Payment failed — ${fmt} from ${opts.customerName ?? 'a customer'}`
    : `${icon} Payment recovered — ${fmt} from ${opts.customerName ?? 'a customer'}`

  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: opts.to,
    subject,
    html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;padding:40px 32px;">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding-right:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#ff3d3d;"></div></td>
            <td><span style="color:#fff;font-size:14px;font-weight:700;">LeakCheck</span></td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
          <tr><td>
            <p style="color:#666;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 6px;">${isFailed ? 'Payment failed' : 'Payment recovered'}</p>
            <p style="color:${accent};font-size:26px;font-weight:800;margin:0 0 4px;letter-spacing:-0.02em;">${fmt}</p>
            <p style="color:#555;font-size:13px;margin:0;">${opts.customerName ?? 'Unknown customer'}${opts.failureReason ? ` · ${opts.failureReason}` : ''}</p>
          </td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td style="background:#ff3d3d;border-radius:8px;">
            <a href="${SITE_URL}/dashboard" style="display:inline-block;color:#fff;padding:11px 22px;text-decoration:none;font-weight:700;font-size:13px;">View Dashboard →</a>
          </td></tr>
        </table>
        <p style="color:#333;font-size:11px;margin:0;">You're receiving this because you have email alerts enabled in LeakCheck. <a href="${SITE_URL}/dashboard" style="color:#555;">Manage alerts</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>`,
  })
  if (error) {
    console.error('[resend] owner payment alert failed:', error.message)
    return false
  }
  return true
}

export async function sendOperatorAlert(subject: string, message: string): Promise<void> {
  const to = process.env.OPERATOR_ALERT_EMAIL
  if (!to) return
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to,
    subject: `[LeakCheck Alert] ${subject}`,
    html: `<div style="background:#0a0a0a;padding:40px;font-family:${FONT};"><p style="color:#fff;white-space:pre-wrap;">${escapeHtml(message)}</p></div>`,
  })
  if (error) console.error('[resend] operator alert failed:', error.message)
}

// Sent by LeakCheck to the founder who just signed up — the recipient is a
// LeakCheck user, so full brand identity (dark theme, logo dot) is correct
// here, unlike the customer-facing recovery emails below.
const ACTIVATION_STEPS: Record<number, { subject: string; headline: string; body: string; cta: string }> = {
  1: {
    subject: 'Your Stripe data is waiting — 60 seconds to connect',
    headline: 'You still haven\'t seen your number.',
    body: 'Most founders who connect Stripe find anywhere from <strong style="color:#fff;">$200 to $2,000+</strong> in failed payments they didn\'t know about.<br><br>Takes 60 seconds. Read-only by default — we never move money without your explicit permission.',
    cta: 'See how much you\'re losing →',
  },
  2: {
    subject: 'Still haven\'t connected Stripe? Here\'s what you\'re missing',
    headline: '72 hours in — your leaking revenue is waiting.',
    body: 'Every day without LeakCheck is another day failed payments age out of the recovery window.<br><br>The connection takes 60 seconds and shows your exact number immediately — no setup, no credit card.',
    cta: 'Connect Stripe now →',
  },
  3: {
    subject: 'One week. How much did you lose to failed payments?',
    headline: 'A week in — what\'s stopping you?',
    body: 'If it\'s the Stripe connection that feels risky: we request read-only access by default. We literally cannot charge anything on your behalf unless you separately enable it in settings.<br><br>If it\'s time: it\'s 60 seconds. We\'ve timed it.',
    cta: 'Connect in 60 seconds →',
  },
  4: {
    subject: 'One month since you signed up for LeakCheck',
    headline: 'A month later — still losing money silently.',
    body: 'You signed up a month ago. Since then, the average LeakCheck user in your MRR range has recovered <strong style="color:#fff;">$340</strong> in failed payments they didn\'t know about.<br><br>Still free to connect and view. No catch.',
    cta: 'See your real number →',
  },
}

const ACTIVATION_MONTHLY = {
  subject: 'LeakCheck: your failed payments are piling up',
  headline: 'Still here if you need us.',
  body: 'Just a heads-up: failed payments that go unrecovered for more than 30 days are almost impossible to collect. Every month that passes, a portion of that revenue is gone for good.<br><br>The connection is still free and takes 60 seconds.',
  cta: 'Connect Stripe →',
}

function activationReminderHtml(copy: { headline: string; body: string; cta: string }): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;padding:48px 32px;">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td style="padding-right:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#ff3d3d;"></div></td>
            <td><span style="color:#fff;font-size:15px;font-weight:700;letter-spacing:-0.01em;">LeakCheck</span></td>
          </tr>
        </table>
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 16px;letter-spacing:-0.02em;line-height:1.25;">${copy.headline}</h1>
        <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 28px;">${copy.body}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td style="background:#ff3d3d;border-radius:10px;">
            <a href="${SITE_URL}/onboarding" style="display:inline-block;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700;font-size:14px;">${copy.cta}</a>
          </td></tr>
        </table>
        <p style="color:#555;font-size:12px;line-height:1.6;margin:0 0 4px;">No credit card required · Free to connect and view.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;border-top:1px solid #1a1a1a;">
          <tr><td style="padding-top:20px;">
            <p style="color:#333;font-size:11px;line-height:1.6;margin:0;">You signed up at getleakcheck.com. <a href="${SITE_URL}/dashboard" style="color:#444;">Go to dashboard</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>`
}

export async function sendActivationReminder(email: string, step: number): Promise<void> {
  const copy = ACTIVATION_STEPS[step] ?? ACTIVATION_MONTHLY
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: email,
    subject: copy.subject,
    html: activationReminderHtml(copy),
  })
  if (error) console.error(`[resend] activation reminder step ${step} failed:`, error.message)
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: email,
    subject: 'Welcome to LeakCheck — connect Stripe in 2 clicks',
    html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;padding:48px 32px;">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td style="padding-right:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#ff3d3d;"></div></td>
            <td><span style="color:#fff;font-size:15px;font-weight:700;letter-spacing:-0.01em;">LeakCheck</span></td>
          </tr>
        </table>
        <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.02em;line-height:1.25;">Welcome to LeakCheck</h1>
        <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 12px;">You signed up with ${email}.</p>
        <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 28px;">Connect your Stripe account to see exactly how much you're losing to failed payments — takes about 60 seconds, read-only access.</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="background:#ff3d3d;border-radius:10px;">
            <a href="${SITE_URL}/onboarding" style="display:inline-block;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700;font-size:14px;">Connect Stripe →</a>
          </td></tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:48px;border-top:1px solid #1a1a1a;">
          <tr><td style="padding-top:20px;">
            <p style="color:#555;font-size:12px;line-height:1.6;margin:0;">You're receiving this because you signed up at getleakcheck.com.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>`,
  })
  if (error) console.error('[resend] welcome email failed:', error.message)
}

export type PaymentRecoveryProps = {
  customerName: string | null
  amount: number
  currency: string
  failureReason: string
}

// Shared by all three recovery-sequence emails. The recipient is the
// merchant's OWN customer, who has no relationship with LeakCheck — so the
// "brand" on display here is the sender name the merchant configured (e.g.
// "Acme Inc. Billing"), not LeakCheck. A loud LeakCheck logo on this email
// would look like unrelated third-party spam to that recipient. LeakCheck
// only appears as one small, unobtrusive footer line.
function recoveryEmailBody(opts: {
  heading: string
  senderName?: string | null
  customerName: string | null
  formatted: string
  failureReason: string
  message: string
  actionUrl: string
  urgent: boolean
}): string {
  const name = senderDisplayName(opts.senderName)
  const accent = opts.urgent ? '#ff3d3d' : '#111111'
  return `
      <tr><td style="padding:32px 32px 0;">
        <p style="color:#8a8a8e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 20px;">${escapeHtml(name)}</p>
        ${opts.urgent ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:100px;padding:4px 12px;"><span style="color:#dc2626;font-size:11px;font-weight:700;">FINAL NOTICE</span></td></tr></table>` : ''}
        <h1 style="color:#111;font-size:19px;font-weight:700;margin:0 0 16px;line-height:1.35;">${opts.heading}</h1>
        <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 8px;">Hi ${opts.customerName ?? 'there'},</p>
        <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px;">${opts.message}</p>
      </td></tr>
      <tr><td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f0f0f0;border-radius:12px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="color:#999;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 4px;">Amount due</p>
              <p style="color:#111;font-size:22px;font-weight:800;margin:0;">${opts.formatted}</p>
            </td>
            <td align="right" style="padding:16px 20px;">
              <p style="color:#999;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 4px;">Reason</p>
              <p style="color:#555;font-size:13px;font-weight:600;margin:0;">${escapeHtml(opts.failureReason)}</p>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="background:${accent};border-radius:10px;">
            <a href="${opts.actionUrl}" style="display:block;text-align:center;color:#fff;padding:14px 24px;text-decoration:none;font-weight:700;font-size:14px;">Update Payment Method →</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#fafafa;border-top:1px solid #f0f0f0;border-radius:0 0 16px 16px;padding:16px 32px;">
        <p style="color:#aaa;font-size:11px;line-height:1.5;margin:0;">Sent on behalf of ${escapeHtml(name)} via LeakCheck.</p>
      </td></tr>`
}

export async function sendPaymentRecoveryEmail(
  to: string,
  props: PaymentRecoveryProps,
  customMessage?: string,
  sender?: { name?: string | null; replyTo?: string | null },
  actionUrl?: string | null,
): Promise<void> {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency.toUpperCase(),
  }).format(props.amount / 100)

  const message = customMessage
    ? escapeHtml(customMessage)
    : `Your payment failed because: <strong>${escapeHtml(props.failureReason)}</strong>. Please update your payment method to continue your service.`

  const { error } = await resend.emails.send({
    from: buildFrom(sender?.name),
    to,
    ...(sender?.replyTo ? { replyTo: sender.replyTo } : {}),
    subject: `Payment failed — action required (${formatted})`,
    html: lightWrapper(recoveryEmailBody({
      heading: `Your payment of ${formatted} failed`,
      senderName: sender?.name,
      customerName: props.customerName,
      formatted,
      failureReason: props.failureReason,
      message,
      actionUrl: actionUrl || 'https://billing.stripe.com',
      urgent: false,
    })),
  })
  if (error) console.error('[resend] recovery email failed:', error.message)
}

// Steps 2 (day-3 reminder) and 3 (day-7 final notice) of the recovery
// sequence. Step 1 is sendPaymentRecoveryEmail, sent at first-detection time.
const SEQUENCE_COPY = {
  2: { subjectPrefix: 'Reminder', heading: 'Still unable to charge your card' },
  3: { subjectPrefix: 'Final notice', heading: 'Your service will be interrupted' },
} as const

export async function sendRecoverySequenceEmail(
  to: string,
  step: 2 | 3,
  props: PaymentRecoveryProps,
  customMessage?: string,
  sender?: { name?: string | null; replyTo?: string | null },
  actionUrl?: string | null,
): Promise<void> {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency.toUpperCase(),
  }).format(props.amount / 100)

  const copy = SEQUENCE_COPY[step]
  const message = customMessage
    ? escapeHtml(customMessage)
    : (step === 2
      ? 'We tried again and your payment is still failing. Please update your payment method to avoid an interruption to your service.'
      : 'This is our final reminder — your payment has been failing for over a week. Please update your payment method now to keep your service active.')

  const { error } = await resend.emails.send({
    from: buildFrom(sender?.name),
    to,
    ...(sender?.replyTo ? { replyTo: sender.replyTo } : {}),
    subject: `${copy.subjectPrefix}: payment failed — action required (${formatted})`,
    html: lightWrapper(recoveryEmailBody({
      heading: copy.heading,
      senderName: sender?.name,
      customerName: props.customerName,
      formatted,
      failureReason: props.failureReason,
      message,
      actionUrl: actionUrl || 'https://billing.stripe.com',
      urgent: step === 3,
    })),
  })
  if (error) console.error(`[resend] sequence email (step ${step}) failed:`, error.message)
}

export async function sendTeamInvite(opts: {
  to: string
  ownerEmail: string
  acceptUrl: string
}): Promise<void> {
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: opts.to,
    subject: `${opts.ownerEmail} invited you to their LeakCheck dashboard`,
    html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;padding:48px 32px;">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td style="padding-right:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#ff3d3d;"></div></td>
            <td><span style="color:#fff;font-size:15px;font-weight:700;letter-spacing:-0.01em;">LeakCheck</span></td>
          </tr>
        </table>
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">You're invited</h1>
        <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
          <strong style="color:#fff;">${escapeHtml(opts.ownerEmail)}</strong> has invited you to view their payment recovery dashboard on LeakCheck.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td style="background:#ff3d3d;border-radius:10px;">
            <a href="${opts.acceptUrl}" style="display:inline-block;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700;font-size:14px;">Accept Invitation →</a>
          </td></tr>
        </table>
        <p style="color:#555;font-size:12px;line-height:1.6;margin:0;">If you don't have a LeakCheck account, you'll be prompted to create one first. This link expires after use.</p>
      </td></tr>
    </table>
  </td></tr>
</table>`,
  })
  if (error) console.error('[resend] team invite failed:', error.message)
}

const STRIPE_UPGRADE_STEPS: Record<number, { subject: string; headline: string; body: string; cta: string }> = {
  1: {
    subject: 'Your Stripe is connected — one step left to start recovering',
    headline: 'You\'re in. Now activate recovery.',
    body: 'You connected your Stripe account — that\'s the hard part done.<br><br>Right now LeakCheck is <strong style="color:#fff;">watching your payments</strong> but not recovering them yet. Upgrade to Pro and every failed charge gets an automatic retry + recovery email sent to your customer.<br><br>Average recovery in the first month: <strong style="color:#22c55e;">$340</strong>. The plan costs $29.',
    cta: 'Activate Recovery — $29/mo →',
  },
  2: {
    subject: 'Your dashboard has data. Your wallet doesn\'t — yet.',
    headline: 'You can see the leak. Now plug it.',
    body: 'You\'ve seen what\'s failing in your Stripe account. Every one of those failed payments is recoverable — with the right retry timing and the right email to your customer.<br><br>On the Free plan, LeakCheck watches. On Pro, it <strong style="color:#fff;">acts</strong>. One upgrade, and every future failed payment gets a recovery sequence automatically.',
    cta: 'Start Recovering →',
  },
  3: {
    subject: 'One week in — still leaving money on the table',
    headline: 'A week of watching. Zero recovering.',
    body: 'You\'ve had a full week of visibility into your failed payments. If you\'re not on Pro yet, those charges are sitting there unrecovered.<br><br>Worth mentioning: there\'s a <strong style="color:#fff;">Lifetime Deal at $149</strong> — pay once, use forever, all future features included. 13 of 20 spots taken. Once it\'s gone, it\'s monthly only.',
    cta: 'Get Lifetime Deal — $149 →',
  },
  4: {
    subject: 'Last nudge from LeakCheck — then we\'ll leave you alone',
    headline: 'Last one. Promise.',
    body: 'You connected Stripe two weeks ago and you\'ve seen your data. If the numbers you saw were enough to make you think "I should fix this" — this is the moment.<br><br>If the timing\'s just not right, no hard feelings. You can upgrade anytime from your dashboard when you\'re ready.<br><br>The Free plan stays free forever.',
    cta: 'Upgrade when ready →',
  },
}

type UpgradeCtx = {
  totalLost: number
  failCount: number
  topReason: string | null
  daysLeft: number
}

function buildUpgradeCopy(step: number, ctx?: UpgradeCtx): { subject: string; headline: string; body: string; cta: string } {
  const base = STRIPE_UPGRADE_STEPS[step] ?? STRIPE_UPGRADE_STEPS[4]

  // No real data — use generic copy as-is
  if (!ctx || ctx.totalLost === 0) return base

  const amt = `$${ctx.totalLost.toLocaleString('en-US')}`
  const count = ctx.failCount
  const reason = ctx.topReason
  const days = ctx.daysLeft

  if (step === 1) {
    return {
      subject: `You have ${amt} in failed payments — one step to recover them`,
      headline: `You're connected. ${amt} is waiting.`,
      body: `LeakCheck just scanned your Stripe — you have <strong style="color:#ff3d3d;">${amt}</strong> across ${count} failed payment${count !== 1 ? 's' : ''}${reason ? ` (most common reason: ${reason})` : ''}.<br><br>On the Free plan, we watch. On Pro, we act: automatic retries and a recovery email sequence go out to your customers — no manual work.<br><br>Average recovery: <strong style="color:#22c55e;">$340/month</strong>. The plan costs $29.`,
      cta: `Recover ${amt} now — $29/mo →`,
    }
  }

  if (step === 2) {
    return {
      subject: `${amt} still unrecovered — ${days} days left in the window`,
      headline: `You can see the leak. Now plug it.`,
      body: `You have <strong style="color:#ff3d3d;">${amt}</strong> in failed payments sitting in your dashboard right now. Every day you wait, the 30-day recovery window gets shorter.<br><br><strong style="color:#fff;">${days} days left</strong> before these payments age out and become unrecoverable.<br><br>Pro retries failed charges automatically and sends dunning emails to your customers. One upgraded plan, zero manual work.`,
      cta: `Recover ${amt} before it expires →`,
    }
  }

  if (step === 3) {
    return {
      subject: `One week in — ${amt} still unrecovered`,
      headline: `A week of watching. Zero recovering.`,
      body: `You've had a full week of visibility into your failed payments. Those <strong style="color:#ff3d3d;">${amt}</strong> are still sitting there unrecovered.<br><br>Worth mentioning: there's a <strong style="color:#fff;">Lifetime Deal at $149</strong> — pay once, use forever, all future features included. Once it's gone, it's monthly only.<br><br>Or go monthly at $29 and cancel anytime.`,
      cta: `Get Lifetime Deal — $149 →`,
    }
  }

  if (step === 4) {
    return {
      subject: `Last nudge — ${amt} still on the table`,
      headline: `Last one. Promise.`,
      body: `You connected Stripe two weeks ago. Those <strong style="color:#ff3d3d;">${amt}</strong> in failed payments are still sitting in your dashboard — unrecovered.<br><br>If the timing's not right, no hard feelings. You can upgrade anytime from your dashboard.<br><br>The Free plan stays free forever.`,
      cta: `Upgrade when ready →`,
    }
  }

  return base
}

function stripeUpgradeHtml(copy: { headline: string; body: string; cta: string }, ctx?: UpgradeCtx): string {
  const hasData = ctx && ctx.totalLost > 0
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;padding:48px 32px;">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td style="padding-right:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#ff3d3d;"></div></td>
            <td><span style="color:#fff;font-size:15px;font-weight:700;letter-spacing:-0.01em;">LeakCheck</span></td>
          </tr>
        </table>
        ${hasData ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <tr>
            <td>
              <p style="color:#666;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 6px;">Unrecovered in your Stripe</p>
              <p style="color:#ff3d3d;font-size:26px;font-weight:800;margin:0 0 4px;">$${ctx!.totalLost.toLocaleString('en-US')}</p>
              <p style="color:#555;font-size:12px;margin:0;">${ctx!.failCount} failed payment${ctx!.failCount !== 1 ? 's' : ''}${ctx!.topReason ? ` · mostly ${ctx!.topReason}` : ''} · ${ctx!.daysLeft} days left in window</p>
            </td>
          </tr>
        </table>` : ''}
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 16px;letter-spacing:-0.02em;line-height:1.25;">${copy.headline}</h1>
        <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 28px;">${copy.body}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td style="background:#ff3d3d;border-radius:10px;">
            <a href="${SITE_URL}/upgrade" style="display:inline-block;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700;font-size:14px;">${copy.cta}</a>
          </td></tr>
        </table>
        <p style="color:#555;font-size:12px;line-height:1.6;margin:0 0 4px;">Free plan stays free · No pressure.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;border-top:1px solid #1a1a1a;">
          <tr><td style="padding-top:20px;">
            <p style="color:#333;font-size:11px;line-height:1.6;margin:0;">You connected Stripe at getleakcheck.com. <a href="${SITE_URL}/dashboard" style="color:#444;">Go to dashboard</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>`
}

export async function sendStripeUpgradeReminder(email: string, step: number, ctx?: UpgradeCtx): Promise<void> {
  const copy = buildUpgradeCopy(step, ctx)
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: email,
    subject: copy.subject,
    html: stripeUpgradeHtml(copy, ctx),
  })
  if (error) console.error(`[resend] stripe upgrade reminder step ${step} failed:`, error.message)
}

export type CfoReportProps = {
  userEmail: string
  month: string
  atRiskAmount: number
  recoveredAmount: number
  recoveryRate: number
  currency: string
  topAccounts: Array<{ name: string | null; email: string | null; amount: number; failureCount: number }>
}

export async function sendCfoReport(props: CfoReportProps): Promise<void> {
  function fmt(cents: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.currency.toUpperCase() }).format(cents / 100)
  }

  const rateColor = props.recoveryRate >= 60 ? '#22c55e' : props.recoveryRate >= 30 ? '#f59e0b' : '#ff3d3d'

  const topRows = props.topAccounts.map(a => {
    const label = escapeHtml(a.name ?? a.email ?? 'Unknown')
    const sub = a.name && a.email ? `<br><span style="color:#666;font-size:11px;">${escapeHtml(a.email)}</span>` : ''
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#ccc;font-size:13px;">${label}${sub}</td>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#ff3d3d;font-size:13px;text-align:right;font-weight:700;">${fmt(a.amount)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#666;font-size:12px;text-align:right;">${a.failureCount}×</td>
      </tr>`
  }).join('')

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;padding:48px 32px;">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td style="padding-right:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#ff3d3d;"></div></td>
            <td><span style="color:#fff;font-size:15px;font-weight:700;letter-spacing:-0.01em;">LeakCheck</span></td>
          </tr>
        </table>
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.02em;">Monthly Recovery Report</h1>
        <p style="color:#555;font-size:13px;margin:0 0 36px;">${escapeHtml(props.month)}</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td width="33%" style="padding:0 8px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:20px;">
                <tr><td>
                  <p style="color:#666;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 8px;">At Risk</p>
                  <p style="color:#ff3d3d;font-size:20px;font-weight:800;margin:0;">${fmt(props.atRiskAmount)}</p>
                </td></tr>
              </table>
            </td>
            <td width="33%" style="padding:0 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:20px;">
                <tr><td>
                  <p style="color:#666;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 8px;">Recovered</p>
                  <p style="color:#22c55e;font-size:20px;font-weight:800;margin:0;">${fmt(props.recoveredAmount)}</p>
                </td></tr>
              </table>
            </td>
            <td width="33%" style="padding:0 0 0 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:20px;">
                <tr><td>
                  <p style="color:#666;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 8px;">Recovery Rate</p>
                  <p style="color:${rateColor};font-size:20px;font-weight:800;margin:0;">${props.recoveryRate}%</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>

        ${topRows ? `
        <p style="color:#555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 12px;">Top At-Risk Accounts</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          ${topRows}
        </table>` : ''}

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
          <tr><td style="background:#ff3d3d;border-radius:10px;">
            <a href="${SITE_URL}/dashboard" style="display:inline-block;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;font-size:14px;">View Dashboard →</a>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1a1a1a;">
          <tr><td style="padding-top:20px;">
            <p style="color:#333;font-size:11px;line-height:1.6;margin:0;">You're receiving this monthly report because you're on the LeakCheck Pro plan. Sent to ${escapeHtml(props.userEmail)}.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>`

  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: props.userEmail,
    subject: `Recovery Report — ${props.month} · ${props.recoveryRate}% recovered`,
    html,
  })
  if (error) console.error('[resend] cfo report failed:', error.message)
}
