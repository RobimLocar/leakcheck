import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchFailedPayments } from '@/lib/stripe/fetchFailedPayments'
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
      { status: 400 }
    )
  }

  // Fetch failed payments from Stripe
  let payments
  try {
    payments = await fetchFailedPayments(connection.access_token)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe fetch failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (payments.length === 0) {
    return NextResponse.json({ synced: 0, total_lost: 0 })
  }

  // Write to the DB using the service role client (bypasses RLS).
  // ignoreDuplicates: true preserves any status the user has already set
  // (e.g., 'recovered') without overwriting it on re-sync.
  const admin = createAdminClient()
  const rows = payments.map(p => ({ user_id: user.id, ...p }))

  const { error: upsertError } = await admin
    .from('failed_payments')
    .upsert(rows, { onConflict: 'stripe_invoice_id', ignoreDuplicates: true })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  const total_lost = payments.reduce((sum, p) => sum + p.amount, 0)

  return NextResponse.json({ synced: payments.length, total_lost })
}
