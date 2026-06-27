'use client'

import { Fragment, useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fireFbq } from '@/lib/fbq'

type ScanStatus = 'pending' | 'active' | 'done'

const STEPS = ['Connect', 'Scanning', 'Your Number']

const SCAN_SEQUENCE = [
  { label: 'Connecting to Stripe API',           delay: 600,  duration: 500 },
  { label: 'Fetching payment history (90 days)', delay: 1200, duration: 800 },
  { label: 'Identifying failed payments',         delay: 2200, duration: 600 },
  { label: 'Classifying failure reasons',         delay: 3000, duration: 600 },
  { label: 'Calculating recoverable amount',      delay: 3800, duration: 700 },
]

const SCAN_FILLS = [15, 32, 55, 74, 95]

const BREAKDOWN = [
  { label: 'Expired cards',      color: '#f59e0b',    count: '4 payments', amount: '−$177' },
  { label: 'Bank declines',      color: 'var(--red)', count: '2 payments', amount: '−$118' },
  { label: 'Insufficient funds', color: '#ff9898',    count: '2 payments', amount: '−$52'  },
]

const SUPPORT_EMAIL = 'support@getleakcheck.com'

const ERROR_MESSAGES: Record<string, string> = {
  stripe_denied:     'Stripe connection was cancelled. Try again — or email us at support@getleakcheck.com if it keeps happening.',
  token_exchange:    'Could not connect to Stripe. Try again, or email support@getleakcheck.com and we\'ll sort it out.',
  db:                'Something went wrong saving your connection. Try again or contact support@getleakcheck.com.',
  misconfigured:     'Stripe Connect is not configured correctly. Email support@getleakcheck.com and we\'ll fix it immediately.',
  already_connected: 'This Stripe account is already linked to another LeakCheck account. Disconnect it there first, or use a different Stripe account. Need help? support@getleakcheck.com',
  session_expired:   'Your session expired — log in again and we\'ll pick up where you left off.',
}

function OnboardingContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [scanStatuses, setScanStatuses] = useState<ScanStatus[]>(Array(5).fill('pending'))
  const [scanFill, setScanFill] = useState(0)
  const [realAmount, setRealAmount] = useState<number | null>(null)
  const [realCount, setRealCount] = useState<number | null>(null)
  const [polling, setPolling] = useState(false)

  // Auto-advance to scanning step after successful OAuth callback
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setStep(2)
      fireFbq('CompleteRegistration', { content_name: 'Stripe Connection', currency: 'USD', value: 0 })
      // Dispara o sync real em background
      fetch('/api/stripe/sync', { method: 'POST' })
        .catch(err => console.error('[onboarding] sync failed:', err))
    }
  }, [searchParams])

  // Landing here fresh (not mid-flow, not after an error) while already
  // connected just re-shows "Connect your Stripe" from scratch — send them
  // to the dashboard instead.
  useEffect(() => {
    if (searchParams.get('connected') === 'true' || searchParams.get('error') || searchParams.get('reconnect') === 'true') return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('stripe_connections')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) window.location.href = '/dashboard'
        })
    })
  }, [searchParams])

  useEffect(() => {
    if (step !== 2) return

    const timers: ReturnType<typeof setTimeout>[] = []
    let pollCancelled = false

    SCAN_SEQUENCE.forEach((s, i) => {
      timers.push(
        setTimeout(() => {
          setScanStatuses(prev => prev.map((st, j) => (j === i ? 'active' : st)))
          setScanFill(SCAN_FILLS[i])
        }, s.delay)
      )
      timers.push(
        setTimeout(() => {
          setScanStatuses(prev => prev.map((st, j) => (j === i ? 'done' : st)))
        }, s.delay + s.duration)
      )
    })

    timers.push(setTimeout(() => setScanFill(100), 5000))
    timers.push(setTimeout(() => {
      setStep(3)
      setPolling(true)
      const supabase = createClient()
      let attempts = 0
      const poll = async () => {
        if (pollCancelled) return
        const { data } = await supabase
          .from('failed_payments')
          .select('amount, status')
          .eq('status', 'open')
        if (pollCancelled) return
        if (data && data.length > 0) {
          setRealAmount(Math.round(data.reduce((s, p) => s + p.amount, 0) / 100))
          setRealCount(data.length)
          setPolling(false)
          return
        }
        attempts++
        if (attempts < 10) {
          timers.push(setTimeout(poll, 1500))
        } else {
          setPolling(false)
        }
      }
      poll()
    }, 5400))

    return () => {
      pollCancelled = true
      timers.forEach(clearTimeout)
    }
  }, [step])

  const dotClass = (n: number) => {
    if (n < step) return 'sd-circle done'
    if (n === step) return 'sd-circle active'
    return 'sd-circle'
  }

  const labelClass = (n: number) => {
    if (n < step) return 'sd-label done'
    if (n === step) return 'sd-label active'
    return 'sd-label'
  }

  const connectError = searchParams.get('error')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Nav */}
      <header className="ob-nav">
        <div className="logo">
          <div className="pip" />
          LeakCheck
        </div>
        <div className="nav-step">Step <strong>{step}</strong> of 3</div>
      </header>

      {/* Step indicator */}
      <div className="steps-bar">
        {STEPS.map((label, i) => {
          const n = i + 1
          return (
            <Fragment key={n}>
              <div className="step-dot">
                <div className="sd-wrap">
                  <div className={dotClass(n)}>{n < step ? '✓' : n}</div>
                  <div className={labelClass(n)}>{label}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={n < step ? 'sd-line done' : 'sd-line'} />
              )}
            </Fragment>
          )
        })}
      </div>

      {/* Main */}
      <div className="ob-main">

        {/* Step 1: Connect */}
        {step === 1 && (
          <div className="step-panel">
            <div className="connect-card">
              <div className="cc-header">
                <div className="cc-icon">🔗</div>
                <div className="cc-title">Connect your Stripe</div>
                <p className="cc-sub">
                  OAuth connection in 2 clicks. We never touch your money without your separate, explicit consent.
                </p>
              </div>
              <div className="cc-body">
                <div className="cc-perms">
                  <div className="cc-perm">
                    <div className="cc-perm-icon">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                    <div>
                      <div className="cc-perm-title">View payment data</div>
                      <div className="cc-perm-desc">We read your invoices, charges, and customers — nothing else.</div>
                    </div>
                  </div>
                  <div className="cc-perm">
                    <div className="cc-perm-icon">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}>
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <div className="cc-perm-title">We never charge without consent</div>
                      <div className="cc-perm-desc">We only read your data by default — we never move money or create charges unless you separately turn on Auto-Recovery.</div>
                    </div>
                  </div>
                  <div className="cc-perm">
                    <div className="cc-perm-icon">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <div className="cc-perm-title">Encrypted & secure</div>
                      <div className="cc-perm-desc">Your token is encrypted at rest. Revoke anytime from Stripe.</div>
                    </div>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(245,158,11,.06)',
                  border: '1px solid rgba(245,158,11,.25)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  fontSize: '12.5px',
                  lineHeight: '1.65',
                  color: 'var(--tx2)',
                }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '6px', fontSize: '12px' }}>
                    ⚠️ Heads up about Stripe's permissions screen
                  </div>
                  Stripe will show <strong style={{ color: 'var(--tx)' }}>"read &amp; write access"</strong> on the next screen.<br />
                  In practice, we only read your data. We never retry a charge or touch your money.<br /><br />
                  You can revoke access anytime from your{' '}
                  <strong style={{ color: 'var(--tx)' }}>Stripe Dashboard → Connected Apps</strong>.
                </div>
                {connectError && (
                  <p className="login-error" style={{ marginBottom: '12px' }}>
                    {ERROR_MESSAGES[connectError] ?? 'Something went wrong. Try again.'}
                  </p>
                )}
                <button
                  className="connect-btn"
                  onClick={() => { window.location.href = '/api/stripe/connect' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                  </svg>
                  Connect with Stripe
                </button>
                <p className="cc-note">🔒 Secured by Stripe OAuth · We never see your password</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Scanning */}
        {step === 2 && (
          <div className="step-panel">
            <div className="scan-card">
              <div className="scan-loader" />
              <div className="scan-title">Scanning your Stripe account</div>
              <p className="scan-sub">Analyzing the last 90 days of payment data...</p>
              <div className="scan-steps">
                {SCAN_SEQUENCE.map((s, i) => {
                  const status = scanStatuses[i]
                  return (
                    <div
                      key={i}
                      className={`ss-item${status === 'done' ? ' done' : status === 'active' ? ' active' : ''}`}
                    >
                      <div className={`ss-dot${status === 'done' ? ' done' : status === 'active' ? ' active' : ''}`}>
                        {status === 'done' ? '✓' : ''}
                      </div>
                      {s.label}
                    </div>
                  )
                })}
              </div>
              <div className="scan-bar">
                <div className="scan-fill" style={{ width: `${scanFill}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Reveal */}
        {step === 3 && (
          <div className="step-panel">
            <div className="reveal-card">
              <div className={`rv-header${!polling && realAmount === null ? ' rv-header--clean' : ''}`}>
                <div className="rv-label">
                  {polling
                    ? 'Scanning your Stripe account…'
                    : realAmount !== null
                      ? 'You lost this month to failed payments'
                      : 'Your payments are clean ✓'}
                </div>
                <div className={`rv-amount${!polling && realAmount === null ? ' rv-amount--clean' : ''}`} style={polling ? { opacity: 0.3 } : {}}>
                  {polling ? '——' : realAmount !== null ? `$${realAmount.toLocaleString('en-US')}` : '$0'}
                </div>
                <div className="rv-sub">
                  {polling
                    ? 'This may take a few seconds for large accounts…'
                    : realAmount !== null
                      ? `across ${realCount} failed payment${realCount !== 1 ? 's' : ''} in the last 30 days`
                      : 'No failed payments in the last 30 days — for now.'}
                </div>
              </div>
              <div className="rv-body">
                {!polling && realAmount !== null && (
                  <div className="rv-insight">
                    <strong>The good news:</strong> ${realAmount.toLocaleString('en-US')} of this is still recoverable within the 30-day window — if you act now.
                  </div>
                )}
                {polling && (
                  <div className="rv-breakdown" style={{ opacity: 0.25, pointerEvents: 'none' }}>
                    {BREAKDOWN.map((row) => (
                      <div key={row.label} className="rv-row">
                        <div className="rv-reason">
                          <div className="rv-dot" style={{ background: row.color }} />
                          {row.label}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span className="rv-count">{row.count}</span>
                          <span className="rv-amount-row">{row.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!polling && realAmount === null && (
                  <div className="rv-clean-points">
                    <div className="rv-clean-point">
                      <span className="rv-clean-icon">🔔</span>
                      <span><strong>Get alerted the second a payment fails</strong> — before the 30-day recovery window closes.</span>
                    </div>
                    <div className="rv-clean-point">
                      <span className="rv-clean-icon">📧</span>
                      <span><strong>Automated recovery emails</strong> sent instantly to your customers — no manual work.</span>
                    </div>
                    <div className="rv-clean-point">
                      <span className="rv-clean-icon">📊</span>
                      <span><strong>Monthly revenue reports</strong> so $0 months stay $0 months.</span>
                    </div>
                  </div>
                )}
                <div className="rv-cta-wrap">
                  <Link href="/upgrade" className="rv-btn main">
                    {realAmount !== null
                      ? `⚡ Recover $${realAmount.toLocaleString('en-US')} now — $29/mo`
                      : '🛡️ Stay protected — $29/mo'}
                  </Link>
                  <Link href="/dashboard" className="rv-btn ghost">
                    View Dashboard first
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}
