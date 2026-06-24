// Day-based cadence for the 3-email recovery sequence. Step 1 is sent
// immediately at discovery time (app/api/stripe/sync/route.ts, untracked
// here). email_step tracks how many SEQUENCE emails (steps 2/3) have been
// sent since then.

const STEP2_HOURS = 72  // day 3
const STEP3_HOURS = 168 // day 7

export type SequencePayment = {
  created_at: string
  email_step: number
  status: 'open' | 'recovered' | 'lost'
}

export function nextEmailStep(payment: SequencePayment, now: Date = new Date()): 2 | 3 | null {
  if (payment.status !== 'open') return null
  const hours = (now.getTime() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60)
  if (payment.email_step < 1 && hours >= STEP2_HOURS) return 2
  if (payment.email_step < 2 && hours >= STEP3_HOURS) return 3
  return null
}

export function emailSequenceLabel(payment: SequencePayment): string {
  if (payment.email_step >= 2) return '3 of 3 sent'
  if (payment.email_step >= 1) return '2 of 3 sent'
  return '1 of 3 sent'
}
