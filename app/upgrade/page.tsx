'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const LTD_TOTAL = 20

const TESTIMONIALS = [
  {
    src: 'https://i.pravatar.cc/72?img=11',
    name: 'Mike K.',
    handle: '@mikesaas · $8k MRR',
    body: (
      <>Recovered <b>$1,240 in the first month</b>. The recovery emails are surprisingly good — clients actually thank me for the heads up.</>
    ),
    amount: '+$1,240 first month',
  },
  {
    src: 'https://i.pravatar.cc/72?img=44',
    name: 'Sara V.',
    handle: '@sarav · Newsletter',
    body: (
      <>Setup took 3 minutes. ROI was positive on day one. I had <b>$340 just sitting there</b> in failed cards I didn&apos;t know about.</>
    ),
    amount: '+$340 day one',
  },
  {
    src: 'https://i.pravatar.cc/72?img=13',
    name: 'Paulo S.',
    handle: '@paulos · $15k MRR',
    body: (
      <>Got the lifetime deal. Best $149 I ever spent. Recovering <b>$2,100/month now</b> with zero manual work. Genuinely insane ROI.</>
    ),
    amount: '+$2,100/month',
  },
]

const TRUST_ITEMS = [
  {
    label: 'Never charges without consent',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    label: 'Encrypted at rest',
    icon: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  },
  {
    label: 'Cancel anytime',
    icon: <polyline points="20 6 9 17 4 12" />,
  },
  {
    label: 'Setup in 3 minutes',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </>
    ),
  },
  {
    label: 'No credit card to start',
    icon: <polyline points="20 6 9 17 4 12" />,
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const [lostAmt, setLostAmt] = useState(0)
  const [roiAmt, setRoiAmt] = useState(0)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [ltdTaken, setLtdTaken] = useState(7)

  useEffect(() => {
    const animCount = (target: number, setter: (v: number) => void) => {
      let cur = 0
      const inc = target / (1400 / 16)
      const iv = setInterval(() => {
        cur = Math.min(cur + inc, target)
        setter(Math.round(cur))
        if (cur >= target) clearInterval(iv)
      }, 16)
    }
    const t = setTimeout(() => {
      animCount(347, setLostAmt)
      animCount(295, setRoiAmt)
    }, 500)

    fetch('/api/ltd-count')
      .then(r => r.json())
      .then(d => { if (typeof d.taken === 'number') setLtdTaken(d.taken) })
      .catch(() => {})

    return () => clearTimeout(t)
  }, [])

  const checkout = async (plan: 'monthly' | 'lifetime') => {
    if (checkoutLoading) return
    setCheckoutLoading(plan)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setCheckoutLoading(null)
      // The error banner lives near the top of the page, but the button that
      // triggers it (e.g. the Lifetime Deal banner further down) can be well
      // out of view — without this, clicking it looks like nothing happened.
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const spots = Array.from({ length: LTD_TOTAL }, (_, i) => i < ltdTaken)

  return (
    <>
      <header className="up-nav">
        <div className="logo">
          <div className="pip" />
          LeakCheck
        </div>
        <button className="back" onClick={() => router.push('/dashboard')}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Dashboard
        </button>
      </header>

      <div className="page up-page">

        {/* Header */}
        <div className="page-header">
          <div className="page-badge">
            <div className="badge-dot" />
            37 teams upgraded this week
          </div>
          <h1 className="page-h1">
            Stop losing money<br />you&apos;ve already earned.
          </h1>
          <p className="page-sub">
            Activate automatic recovery and get back every dollar that failed this month.
          </p>
        </div>

        {/* Your Number */}
        <div className="your-number">
          <div className="yn-left">
            <div className="yn-label">You lost this month</div>
            <div className="yn-amount">${lostAmt.toLocaleString('en-US')}</div>
            <div className="yn-sub">in failed payments that could be recovered</div>
          </div>
          <div className="yn-right">
            <div className="yn-roi">${roiAmt.toLocaleString('en-US')}/mo</div>
            <div className="yn-roi-label">
              est. monthly recovery<br />with LeakCheck Pro
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="social-proof">
          <div className="sp-item">
            <div className="sp-avatars">
              {['11', '47', '33', '44', '57'].map((id) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={id}
                  className="sp-av"
                  src={`https://i.pravatar.cc/56?img=${id}`}
                  alt=""
                />
              ))}
            </div>
            <span>
              <strong style={{ color: 'var(--tx)' }}>200+ teams</strong> already recovering
            </span>
          </div>
          <div className="sp-divider" />
          <div className="sp-item">
            ⭐⭐⭐⭐⭐ <strong style={{ color: 'var(--tx)' }}>4.9/5</strong> from 87 reviews
          </div>
          <div className="sp-divider" />
          <div className="sp-item">
            🔒 <strong style={{ color: 'var(--tx)' }}>SOC2</strong> compliant · Never charges without consent
          </div>
        </div>

        {/* Checkout error */}
        {checkoutError && (
          <div style={{
            background: 'rgba(255,61,61,.08)',
            border: '1px solid rgba(255,61,61,.25)',
            color: 'var(--red)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13.5px',
            textAlign: 'center',
            marginBottom: '8px',
          }}>
            {checkoutError}
          </div>
        )}

        {/* Pricing */}
        <div className="pricing">

          {/* Free — current plan */}
          <div className="pc">
            <div className="pc-plan">Free — Current Plan</div>
            <div className="pc-price">
              $<span style={{ fontSize: '46px' }}>0</span>
            </div>
            <p className="pc-desc">Dashboard visibility only.</p>
            <div className="pc-div" />
            <div className="pc-f"><div className="pc-ck">✓</div>Failed payment dashboard</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Account Risk Score</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Breakdown by failure reason</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Customer list</div>
            <div className="pc-f"><div className="pc-ck">✓</div>12-month history</div>
            <div className="pc-f"><div className="pc-x">✕</div><span style={{ opacity: 0.5 }}>Auto-recovery</span></div>
            <div className="pc-f"><div className="pc-x">✕</div><span style={{ opacity: 0.5 }}>Alerts — Email, Slack & Telegram</span></div>
            <div className="pc-f"><div className="pc-x">✕</div><span style={{ opacity: 0.5 }}>Recovery email + SMS sequence</span></div>
            <button className="pc-cta ghost" onClick={() => { window.location.href = '/dashboard' }}>
              Get Started Free
            </button>
          </div>

          {/* Recovery — featured */}
          <div className="pc featured">
            <div className="pc-badge">MOST POPULAR · PAYS FOR ITSELF</div>
            <div className="pc-plan">Recovery</div>
            <div className="pc-price"><sup>$</sup>29<sub>/mo</sub></div>
            <p className="pc-desc">Stop the leak. Recover automatically. Cancel anytime.</p>
            <div className="pc-div" />
            <div className="pc-f"><div className="pc-ck">✓</div>Everything in Free</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Smart retry logic by failure type</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Email + SMS recovery sequence</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Custom templates — write your own or generate with AI</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Sent from your name, replies go to your inbox</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Instant alerts — Email, Slack &amp; Telegram</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Monthly recovery report</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Priority support</div>
            <button
              className="pc-cta main"
              onClick={() => checkout('monthly')}
              style={checkoutLoading === 'monthly' ? { opacity: 0.7 } : undefined}
            >
              {checkoutLoading === 'monthly'
                ? 'Redirecting to Stripe...'
                : <>Start Recovery — $29/mo <span style={{ marginLeft: '4px' }}>→</span></>}
            </button>
            <p className="pc-roi">⚡ Avg recovery: $340/mo · ROI = 11x your cost</p>
          </div>

          {/* Lifetime */}
          <div className="pc">
            <div className="pc-plan">🔥 Lifetime Deal</div>
            <div className="pc-price"><sup>$</sup>149</div>
            <p className="pc-desc">Pay once. Use forever.<br />First 20 spots only.</p>
            <div className="pc-div" />
            <div className="pc-f"><div className="pc-ck">✓</div>Everything in Recovery</div>
            <div className="pc-f"><div className="pc-ck">✓</div>All future features included</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Team member access (up to 3)</div>
            <div className="pc-f"><div className="pc-ck">✓</div>Monthly CFO recovery report</div>
            <div className="pc-f" style={{ opacity: 0, pointerEvents: 'none' }}><div className="pc-x" /></div>
            <div className="pc-f" style={{ opacity: 0, pointerEvents: 'none' }}><div className="pc-x" /></div>
            <button
              className="pc-cta dark"
              onClick={() => checkout('lifetime')}
              style={checkoutLoading === 'lifetime' ? { opacity: 0.7 } : undefined}
            >
              {checkoutLoading === 'lifetime' ? 'Redirecting to Stripe...' : 'Get Lifetime — $149'}
            </button>
            <p style={{ marginTop: '10px', textAlign: 'center', fontSize: '11.5px', color: 'var(--tx3)' }}>
              Saves $349/year vs monthly
            </p>
          </div>

        </div>

        {/* LTD Banner */}
        <div className="ltd">
          <div className="ltd-emoji">🔥</div>
          <div className="ltd-content">
            <div className="ltd-title">Lifetime Deal — Only {LTD_TOTAL} spots total, {LTD_TOTAL - ltdTaken} remaining</div>
            <div className="ltd-desc">
              Pay <strong>$149 once</strong>, use forever. All future features included. Price goes up when spots are gone.
            </div>
            <div className="ltd-spots">
              <span style={{ fontSize: '11px', color: 'var(--tx3)', marginRight: '4px' }}>Spots taken:</span>
              {spots.map((taken, i) => (
                <div key={i} className={taken ? 'ltd-spot taken' : 'ltd-spot'} />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--tx3)', marginLeft: '4px' }}>{ltdTaken} taken · {LTD_TOTAL - ltdTaken} left</span>
            </div>
          </div>
          <button
            className="ltd-btn"
            onClick={() => checkout('lifetime')}
            style={checkoutLoading === 'lifetime' ? { opacity: 0.7 } : undefined}
          >
            {checkoutLoading === 'lifetime' ? 'Redirecting...' : 'Claim Lifetime — $149'}
          </button>
        </div>

        {/* Testimonials */}
        <div className="tstrip">
          <div className="tstrip-title">What founders say after upgrading</div>
          <div className="tstrip-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="tcard">
                <div className="tcard-head">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="tcard-av" src={t.src} alt={t.name} />
                  <div>
                    <div className="tcard-name">{t.name}</div>
                    <div className="tcard-handle">{t.handle}</div>
                  </div>
                </div>
                <p className="tcard-body">{t.body}</p>
                <span className="tcard-amount">{t.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="trust">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="tb-item">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {item.icon}
              </svg>
              {item.label}
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
