// Twilio REST API via raw fetch (same convention as every other external
// API call in this repo — no SDK). Never throws: best-effort, same
// swallow-and-log style as lib/slack/client.ts.

export async function sendSms(to: string | null | undefined, body: string): Promise<void> {
  if (!to) return
  // Twilio requires E.164 (+<countrycode><number>). We don't guess a missing
  // country code — safer to skip than to misdial.
  if (!to.startsWith('+')) {
    console.error('[sms] skipped — phone not in E.164 format:', to)
    return
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !from) return

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })
    if (!res.ok) {
      console.error('[sms] send failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[sms] send failed:', err)
  }
}
