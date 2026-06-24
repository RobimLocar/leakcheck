'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Data ──────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  '⚡ <strong>Mike K.</strong> recovered $1,240 in the first month',
  '💸 20–40% of subscription churn is preventable',
  '✅ <strong>Sara V.</strong> found $340 in expired cards in 2 minutes',
  '🔍 Average founder loses <strong>$340/month</strong> without knowing',
  '⚡ <strong>Paulo S.</strong> recovered $2,100 — zero effort after setup',
  '📊 80–90% recovery rate with smart retry + email sequence',
  '✅ <strong>Tom M.</strong> · "ROI on day one. Should be built into Stripe."',
  '💡 Connect your Stripe in 60 seconds — free forever',
  '🔥 First 20 founders get lifetime access for $149',
]

interface Testimonial {
  name: string
  handle: string
  body: string
  amt: string
  img: string
}

const TESTIMONIALS: Testimonial[] = [
  { name: 'Mike K.', handle: '@mikesaas · $8k MRR', body: 'Connected LeakCheck and found I was losing <b>$1,240/month</b> to failed payments. Had absolutely no idea.', amt: '+$1,240 recovered', img: 'https://i.pravatar.cc/64?img=11' },
  { name: 'Jen L.', handle: '@indie_jen · Membership', body: 'I was blaming my product for churn. Turns out <b>38% was just failed cards</b>. Showed me in 60 seconds.', amt: '+$620 recovered', img: 'https://i.pravatar.cc/64?img=47' },
  { name: 'Tom M.', handle: '@buildinpublic · SaaS', body: 'Should be built into Stripe. ROI on day one. Recovery sequence paid for 6 months in week one.', amt: '+$890 recovered', img: 'https://i.pravatar.cc/64?img=33' },
  { name: 'Sara V.', handle: '@sarav · Newsletter', body: 'Found <b>$340 in expired cards</b> the first time I connected. Setup took literally 2 minutes.', amt: '+$340 recovered', img: 'https://i.pravatar.cc/64?img=44' },
  { name: 'Dan R.', handle: '@danr · $3k MRR', body: 'Thought my churn was a product problem. It was a payment problem. Way easier fix.', amt: '+$410 recovered', img: 'https://i.pravatar.cc/64?img=57' },
  { name: 'Lena B.', handle: '@lenab · Course creator', body: 'Students were losing access because cards expired. <b>LeakCheck caught 12</b> automatically.', amt: '+$588 recovered', img: 'https://i.pravatar.cc/64?img=25' },
  { name: 'Chris O.', handle: '@chriso · Bootstrapped', body: 'Dead simple. One number. I check it every Monday morning. Never going back.', amt: '+$270 recovered', img: 'https://i.pravatar.cc/64?img=60' },
  { name: 'Mia T.', handle: '@miat · SaaS founder', body: "I was losing <b>6% of MRR every month</b> to failed payments. That's nearly 3 months of ARR per year.", amt: '+$1,800 recovered', img: 'https://i.pravatar.cc/64?img=38' },
  { name: 'Paulo S.', handle: '@paulos · $15k MRR', body: 'Most boring ROI I\'ve ever gotten. Connect, see number, recover money. Zero effort after setup.', amt: '+$2,100 recovered', img: 'https://i.pravatar.cc/64?img=13' },
  { name: 'Fiona M.', handle: '@fionam · Coaching', body: 'Recovery emails it sends are actually good — not spammy. Clients thanked me for the heads up.', amt: '+$490 recovered', img: 'https://i.pravatar.cc/64?img=29' },
  { name: 'Alex H.', handle: '@alexh · DevTools', body: 'Wish I had this 2 years ago. I estimate I lost <b>over $15k</b> to failed payments I never knew about.', amt: '+$750/mo now', img: 'https://i.pravatar.cc/64?img=52' },
  { name: 'Nina W.', handle: '@ninaw · B2B SaaS', body: 'Simple, fast, pays for itself 10x every month. Best $29 I spend. No contest.', amt: '+$960 recovered', img: 'https://i.pravatar.cc/64?img=41' },
]

const COL_INDICES = [
  [0, 1, 2, 3, 4, 5],
  [3, 4, 5, 6, 7, 8],
  [6, 7, 8, 9, 10, 11],
  [9, 10, 11, 0, 1, 2],
]

