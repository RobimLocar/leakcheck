import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'LeakCheck <onboarding@resend.dev>'

export async function sendWelcomeEmail(email: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Welcome to LeakCheck — connect Stripe in 2 clicks',
    html: `
      <div style="background:#0a0a0a;padding:40px;font-family:sans-serif;">
        <h1 style="color:#fff;font-size:22px;">Welcome to LeakCheck</h1>
        <p style="color:#888;">You signed up with ${email}.</p>
        <p style="color:#888;">Connect your Stripe account to see how much you're losing to failed payments.</p>
        <a href="https://leakcheck-three.vercel.app/onboarding"
           style="display:inline-block;background:#ff3d3d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
          Connect Stripe →
        </a>
      </div>
    `,
  })
  if (error) console.error('[resend] welcome email failed:', error.message)
}

export type PaymentRecoveryProps = {
  customerName: string | null
  amount: number
  currency: string
  failureReason: string
}

export async function sendPaymentRecoveryEmail(
  to: string,
  props: PaymentRecoveryProps,
): Promise<void> {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency.toUpperCase(),
  }).format(props.amount / 100)

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment failed — action required (${formatted})`,
    html: `
      <div style="background:#fff;padding:40px;font-family:sans-serif;">
        <h1 style="color:#111;font-size:20px;">Your payment of ${formatted} failed</h1>
        <p style="color:#555;">Hi ${props.customerName ?? 'there'},</p>
        <p style="color:#555;">Your payment failed because: <strong>${props.failureReason}</strong>.</p>
        <p style="color:#555;">Please update your payment method to continue your service.</p>
        <a href="https://billing.stripe.com"
           style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
          Update Payment Method →
        </a>
      </div>
    `,
  })
  if (error) console.error('[resend] recovery email failed:', error.message)
}
