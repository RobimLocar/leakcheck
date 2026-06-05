import { Resend } from 'resend'
import WelcomeEmail from './emails/welcome'
import PaymentRecoveryEmail, { type PaymentRecoveryProps } from './emails/payment-recovery'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL!

export async function sendWelcomeEmail(email: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Welcome to LeakCheck — connect Stripe in 2 clicks',
    react: WelcomeEmail({ email }),
  })
  if (error) throw new Error(`[resend] welcome email failed: ${error.message}`)
}

export async function sendPaymentRecoveryEmail(
  to: string,
  props: PaymentRecoveryProps,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment failed — action required (${new Intl.NumberFormat('en-US', { style: 'currency', currency: props.currency.toUpperCase() }).format(props.amount / 100)})`,
    react: PaymentRecoveryEmail(props),
  })
  if (error) throw new Error(`[resend] recovery email failed: ${error.message}`)
}
