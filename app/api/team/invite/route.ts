import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendTeamInvite } from '@/lib/resend/client'
import { type NextRequest, NextResponse } from 'next/server'

const MAX_MEMBERS = 3

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_pro) {
    return NextResponse.json({ error: 'Team members require the Pro plan.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const email = (body.email as string | undefined)?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }
  if (email === user.email) {
    return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Count existing members + pending invites
  const { count } = await admin
    .from('team_invites')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  if ((count ?? 0) >= MAX_MEMBERS) {
    return NextResponse.json({ error: `Maximum ${MAX_MEMBERS} team members allowed on Pro.` }, { status: 400 })
  }

  // Upsert invite (idempotent re-invite)
  const { data: invite, error } = await admin
    .from('team_invites')
    .upsert({ owner_id: user.id, email }, { onConflict: 'owner_id,email', ignoreDuplicates: false })
    .select('token')
    .maybeSingle()

  if (error || !invite) {
    return NextResponse.json({ error: 'Failed to create invite.' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  await sendTeamInvite({
    to: email,
    ownerEmail: profile.email ?? user.email!,
    acceptUrl: `${origin}/api/team/accept?token=${invite.token}`,
  })

  return NextResponse.json({ ok: true })
}
