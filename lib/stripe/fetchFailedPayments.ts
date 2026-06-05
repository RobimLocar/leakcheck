// Minimal Stripe types — only the fields we actually use
type StripeCharge = {
  id: string
  failure_code: string | null
}

type StripeInvoice = {
  id: string
  customer_name: string | null
  customer_email: string | null
  amount_due: number
  currency: string
  charge: StripeCharge | null  // null when never attempted; expanded object when charged
  created: number              // Unix timestamp
}

type StripeListResponse<T> = {
  data: T[]
  has_more: boolean
}

export type FailedPayment = {
  stripe_invoice_id: string
  customer_name: string | null
  customer_email: string | null
  amount: number
  currency: string
  failure_reason: string
  created_at: string
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
    // Never cache — always fetch live data
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      `Stripe API error (${status} invoices): ${body?.error?.message ?? res.statusText}`
    )
  }

  const list: StripeListResponse<StripeInvoice> = await res.json()
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
    amount:            inv.amount_due,
    currency:          inv.currency,
    failure_reason:    mapReason(inv.charge?.failure_code),
    created_at:        new Date(inv.created * 1000).toISOString(),
  }))
}
