const token = () => process.env.TELEGRAM_BOT_TOKEN
const BASE = () => `https://api.telegram.org/bot${token()}`

export async function sendTelegramAlert(chatId: string | null | undefined, text: string): Promise<void> {
  if (!chatId || !token()) return
  try {
    const res = await fetch(`${BASE()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    if (!res.ok) {
      console.error('[telegram] send failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[telegram] send failed:', err)
  }
}

export async function registerWebhook(siteUrl: string): Promise<boolean> {
  if (!token()) return false
  const res = await fetch(`${BASE()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${siteUrl}/api/telegram/webhook` }),
  })
  return res.ok
}
