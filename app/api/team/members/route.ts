import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: invites } = await admin
    .from('team_invites')
    .select('id, email, accepted_at, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ invites: invites ?? [] })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const inviteId = body.id as string | undefined
  if (!inviteId) return NextResponse.json({ error: 'Missing invite id' }, { status: 400 })

  const admin = createAdminClient()

  // Get the invite to find the member's user account (if accepted)
  const { data: invite } = await admin
    .from('team_invites')
    .select('id, email, accepted_at')
    .eq('id', inviteId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Unlink member profile if they accepted
  if (invite.accepted_at) {
    const { data: member } = await admin
      .from('profiles')
      .select('id')
      .eq('team_owner_id', user.id)
      .ilike('email', invite.email)
      .maybeSingle()

    if (member) {
      await admin.from('profiles').update({ team_owner_id: null }).eq('id', member.id)
    }
  }

  await admin.from('team_invites').delete().eq('id', inviteId).eq('owner_id', user.id)

  return NextResponse.json({ ok: true })
}
