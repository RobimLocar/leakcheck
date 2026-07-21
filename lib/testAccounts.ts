// Synthetic accounts created for internal testing/audits (never real customers).
// Automated email campaigns (activation reminders, upgrade nudges, etc.)
// should skip these — sending to them wastes Resend quota and pollutes
// delivery metrics with addresses that don't represent real users.
const TEST_DOMAINS = ['leakcheck-test.io', 'example.com']
const TEST_EXACT_EMAILS = ['check@test.com']

export function isTestEmail(email: string): boolean {
  const lower = email.toLowerCase()
  if (TEST_EXACT_EMAILS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return TEST_DOMAINS.includes(domain)
}
