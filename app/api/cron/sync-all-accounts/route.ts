import { createAdminClient } from '@/lib/supabase/admin'
import { fetchFailedPayments } from '@/lib/stripe/fetchFailedPayments'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: connections, error } = await admin
    .from('stripe_connections')
    .select('user_id, access_token, stripe_account_id')

  if (error) {
    console.error('[sync-all-accounts] connections query failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!connections?.length) return NextResponse.json({ synced: 0, accounts: 0 })

  let totalSynced = 0
  const results: Array<{ account: string; synced: number; error?: string }> = []

  for (const conn of connections) {
    try {
      const payments = await fetchFailedPayments(conn.access_token)

      if (payments.length === 0) {
        results.push({ account: conn.stripe_account_id, synced: 0 })
        continue
      }

      const rows = payments.map(p => ({ user_id: conn.user_id, ...p }))

      const { error: upsertErr } = await admin
        .from('failed_payments')
        .upsert(rows, { onConflict: 'stripe_invoice_id', ignoreDuplicates: true })

      if (upsertErr) {
        console.error(`[sync-all-accounts] upsert failed for ${conn.stripe_account_id}:`, upsertErr.message)
        results.push({ account: conn.stripe_account_id, synced: 0, error: upsertErr.message })
        continue
      }

      totalSynced += payments.length
      results.push({ account: conn.stripe_account_id, synced: payments.length })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[sync-all-accounts] fetch failed for ${conn.stripe_account_id}:`, msg)
      results.push({ account: conn.stripe_account_id, synced: 0, error: msg })
    }
  }

  console.log(`[sync-all-accounts] total synced: ${totalSynced} across ${connections.length} accounts`)
  return NextResponse.json({ synced: totalSynced, accounts: connections.length, results })
}
