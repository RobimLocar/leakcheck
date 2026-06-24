// Stripe REST helpers for calling a CONNECTED account's API directly using
// its OAuth access_token (from stripe_connections.access_token) as the
// Bearer token — same raw-fetch pattern used in app/api/checkout/route.ts
// and lib/stripe/fetchFailedPayments.ts (no stripe-node SDK in this repo).

export async function stripeGet(path: string, accessToken: string) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function stripePost(
  path: string,
  params: Record<string, string>,
  accessToken: string,
) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
    cache: 'no-store',
  })
  return res.json()
}

export type PayInvoiceResult =
  | { ok: true }
  | { ok: false; error: string }

// Attempts to pay an open invoice using the customer's default payment
// method. This is the actual "retry" — Stripe re-runs the charge.
export async function payInvoice(invoiceId: string, accessToken: string): Promise<PayInvoiceResult> {
  const result = await stripePost(`/v1/invoices/${invoiceId}/pay`, {}, accessToken)
  if (result.error) return { ok: false, error: result.error.message as string }
  if (result.status === 'paid') return { ok: true }
  return { ok: false, error: `Invoice status after pay attempt: ${result.status}` }
}
