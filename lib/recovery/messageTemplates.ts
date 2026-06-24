// User-editable copy for the recovery sequence. Free-text templates support
// merge fields ({{amount}}, {{reason}}, {{name}}, {{link}}) and fall back to
// these defaults when a user hasn't customized a given step.

export type RecoveryStep = '1' | '2' | '3'

export type MessageTemplates = {
  sms?: Partial<Record<RecoveryStep, string>>
  email?: Partial<Record<RecoveryStep, string>>
}

export const DEFAULT_SMS_TEMPLATES: Record<RecoveryStep, string> = {
  '1': 'LeakCheck: your {{amount}} payment failed ({{reason}}). Update your card: {{link}}',
  '2': 'LeakCheck: still unable to charge your card for {{amount}} ({{reason}}). Update: {{link}}',
  '3': 'LeakCheck: final notice — still unable to charge {{amount}} ({{reason}}). Your service may be interrupted. Update now: {{link}}',
}

// Email defaults only cover the message body sentence — subject/heading/
// layout stay fixed so a bad edit can't break the email's branding or HTML.
export const DEFAULT_EMAIL_TEMPLATES: Record<RecoveryStep, string> = {
  '1': 'Your payment failed because: {{reason}}. Please update your payment method to continue your service.',
  '2': 'We tried again and your payment is still failing. Please update your payment method to avoid an interruption to your service.',
  '3': 'This is our final reminder — your payment has been failing for over a week. Please update your payment method now to keep your service active.',
}

export type TemplateVars = {
  amount: string
  reason: string
  name: string
  link: string
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replaceAll('{{amount}}', vars.amount)
    .replaceAll('{{reason}}', vars.reason)
    .replaceAll('{{name}}', vars.name)
    .replaceAll('{{link}}', vars.link)
}

export function getSmsTemplate(templates: MessageTemplates | null | undefined, step: RecoveryStep): string {
  return templates?.sms?.[step]?.trim() || DEFAULT_SMS_TEMPLATES[step]
}

// Returns the user's custom email template only when they've actually set
// one for this step — undefined means "use the built-in default", which
// callers in lib/resend/client.ts render with their own (bolded) markup.
export function getCustomEmailTemplate(templates: MessageTemplates | null | undefined, step: RecoveryStep): string | undefined {
  return templates?.email?.[step]?.trim() || undefined
}
