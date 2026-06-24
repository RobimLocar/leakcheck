import { createClient } from '@/lib/supabase/server'
import { sendSlackAlert } from '@/lib/slack/client'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('slack_webhook_url')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.slack_webhook_url) {
    return NextResponse.json({ error: 'No Slack webhook URL saved yet' }, { status: 400 })
  }

  await sendSlackAlert(profile.slack_webhook_url, '👋 This is a test alert from LeakCheck — your Slack alerts are working.')

  return NextResponse.json({ ok: true })
}
