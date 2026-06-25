import { type NextRequest, NextResponse } from 'next/server'

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function reply(chatId: number, text: string) {
  try {
    const res = await fetch(`${BASE()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!res.ok) {
      console.error('[telegram/webhook] reply failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[telegram/webhook] reply error:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = body?.message
    console.log('[telegram/webhook] message:', JSON.stringify(message))
    console.log('[telegram/webhook] token present:', !!process.env.TELEGRAM_BOT_TOKEN)
    if (!message) return NextResponse.json({ ok: true })

    const chatId: number = message.chat?.id
    const text: string = message.text ?? ''

    if (text.startsWith('/start')) {
      console.log('[telegram/webhook] replying to chatId:', chatId)
      await reply(
        chatId,
        `Welcome to LeakCheck Alerts!\n\nYour Chat ID is: ${chatId}\n\nCopy this number and paste it in your LeakCheck dashboard under Alerts > Telegram > Save.\n\nYou will receive notifications when a payment fails or is recovered.`,
      )
    }
  } catch {
    // ignore malformed bodies
  }

  return NextResponse.json({ ok: true })
}
