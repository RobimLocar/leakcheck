import { type NextRequest, NextResponse } from 'next/server'

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function reply(chatId: number, text: string) {
  await fetch(`${BASE()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {})
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
        `👋 <b>Welcome to LeakCheck!</b>\n\nYour Telegram Chat ID is:\n<code>${chatId}</code>\n\nCopy this number and paste it in your LeakCheck dashboard → Alerts → Telegram section → Save.\n\nYou'll then receive instant notifications when a payment fails or is recovered.`,
      )
    }
  } catch {
    // ignore malformed bodies
  }

  return NextResponse.json({ ok: true })
}
