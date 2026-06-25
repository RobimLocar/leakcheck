import { createClient } from '@/lib/supabase/server'
import { sendTelegramAlert } from '@/lib/telegram/client'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.telegram_chat_id) {
    return NextResponse.json({ error: 'No Telegram Chat ID saved yet' }, { status: 400 })
  }

  await sendTelegramAlert(
    profile.telegram_chat_id,
    '👋 <b>LeakCheck test</b> — your Telegram alerts are working correctly!',
  )

  return NextResponse.json({ ok: true })
}
