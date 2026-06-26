import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Team members call this route to get their owner's Stripe data.
// RLS blocks direct table access cross-user, so we use the admin client here.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('team_owner_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.team_owner_id) {
    return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
  }

  const ownerId = profile.team_owner_id

  const [{ data: ownerProfile }, { data: connection }, { data: payments }] = await Promise.all([
    admin.from('profiles').select('email, is_pro').eq('id', ownerId).maybeSingle(),
    admin.from('stripe_connections').select('stripe_account_id, scope').eq('user_id', ownerId).maybeSingle(),
    admin.from('failed_payments').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    ownerEmail: ownerProfile?.email ?? null,
    ownerIsPro: ownerProfile?.is_pro ?? false,
    connection: connection ?? null,
    payments: payments ?? [],
  })
}
