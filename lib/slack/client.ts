// Plain Slack Incoming Webhook POST — no SDK needed.
// Never throws: alerts are best-effort, same non-blocking style as email sends.

export async function sendSlackAlert(webhookUrl: string | null | undefined, text: string): Promise<void> {
  if (!webhookUrl) return
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error('[slack] alert failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[slack] alert failed:', err)
  }
}
