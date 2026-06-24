// "Smart by failure type" retry policy. We only persist the friendly
// failure_reason string (see lib/stripe/fetchFailedPayments.ts FAILURE_REASONS),
// not the raw Stripe failure_code, so the policy keys off that string.
//
// Only "Insufficient Funds" is auto-retried — it's the one failure type that's
// genuinely often transient (paycheck timing). Expired/declined cards need a
// new payment method, not a retry, so those go through the email sequence
// instead of wasting Stripe attempts and annoying the customer.

const RETRY_DELAYS_HOURS = [24, 72, 120] as const // first attempt at +24h, then +72h, +120h
export const MAX_RETRIES = RETRY_DELAYS_HOURS.length

export type RetryablePayment = {
  failure_reason: string
  created_at: string
  retry_count: number
  last_retry_at: string | null
  retry_exhausted: boolean
  status: 'open' | 'recovered' | 'lost'
}

export function isRetryable(failureReason: string): boolean {
  return failureReason === 'Insufficient Funds'
}

function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

export function isRetryDue(payment: RetryablePayment, now: Date = new Date()): boolean {
  if (payment.status !== 'open') return false
  if (payment.retry_exhausted) return false
  if (!isRetryable(payment.failure_reason)) return false
  if (payment.retry_count >= MAX_RETRIES) return false

  const delayHours = RETRY_DELAYS_HOURS[payment.retry_count]
  const sinceReference = payment.last_retry_at ?? payment.created_at
  return hoursSince(sinceReference, now) >= delayHours
}

// For display: when is the next retry expected (or null if none scheduled).
export function nextRetryEta(payment: RetryablePayment): Date | null {
  if (payment.status !== 'open' || payment.retry_exhausted) return null
  if (!isRetryable(payment.failure_reason)) return null
  if (payment.retry_count >= MAX_RETRIES) return null

  const delayHours = RETRY_DELAYS_HOURS[payment.retry_count]
  const sinceReference = payment.last_retry_at ?? payment.created_at
  return new Date(new Date(sinceReference).getTime() + delayHours * 60 * 60 * 1000)
}
