import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(`${origin}/dashboard?team_error=invalid`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in — send them to login and return after
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent(`/api/team/accept?token=${token}`)}`,
    )
  }

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('team_invites')
    .select('id, owner_id, email, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    return NextResponse.redirect(`${origin}/dashboard?team_error=expired`)
  }

  if (invite.email !== user.email) {
    return NextResponse.redirect(`${origin}/dashboard?team_error=wrong_account`)
  }

  if (!invite.accepted_at) {
    await admin
      .from('team_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    await admin
      .from('profiles')
      .update({ team_owner_id: invite.owner_id })
      .eq('id', user.id)
  }

  return NextResponse.redirect(`${origin}/dashboard?team_joined=1`)
}