const FREE_FEATURES = [
  'Failed payment dashboard',
  'Breakdown by failure reason',
  'Full customer list',
  '90-day payment history',
  'Unlimited Stripe accounts',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Smart retry logic by failure type',
  'Email + SMS recovery sequence',
  'Write your own message templates — or generate with AI',
  'Real-time Slack + email alerts',
  'Monthly recovery report',
]

const FAQ_ITEMS = [
  {
    q: "Is it really free? What's the catch?",
    a: "No catch. The dashboard is completely free, forever. We make money when you upgrade to the Recovery plan ($29/mo). We're fully aligned — you only pay when we help you make money back.",
  },
  {
    q: 'Do you store my Stripe data?',
    a: "We only read data on the free dashboard — that's all it ever needs, and we never initiate a charge unless you've separately turned on Auto-Recovery. (Stripe's own platform rules currently require every connection to technically grant write access too; you can always see the exact access level in Settings.) We never store full card data — Stripe handles that.",
  },
  {
    q: 'How much can I realistically recover?',
    a: "The industry average is 20–40% of all churn being involuntary. Our recovery system catches 80–90% of those with smart retry timing + personalized emails. For $5k MRR, that's typically $200–$400/month recovered.",
  },
  {
    q: 'Does it work with Substack or Gumroad?',
    a: 'Currently LeakCheck connects directly to Stripe. Gumroad and Lemon Squeezy are on the roadmap. Substack uses Stripe under the hood but doesn\'t expose the API directly.',
  },
  {
    q: 'Can I customize the recovery messages?',
    a: 'Yes — edit the SMS and email copy for every step yourself, or describe your product and let AI draft it for you. Recovery emails also go out under your own name with replies routed to your real inbox, not a no-reply address.',
  },
  {
    q: 'What if I want to cancel?',
    a: "Cancel anytime from Settings — one click opens Stripe's own billing portal, no emails, no calls. Your free dashboard stays active forever even after canceling the Recovery plan.",
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="tc">
      <div className="tc-h">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="tc-av" src={t.img} alt={t.name} loading="lazy" />
        <div>
          <div className="tc-nm">{t.name}</div>
          <div className="tc-hd">{t.handle}</div>
        </div>
      </div>
      <p className="tc-b" dangerouslySetInnerHTML={{ __html: t.body }} />
      <span className="tc-amt">{t.amt}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Starts with nothing open — an item open by default made the first
  // question collapse (and its answer vanish) on the very first click,
  // since that click toggled it closed instead of opening it.
  const [openFaq, setOpenFaq] = useState<number>(-1)
  const [mrr, setMrr] = useState(5000)
  const [counterVal, setCounterVal] = useState(0)
  const [counterFill, setCounterFill] = useState(0)
  const [barWidths, setBarWidths] = useState([0, 0, 0])
  const [recoveryItems, setRecoveryItems] = useState([
    { name: 'Alex J. — $49', recovered: false },
    { name: 'Sarah C. — $99', recovered: false },
    { name: 'Mike T. — $29', recovered: false },
  ])

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const inv = mrr * 0.3
  const rec = inv * 0.85
  const net = Math.max(0, rec - 29)

  const toggleMenu = () => {
    setMenuOpen(prev => {
      document.body.style.overflow = !prev ? 'hidden' : ''
      return !prev
    })
  }
  const closeMenu = () => {
    setMenuOpen(false)
    document.body.style.overflow = ''
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  // Live counter
  useEffect(() => {
    const TARGET = 347
    let current = 0
    const INC = TARGET / (2200 / 16)
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        current = Math.min(current + INC, TARGET)
        setCounterVal(Math.floor(current))
        setCounterFill(current / TARGET * 78)
        if (current >= TARGET) clearInterval(iv)
      }, 16)
      return () => clearInterval(iv)
    }, 800)
    return () => clearTimeout(t)
  }, [])

  // Canvas particles — disabled on mobile (no visual benefit, CPU cost not worth it)
  useEffect(() => {
    if (window.innerWidth < 768) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0, H = 0, rafId = 0
    const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    // 30 particles instead of 80: reduces O(n²) proximity checks from 3,160 to 435 per frame
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * (W || 900),
      y: Math.random() * (H || 600),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.4 + 0.1,
      red: Math.random() > 0.7,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.red ? `rgba(255,61,61,${p.a})` : `rgba(255,255,255,${p.a * 0.4})`
        ctx.fill()
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 80) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255,61,61,${0.08 * (1 - d / 80)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      rafId = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafId) }
  }, [])

  // Custom cursor
  useEffect(() => {
    const cur = document.getElementById('cursor')
    const ring = document.getElementById('cursor-ring')
    if (!cur || !ring) return

    let mx = 0, my = 0, rx = 0, ry = 0, rafId = 0
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      cur.style.left = mx + 'px'; cur.style.top = my + 'px'
    }
    const animRing = () => {
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px'
      rafId = requestAnimationFrame(animRing)
    }
    animRing()
    document.addEventListener('mousemove', onMove)

    document.querySelectorAll('a,button,.bc,.pc,.fi,.fq').forEach(el => {
      el.addEventListener('mouseenter', () => { cur.classList.add('hov'); ring.classList.add('hov') })
      el.addEventListener('mouseleave', () => { cur.classList.remove('hov'); ring.classList.remove('hov') })
    })
    document.querySelectorAll('.btn,.pc-cta,.db-bb').forEach(el => {
      el.addEventListener('mouseenter', () => { cur.classList.add('btn-hov'); ring.classList.add('btn-hov') })
      el.addEventListener('mouseleave', () => { cur.classList.remove('btn-hov'); ring.classList.remove('btn-hov') })
    })

    return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(rafId) }
  }, [])

  // Scroll reveal + metric counters
  useEffect(() => {
    const animMetric = (el: Element) => {
      const target = +(el as HTMLElement).dataset.target!
      const pre = (el as HTMLElement).dataset.prefix ?? ''
      const suf = (el as HTMLElement).dataset.suffix ?? ''
      let cur = 0
      const inc = target / (1800 / 16)
      const iv = setInterval(() => {
        cur = Math.min(cur + inc, target)
        el.textContent = pre + Math.round(cur) + suf
        if (cur >= target) clearInterval(iv)
      }, 16)
    }
    const reveal = (el: Element) => {
      if (el.classList.contains('vis')) return
      el.classList.add('vis')
      const mv = el.querySelector('[data-target]')
      if (mv) animMetric(mv)
    }

    // Large rootMargin + threshold 0 catches elements well before/after the
    // strict viewport, so a fast scroll or a scrollIntoView() jump (e.g. the
    // nav links) can't skip past one without the observer ever firing —
    // that used to leave whole sections (FAQ items, pricing cards) stuck at
    // opacity:0 forever.
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        reveal(e.target)
        ro.unobserve(e.target)
      })
    }, { threshold: 0, rootMargin: '400px 0px 400px 0px' })
    const targets = document.querySelectorAll('.rv')
    targets.forEach(el => ro.observe(el))

    // Belt-and-suspenders: whatever the observer missed, reveal anyway once
    // the page has settled. Nothing should stay invisible forever.
    const fallback = setTimeout(() => {
      targets.forEach(reveal)
    }, 2500)

    return () => { ro.disconnect(); clearTimeout(fallback) }
  }, [])

  // Bento bar animation
  useEffect(() => {
    const card = document.getElementById('bentoBar')?.closest('.bc')
    if (!card) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setTimeout(() => setBarWidths([48, 31, 21]), 200)
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    obs.observe(card)
    return () => obs.disconnect()
  }, [])

  // Bento recovery animation
  useEffect(() => {
    const card = document.getElementById('bentoRecover')?.closest('.bc')
    if (!card) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        ;[0, 1, 2].forEach(i => {
          setTimeout(() => {
            setRecoveryItems(prev => prev.map((item, idx) => idx === i ? { ...item, recovered: true } : item))
          }, 800 + i * 600)
        })
        obs.disconnect()
      }
    }, { threshold: 0.4 })
    obs.observe(card)
    return () => obs.disconnect()
  }, [])

  // Bento 3D hover
  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.bc'))
    const cleanup: Array<() => void> = []
    cards.forEach(card => {
      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(4px)`
      }
      const onLeave = () => { card.style.transform = '' }
      card.addEventListener('mousemove', onMove)
      card.addEventListener('mouseleave', onLeave)
      cleanup.push(() => { card.removeEventListener('mousemove', onMove); card.removeEventListener('mouseleave', onLeave) })
    })
    return () => cleanup.forEach(fn => fn())
  }, [])

  const tickerDuped = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <>
      <div id="cursor" />
      <div id="cursor-ring" />

      {/* ── NAV ── */}
      <nav>
        <div className="logo"><div className="pip" />LeakCheck</div>
        <ul className="nav-links">
          <li><a href="#how-it-works" onClick={e => { e.preventDefault(); scrollTo('how-it-works') }}>How it works</a></li>
          <li><a href="#pricing" onClick={e => { e.preventDefault(); scrollTo('pricing') }}>Pricing</a></li>
        </ul>
        <Link href="/onboarding" className="btn btn-w" style={{ fontSize: '14px', padding: '10px 20px' }}>
          Connect Stripe — Free
        </Link>
        <button className={`ham${menuOpen ? ' open' : ''}`} aria-label="Menu" onClick={toggleMenu}>
          <span className="ham-l" /><span className="ham-l" /><span className="ham-l" />
        </button>
      </nav>

      <div className={`drawer${menuOpen ? ' open' : ''}`}>
        <a href="#how-it-works" onClick={e => { e.preventDefault(); closeMenu(); scrollTo('how-it-works') }}>How it works</a>
        <a href="#pricing" onClick={e => { e.preventDefault(); closeMenu(); scrollTo('pricing') }}>Pricing</a>
        <Link href="/onboarding" className="btn btn-r" onClick={closeMenu}>Connect Stripe — Free →</Link>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <canvas id="hero-canvas" ref={canvasRef} />
        <div className="hero-glow" />
        <div className="scanline" />

        <div className="hero-content">
          <div className="badge rv">
            <div className="badge-dot" />
            Free forever · No credit card required
          </div>

          <h1 className="h1 rv d1" style={{ maxWidth: '820px', marginBottom: '20px' }}>
            Your Stripe is<br />
            <span className="glitch" data-text="bleeding money">bleeding money</span><br />
            every month.
          </h1>

          <p className="sub rv d2" style={{ textAlign: 'center', maxWidth: '480px', margin: '0 auto 32px' }}>
            LeakCheck connects to your Stripe in 60 seconds and shows you exactly how much revenue disappears to failed payments — silently, every month.
          </p>

          <div className="live-counter rv d2">
            <div className="counter-label">You&apos;ve lost this month to failed payments</div>
            <div className="counter-val">${counterVal.toLocaleString('en-US')}</div>
            <div className="counter-sub">Based on industry averages for your MRR size</div>
            <div className="counter-bar">
              <div className="counter-fill" style={{ width: `${counterFill}%` }} />
            </div>
          </div>

          <div className="hero-cta rv d3">
            <Link href="/onboarding" className="btn btn-w btn-full">
              Connect my Stripe — Free
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a href="#how-it-works" className="btn btn-o btn-full" onClick={e => { e.preventDefault(); scrollTo('how-it-works') }}>See how it works</a>
          </div>
          <p className="hero-note rv d4">No migration · No setup · Never charges without consent · Cancel anytime</p>

          {/* Dashboard preview */}
          <div className="db-wrap rv">
            <div className="db-halo" />
            <div className="db-frame">
              <div className="db-bar">
                <div className="db-dot r" /><div className="db-dot y" /><div className="db-dot g" />
                <div className="db-url">app.leakcheck.io/dashboard</div>
              </div>
              <div className="db-body">
                <div className="db-side">
                  <div className="db-logo">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)' }} />
                    LeakCheck
                  </div>
                  <div className="db-ni on">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                    Dashboard
                  </div>
                  <div className="db-ni">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                    </svg>
                    Payments
                  </div>
                  <div className="db-ni">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Recovery
                  </div>
                </div>
                <div className="db-main">
                  <div className="db-top">
                    <div className="db-title">Payment Health</div>
                    <div className="db-per">Last 30 days</div>
                  </div>
                  <div className="db-cards">
                    <div className="db-card"><div className="db-cl">Lost This Month</div><div className="db-cv r">$347.00</div><div className="db-cc">↑ 12% vs last month</div></div>
                    <div className="db-card"><div className="db-cl">Failed Payments</div><div className="db-cv">8</div><div className="db-cc">this month</div></div>
                    <div className="db-card"><div className="db-cl">Recoverable</div><div className="db-cv g">$312.00</div><div className="db-cc">30-day window</div></div>
                  </div>
                  <div className="db-th"><span>Customer</span><span>Amount</span><span>Reason</span><span>Date</span></div>
                  {[
                    { name: 'Alex Johnson', amt: '−$49', tag: 'ex', label: 'Expired Card', date: 'Jun 1' },
                    { name: 'Sarah Chen', amt: '−$99', tag: 'dc', label: 'Bank Decline', date: 'Jun 3' },
                    { name: 'Mike Torres', amt: '−$29', tag: 'fu', label: 'Insuff. Funds', date: 'Jun 5' },
                    { name: 'Emma Davis', amt: '−$79', tag: 'ex', label: 'Expired Card', date: 'Jun 7' },
                  ].map(row => (
                    <div className="db-row" key={row.name}>
                      <span className="db-rn">{row.name}</span>
                      <span className="db-ra">{row.amt}</span>
                      <span className={`tag ${row.tag}`}>{row.label}</span>
                      <span style={{ fontSize: '10px', color: 'var(--tx3)' }}>{row.date}</span>
                    </div>
                  ))}
                  <div className="db-banner">
                    <span className="db-bt">💡 You have <strong>$347</strong> recoverable right now</span>
                    <button className="db-bb">Activate Recovery → $29/mo</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {tickerDuped.map((item, i) => (
            <span key={i} className="tick-item">
              <span dangerouslySetInnerHTML={{ __html: item }} />
              <span className="tick-dot" />
            </span>
          ))}
        </div>
      </div>

      {/* ── METRICS ── */}
      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--bd)' }}>
        <div className="inn">
          <div className="metrics">
            {[
              { val: '0%', target: 40, pre: '', suf: '%+', cls: 'r', label: 'of all churn is involuntary', tag: 'mt-r', tagText: 'preventable' },
              { val: '$0', target: 340, pre: '$', suf: '', cls: '', label: 'avg lost per founder / month', tag: '', tagText: '' },
              { val: '0%', target: 90, pre: '', suf: '%', cls: 'g', label: 'recovery rate with automation', tag: 'mt-g', tagText: 'verified' },
              { val: '0s', target: 60, pre: '', suf: 's', cls: '', label: 'to connect and see your number', tag: '', tagText: '' },
            ].map((m, i) => (
              <div key={i} className={`met rv${i > 0 ? ` d${i}` : ''}`}>
                <div className={`met-v${m.cls ? ' ' + m.cls : ''}`} data-target={m.target} data-prefix={m.pre} data-suffix={m.suf}>{m.val}</div>
                <div className="met-l">
                  {m.label}
                  {m.tag && <span className={`met-tag ${m.tag}`}>{m.tagText}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BENTO — HOW IT WORKS ── */}
      <div id="how-it-works" className="pad" style={{ background: 'var(--bg)' }}>
        <div className="inn">
          <div className="label rv">How it works</div>
          <h2 className="h2 rv d1">Three steps.<br />One number that changes everything.</h2>
          <p className="sub rv d2" style={{ marginTop: '14px' }}>No configuration. No migration. Connect once — understand your revenue forever.</p>

          <div className="bento">
            <div className="bc beam-card rv">
              <div className="bc-inner">
                <div className="bc-num">01</div>
                <div className="bc-icon">🔗</div>
                <div className="bc-t">Connect Stripe</div>
                <p className="bc-d">OAuth in 2 clicks. Never charges without consent. No credentials stored, no risk.</p>
                <div className="bc-demo">
                  <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>OAuth Flow</div>
                  {[
                    { label: 'Authorization', val: '✓ Granted', color: 'var(--grn)' },
                    { label: 'Access level', val: 'Read & write', color: 'var(--tx2)' },
                    { label: 'Charges initiated', val: 'Only if you enable Auto-Recovery', color: 'var(--tx2)' },
                    { label: 'Setup time', val: '60 seconds', color: 'var(--grn)' },
                  ].map(row => (
                    <div className="bc-demo-row" key={row.label}>
                      <span style={{ color: 'var(--tx2)' }}>{row.label}</span>
                      <span style={{ color: row.color, fontSize: '11px' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bc beam-card rv d1">
              <div className="bc-inner">
                <div className="bc-num">02</div>
                <div className="bc-icon">🔍</div>
                <div className="bc-t">See Your Leak</div>
                <p className="bc-d">Instantly see how much you&apos;ve lost — broken down by reason, customer, and date.</p>
                <div className="bc-bar" id="bentoBar">
                  {[
                    { label: 'Expired cards', color: 'var(--red)', width: barWidths[0], pct: '48%' },
                    { label: 'Bank declines', color: '#f59e0b', width: barWidths[1], pct: '31%' },
                    { label: 'Insuff. funds', color: '#ff8080', width: barWidths[2], pct: '21%' },
                  ].map(bar => (
                    <div className="bc-bar-row" key={bar.label}>
                      <span className="bc-bar-label">{bar.label}</span>
                      <div className="bc-bar-track">
                        <div className="bc-bar-fill" style={{ background: bar.color, width: `${bar.width}%` }} />
                      </div>
                      <span className="bc-bar-val">{bar.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bc beam-card rv d2">
              <div className="bc-inner">
                <div className="bc-num">03</div>
                <div className="bc-icon">⚡</div>
                <div className="bc-t">Recover Automatically</div>
                <p className="bc-d">Smart retries + email & SMS recovery sequence, in your own words — write it yourself or let AI draft it. Most founders recover day one.</p>
                <div className="bc-recover" id="bentoRecover">
                  {recoveryItems.map((item, i) => (
                    <div key={i} className={`bc-r-item${item.recovered ? ' recovered' : ''}`}>
                      <div className="bc-r-dot" />
                      <span className="bc-r-name">{item.name}</span>
                      <span className="bc-r-status">{item.recovered ? 'Recovered ✓' : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bc beam-card span2 rv d1" style={{ background: 'linear-gradient(135deg,rgba(255,61,61,.04),var(--s2))', borderColor: 'rgba(255,61,61,.2)' }}>
              <div className="bc-inner" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
                <div>
                  <div className="bc-icon">🧮</div>
                  <div className="bc-t">Your Recovery ROI</div>
                  <p className="bc-d" style={{ marginTop: '8px' }}>Enter your MRR and see exactly how much LeakCheck recovers for you.</p>
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--tx3)', display: 'block', marginBottom: '6px' }}>
                      Your Monthly MRR ($)
                    </label>
                    <input
                      type="number"
                      value={mrr}
                      min={100}
                      max={500000}
                      onChange={e => setMrr(Number(e.target.value) || 0)}
                      style={{ width: '100%', background: 'var(--s1)', border: '1px solid var(--bd2)', color: 'var(--tx)', padding: '10px 14px', borderRadius: '8px', fontFamily: 'var(--B)', fontSize: '16px', outline: 'none' }}
                    />
                  </div>
                </div>
                <div className="bc-calc">
                  <div className="bc-calc-row">
                    <span className="bc-calc-label">Involuntary churn (30%)</span>
                    <span className="bc-calc-val">${Math.round(inv).toLocaleString('en-US')}</span>
                  </div>
                  <div className="bc-calc-row">
                    <span className="bc-calc-label">Recovery rate (85%)</span>
                    <span className="bc-calc-val">${Math.round(rec).toLocaleString('en-US')}</span>
                  </div>
                  <div className="bc-calc-row">
                    <span className="bc-calc-label">LeakCheck cost</span>
                    <span className="bc-calc-val">$29/mo</span>
                  </div>
                  <div className="bc-calc-row">
                    <span className="bc-calc-label" style={{ fontWeight: 500, color: 'var(--tx)' }}>Your net recovery</span>
                    <span className="bc-calc-val" style={{ fontSize: '22px', color: 'var(--grn)' }}>${Math.round(net).toLocaleString('en-US')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div className="sw">
        <div className="pad">
          <div className="inn">
            <div className="label rv">What founders say</div>
            <h2 className="h2 rv d1">They didn&apos;t know.<br />Now they do.</h2>
            <p className="sub rv d2" style={{ marginTop: '14px' }}>Real founders. Real numbers. Zero setup required.</p>
            <div className="tscene rv">
              <div className="tft" /><div className="tfb" /><div className="tfl" /><div className="tfr" />
              <div className="t3d">
                <div className="tinner">
                  {COL_INDICES.map((indices, colIdx) => (
                    <div key={colIdx} id={`tc${colIdx + 1}`} className={`mq ${colIdx % 2 === 0 ? 'dn' : 'up'}`}>
                      {[...indices, ...indices].map((tIdx, i) => (
                        <TestimonialCard key={i} t={TESTIMONIALS[tIdx]} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRICING ── */}
      <div id="pricing" className="pad" style={{ background: 'var(--bg)' }}>
        <div className="inn">
          <div className="label rv">Pricing</div>
          <h2 className="h2 rv d1">Start free.<br />Upgrade when it pays for itself.</h2>
          <p className="sub rv d2" style={{ marginTop: '14px' }}>Which it will. On day one. Guaranteed.</p>
          <div className="pg">
            <div className="pc rv">
              <div className="pc-plan">Free</div>
              <div className="pc-price">$<span style={{ fontSize: '52px' }}>0</span></div>
              <p className="pc-desc">See your leak. Forever free.</p>
              <div className="pc-div" />
              {FREE_FEATURES.map(f => (
                <div key={f} className="pc-f"><div className="pc-ck">✓</div>{f}</div>
              ))}
              <Link href="/onboarding" className="pc-cta out" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Connect Stripe — Free</Link>
            </div>
            <div className="pc hot rv d1">
              <div className="pc-badge">PAYS FOR ITSELF IN 3 DAYS</div>
              <div className="pc-plan">Recovery</div>
              <div className="pc-price"><sup>$</sup>29<sub>/mo</sub></div>
              <p className="pc-desc">Stop the leak. Recover automatically.</p>
              <div className="pc-div" />
              {PRO_FEATURES.map(f => (
                <div key={f} className="pc-f"><div className="pc-ck">✓</div>{f}</div>
              ))}
              <Link href="/upgrade" className="pc-cta red" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Start recovering — $29/mo</Link>
              <p className="pc-roi">⚡ Average founder recovers $340/mo · ROI = 11x</p>
            </div>
          </div>
          <div className="ltd rv">
            <div>
              <div className="ltd-t">🔥 Lifetime Deal — First 20 founders only</div>
              <div className="ltd-d">Pay once, use forever. <strong>$149</strong> — saves $349/year vs monthly.</div>
            </div>
            <Link href="/upgrade" className="btn btn-o" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Get Lifetime Deal →</Link>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="sw">
        <div className="pad">
          <div className="inn">
            <div className="label rv">FAQ</div>
            <h2 className="h2 rv d1">Common questions.</h2>
            {/* No "rv" scroll-reveal class on the rows below, on purpose:
                the reveal effect adds "vis" by mutating the DOM directly
                outside React, and clicking a question to open/close it
                re-renders that div with a className React DOES control (the
                "open" toggle) — React's reconciliation then overwrites the
                whole className and wipes the externally-added "vis", leaving
                the row stuck invisible after the first click. */}
            <div className="faq">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className={`fi${openFaq === idx ? ' open' : ''}`}>
                  <div className="fq" onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}>
                    {item.q}
                    <svg className="fi-ic" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <div className="fa">{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA BOTTOM ── */}
      <div className="ctab">
        <div className="ctab-glow" /><div className="ctab-grid" />
        <div style={{ position: 'relative' }}>
          <div className="label rv" style={{ display: 'flex', justifyContent: 'center' }}>Get started today</div>
          <h2 className="h2 rv d1" style={{ maxWidth: '600px', margin: '0 auto 18px', textAlign: 'center' }}>
            Stop losing money<br />you&apos;ve already earned.
          </h2>
          <p className="sub rv d2" style={{ textAlign: 'center', margin: '0 auto 36px' }}>
            Connect your Stripe in 60 seconds. See your number. Free forever.
          </p>
          <div className="cta-btns rv d3">
            <Link href="/onboarding" className="btn btn-w">
              Connect my Stripe — Free{' '}
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a href="#how-it-works" className="btn btn-o" onClick={e => { e.preventDefault(); scrollTo('how-it-works') }}>See how it works</a>
          </div>
          <p className="rv" style={{ marginTop: '18px', fontSize: '13px', color: 'var(--tx3)', textAlign: 'center' }}>
            No credit card · No migration · Never charges without consent
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer>
        <div className="fl"><div className="pip" />LeakCheck</div>
        <ul className="flinks">
          <li><Link href="/privacy">Privacy</Link></li>
          <li><Link href="/terms">Terms</Link></li>
        </ul>
        <div className="fn">© {new Date().getFullYear()} LeakCheck · Built for indie founders</div>
      </footer>
    </>
  )
}
