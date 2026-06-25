import { registerWebhook } from '@/lib/telegram/client'
import { NextResponse } from 'next/server'

// One-time call to register the Telegram webhook with the bot.
// Protected by CRON_SECRET so only the operator can call it.
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getleakcheck.com'
  const ok = await registerWebhook(siteUrl)
  return NextResponse.json({ ok })
}
