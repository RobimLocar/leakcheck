// Minimal Stripe types — only the fields we actually use
type StripeCharge = {
  id: string
  failure_code: string | null
}

type StripeInvoice = {
  id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  amount_due: number
  currency: string
  charge: StripeCharge | null  // null when never attempted; expanded object when charged
  created: number              // Unix timestamp
  hosted_invoice_url: string | null  // Stripe-hosted page where the customer can actually pay/update their card
}

type StripeListResponse<T> = {
  data: T[]
  has_more: boolean
}

export type FailedPayment = {
  stripe_invoice_id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  amount: number
  currency: string
  failure_reason: string
  created_at: string
  hosted_invoice_url: string | null
}

const FAILURE_REASONS: Record<string, string> = {
  card_declined:      'Bank Decline',
  expired_card:       'Expired Card',
  insufficient_funds: 'Insufficient Funds',
  do_not_honor:       'Bank Decline',
}

function mapReason(code: string | null | undefined): string {
  if (!code) return 'Payment Failed'
  return FAILURE_REASONS[code] ?? 'Payment Failed'
}

async function listInvoices(
  accessToken: string,
  status: 'open' | 'uncollectible',
  sinceUnix: number
): Promise<StripeInvoice[]> {
  const params = new URLSearchParams()
  params.set('status', status)
  params.set('created[gte]', String(sinceUnix))
  params.set('limit', '100')
  // Expand the charge object so we get failure_code without extra round-trips
  params.append('expand[]', 'data.charge')

  const res = await fetch(`https://api.stripe.com/v1/invoices?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = `Stripe ${status} invoices error ${res.status}: ${body?.error?.message ?? res.statusText}`
    console.error('[fetchFailedPayments]', msg)
    throw new Error(msg)
  }

  const list: StripeListResponse<StripeInvoice> = await res.json()
  console.log(`[fetchFailedPayments] ${status} invoices fetched:`, list.data.length, 'has_more:', list.has_more)
  return list.data
}

export async function fetchFailedPayments(
  accessToken: string
): Promise<FailedPayment[]> {
  const since = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)

  const [openInvoices, uncollectibleInvoices] = await Promise.all([
    listInvoices(accessToken, 'open', since),
    listInvoices(accessToken, 'uncollectible', since),
  ])

  // Merge and deduplicate (an invoice shouldn't appear in both, but be safe)
  const seen = new Set<string>()
  const all = [...openInvoices, ...uncollectibleInvoices].filter(inv => {
    if (seen.has(inv.id)) return false
    seen.add(inv.id)
    return true
  })

  return all.map(inv => ({
    stripe_invoice_id: inv.id,
    customer_name:     inv.customer_name,
    customer_email:    inv.customer_email,
    customer_phone:    inv.customer_phone,
    amount:            inv.amount_due,
    currency:          inv.currency,
    failure_reason:    mapReason(inv.charge?.failure_code),
    created_at:        new Date(inv.created * 1000).toISOString(),
    hosted_invoice_url: inv.hosted_invoice_url,
  }))
}
