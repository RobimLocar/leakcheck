import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { type NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

const TemplatesSchema = z.object({
  sms: z.object({
    '1': z.string().describe('SMS sent immediately when the payment fails — short, plain text, under ~160 characters'),
    '2': z.string().describe('SMS sent on day 3 if still unresolved — slightly more urgent than step 1'),
    '3': z.string().describe('SMS sent on day 7, final notice — most urgent, warns of service interruption'),
  }),
  email: z.object({
    '1': z.string().describe('1-2 sentence email body for the immediate notice — explains the failure, asks to update payment'),
    '2': z.string().describe('1-2 sentence email body for the day-3 reminder — slightly more urgent'),
    '3': z.string().describe('1-2 sentence email body for the day-7 final notice — most urgent, mentions service interruption'),
  }),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_pro) {
    return NextResponse.json({ error: 'Pro feature' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : ''

  if (!description) {
    return NextResponse.json({ error: 'Describe your product or brand first' }, { status: 400 })
  }

  try {
    const response = await anthropic.messages.parse({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: 'You write payment-recovery (dunning) SMS and email copy for SaaS businesses. ' +
        'Write a 3-step escalating sequence (immediate, day 3, day 7 final notice) matching the brand voice described by the user. ' +
        'Keep SMS short and plain text. Keep email bodies to 1-2 sentences (the surrounding template already has a greeting and a button). ' +
        'Always include the literal tokens {{amount}} and {{reason}} somewhere in each message. ' +
        'SMS has no separate button, so it must also include {{link}} as its call to action. ' +
        'Email already has a separate "Update Payment Method" button right below the message, so the email body text must NEVER include {{link}} or spell out a URL — that would just repeat the button. ' +
        'Do not include {{name}} unless it reads naturally. Write in English. Do not use markdown formatting.',
      messages: [{ role: 'user', content: `Brand/product description: ${description}` }],
      output_config: { format: zodOutputFormat(TemplatesSchema) },
    })

    if (!response.parsed_output) {
      return NextResponse.json({ error: 'Could not generate templates' }, { status: 502 })
    }

    return NextResponse.json(response.parsed_output)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
