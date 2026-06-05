'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Types & Data ──────────────────────────────────────────────────────────────

interface Payment {
  id: number
  name: string
  email: string
  initials: string
  color: string
  amount: number
  reason: 'ex' | 'dc' | 'fu' | 'fr'
  reasonLabel: string
  date: string
  recovered: boolean
}

const PAYMENTS: Payment[] = [
  { id: 1, name: 'Alex Johnson', email: 'alex@example.com', initials: 'AJ', color: '#ff6b6b', amount: 49, reason: 'ex', reasonLabel: 'Expired Card', date: 'Jun 1', recovered: false },
  { id: 2, name: 'Sarah Chen', email: 'sarah@example.com', initials: 'SC', color: '#6b9bff', amount: 99, reason: 'dc', reasonLabel: 'Bank Decline', date: 'Jun 3', recovered: false },
  { id: 3, name: 'Mike Torres', email: 'mike@example.com', initials: 'MT', color: '#ffd93d', amount: 29, reason: 'fu', reasonLabel: 'Insuff. Funds', date: 'Jun 5', recovered: false },
  { id: 4, name: 'Emma Davis', email: 'emma@example.com', initials: 'ED', color: '#a29bfe', amount: 79, reason: 'ex', reasonLabel: 'Expired Card', date: 'Jun 7', recovered: false },
  { id: 5, name: 'James Wilson', email: 'james@example.com', initials: 'JW', color: '#fd79a8', amount: 49, reason: 'fr', reasonLabel: 'Fraud Block', date: 'Jun 9', recovered: false },
  { id: 6, name: 'Lisa Park', email: 'lisa@example.com', initials: 'LP', color: '#55efc4', amount: 19, reason: 'dc', reasonLabel: 'Bank Decline', date: 'Jun 11', recovered: false },
  { id: 7, name: 'Tom Harris', email: 'tom@example.com', initials: 'TH', color: '#fdcb6e', amount: 99, reason: 'ex', reasonLabel: 'Expired Card', date: 'Jun 13', recovered: false },
  { id: 8, name: 'Ana Silva', email: 'ana@example.com', initials: 'AS', color: '#e17055', amount: 14, reason: 'fu', reasonLabel: 'Insuff. Funds', date: 'Jun 15', recovered: false },
]

// 30 days of lost amounts — matches Jun 1–30
const LOST_DATA = [0, 12, 0, 0, 49, 0, 29, 0, 79, 0, 0, 99, 0, 49, 0, 19, 0, 0, 0, 99, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0]
const CHART_LABEL_INDICES = [0, 4, 9, 14, 19, 24, 29]

// ── Sidebar nav definition ────────────────────────────────────────────────────

type NavKey = 'dashboard' | 'payments' | 'revenue' | 'auto-recovery' | 'email' | 'alerts' | 'settings'

const NAV_MAIN: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard', label: 'Dashboard',
    icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
  },
  {
    key: 'payments', label: 'Payments',
    icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  },
  {
    key: 'revenue', label: 'Revenue',
    icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  },
]

const NAV_RECOVERY: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'auto-recovery', label: 'Auto-Recovery',
    icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    key: 'email', label: 'Email Sequences',
    icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  },
  {
    key: 'alerts', label: 'Alerts',
    icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard')
  const [v1, setV1] = useState(0)
  const [v2, setV2] = useState(0)
  const [v3, setV3] = useState(0)

  const chartRef = useRef<HTMLCanvasElement>(null)

  const filteredPayments = PAYMENTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  // Lock body scroll for dashboard full-viewport layout
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Animated stat counters
  useEffect(() => {
    const animCount = (target: number, setter: (v: number) => void) => {
      let cur = 0
      const inc = target / (1600 / 16)
      const iv = setInterval(() => {
        cur = Math.min(cur + inc, target)
        setter(Math.round(cur))
        if (cur >= target) clearInterval(iv)
      }, 16)
    }
    const t = setTimeout(() => {
      animCount(347, setV1)
      animCount(8, setV2)
      animCount(312, setV3)
    }, 400)
    return () => clearTimeout(t)
  }, [])

  // Chart canvas
  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    const DPR = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width = canvas.offsetWidth * DPR
      canvas.height = canvas.offsetHeight * DPR
      ctx.scale(DPR, DPR)
    }
    resize()

    const MAX = Math.max(...LOST_DATA) * 1.3 || 100
    const pad = { l: 8, r: 8, t: 8, b: 24 }

    const drawFrame = (progress: number) => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)
      const gW = W - pad.l - pad.r
      const gH = H - pad.t - pad.b
      const bW = gW / LOST_DATA.length

      // Grid lines
      ;[0.25, 0.5, 0.75, 1].forEach(f => {
        const y = pad.t + gH * (1 - f)
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(255,255,255,.05)'
        ctx.lineWidth = 1
        ctx.moveTo(pad.l, y)
        ctx.lineTo(W - pad.r, y)
        ctx.stroke()
      })

      // Bars
      LOST_DATA.forEach((v, i) => {
        if (!v) return
        const x = pad.l + i * bW
        const bH = (v / MAX) * gH * progress
        const y = pad.t + gH - bH
        const gr = ctx.createLinearGradient(0, y, 0, y + bH)
        gr.addColorStop(0, 'rgba(255,61,61,.9)')
        gr.addColorStop(1, 'rgba(255,61,61,.2)')
        ctx.fillStyle = gr
        ctx.beginPath()
        ctx.roundRect(x + bW * 0.15, y, bW * 0.7, bH, 3)
        ctx.fill()
      })

      // Labels
      ctx.fillStyle = 'rgba(255,255,255,.3)'
      ctx.font = '10px DM Sans'
      ctx.textAlign = 'center'
      CHART_LABEL_INDICES.forEach(i => {
        ctx.fillText(`Jun ${i + 1}`, pad.l + i * bW + bW / 2, H - 6)
      })
    }

    const onResize = () => { resize(); drawFrame(1) }
    window.addEventListener('resize', onResize)

    let progress = 0
    const animBar = () => {
      progress = Math.min(progress + 0.04, 1)
      drawFrame(progress)
      if (progress < 1) rafId = requestAnimationFrame(animBar)
    }
    const t = setTimeout(() => { rafId = requestAnimationFrame(animBar) }, 600)

    return () => {
      clearTimeout(t)
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const closeDrawer = () => setMobileMenuOpen(false)

  // ── Sidebar shared between desktop and mobile drawer ──
  const SidebarNav = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="sb-section">Main</div>
      {NAV_MAIN.map(item => (
        <div
          key={item.key}
          className={`sb-nav${activeNav === item.key ? ' on' : ''}`}
          onClick={() => { setActiveNav(item.key); onClose?.() }}
        >
          {item.icon}
          {item.label}
        </div>
      ))}

      <div className="sb-section" style={{ marginTop: '8px' }}>Recovery</div>
      {NAV_RECOVERY.map(item => (
        <div
          key={item.key}
          className={`sb-nav${activeNav === item.key ? ' on' : ''}`}
          onClick={() => { setActiveNav(item.key); onClose?.() }}
        >
          {item.icon}
          {item.label}
          <span className="sb-badge">Pro</span>
        </div>
      ))}

      <div className="sb-section" style={{ marginTop: '8px' }}>Account</div>
      <div
        className={`sb-nav${activeNav === 'settings' ? ' on' : ''}`}
        onClick={() => { setActiveNav('settings'); onClose?.() }}
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        Settings
      </div>
    </>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── MOBILE TOPBAR ── */}
      <div className="mob-top">
        <div style={{ fontFamily: 'var(--D)', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="pip" />LeakCheck
        </div>
        <button
          className={`ham${mobileMenuOpen ? ' open' : ''}`}
          aria-label="Menu"
          onClick={() => setMobileMenuOpen(prev => !prev)}
        >
          <span className="ham-l" /><span className="ham-l" /><span className="ham-l" />
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      <div className={`mob-drawer${mobileMenuOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--D)', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pip" />LeakCheck
          </div>
          <button onClick={closeDrawer} style={{ background: 'none', border: 'none', color: 'var(--tx2)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <SidebarNav onClose={closeDrawer} />
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--bd)' }}>
          <div style={{ fontSize: '12px', color: 'var(--tx3)', marginBottom: '8px' }}>Connected account</div>
          <div className="sb-stripe">
            <div className="sb-stripe-dot" />
            <span>acme-startup · Stripe</span>
          </div>
        </div>
      </div>

      {/* ── APP ── */}
      <div className="app">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sb-logo"><div className="pip" />LeakCheck</div>
          <SidebarNav />
          <div className="sb-stripe" style={{ margin: '8px' }}>
            <div className="sb-stripe-dot" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--tx)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>acme-startup</div>
              <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>Stripe · Connected</div>
            </div>
          </div>
          <div className="sb-bottom">
            <div className="sb-user">
              <div className="sb-avatar">JD</div>
              <div style={{ minWidth: 0 }}>
                <div className="sb-uname">John Doe</div>
                <div className="sb-uemail">john@acme.io</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <div className="tb-left">
              <div>
                <div className="tb-title">Payment Health</div>
                <div className="tb-sub">Last updated 2 minutes ago</div>
              </div>
            </div>
            <div className="tb-right">
              <div className="tb-period">
                {(['7d', '30d', '90d'] as const).map(p => (
                  <div
                    key={p}
                    className={`tb-p${period === p ? ' on' : ''}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </div>
                ))}
              </div>
              <Link href="/upgrade">
                <button className="tb-btn out">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                  </svg>
                  Settings
                </button>
              </Link>
              <Link href="/upgrade">
                <button className="tb-btn red">⚡ Activate Recovery</button>
              </Link>
            </div>
          </div>

          {/* CONTENT */}
          <div className="content">

            {/* Upgrade banner */}
            <div className="upgrade-banner">
              <div className="ub-left">
                <div className="ub-pip" />
                <div>
                  <div className="ub-title">
                    💡 You have <strong style={{ color: 'var(--red)' }}>$347</strong> recoverable right now
                  </div>
                  <div className="ub-sub">Upgrade to Recovery plan to automatically retry failed payments and send recovery emails.</div>
                </div>
              </div>
              <Link href="/upgrade">
                <button className="ub-btn">Activate Recovery — $29/mo →</button>
              </Link>
            </div>

            {/* Stat cards */}
            <div className="stat-grid">
              <div className="sc" style={{ animationDelay: '.05s' }}>
                <div className="sc-label">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Lost This Month
                </div>
                <div className="sc-val r">${v1.toLocaleString()}</div>
                <div className="sc-change"><span className="sc-up">↑ 12%</span> vs last month</div>
              </div>

              <div className="sc" style={{ animationDelay: '.1s' }}>
                <div className="sc-label">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                  </svg>
                  Failed Payments
                </div>
                <div className="sc-val">{v2}</div>
                <div className="sc-change">payments this month</div>
              </div>

              <div className="sc" style={{ animationDelay: '.15s' }}>
                <div className="sc-label">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Recovery Rate
                  <span className="sc-lock">🔒 Pro</span>
                </div>
                <div className="sc-val dim">—</div>
                <div className="sc-change">Upgrade to track</div>
              </div>

              <div className="sc" style={{ animationDelay: '.2s' }}>
                <div className="sc-label">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                  </svg>
                  Recoverable
                </div>
                <div className="sc-val g">${v3.toLocaleString()}</div>
                <div className="sc-change">within 30-day window</div>
              </div>
            </div>

            {/* Chart */}
            <div className="chart-card">
              <div className="chart-head">
                <div className="chart-title">Failed Payments — Last 30 Days</div>
                <div className="chart-legend">
                  <div className="cl-item"><div className="cl-dot" style={{ background: 'var(--red)' }} />Lost</div>
                  <div className="cl-item"><div className="cl-dot" style={{ background: 'var(--grn)' }} />Recovered (Pro)</div>
                </div>
              </div>
              <div className="chart-body">
                <canvas id="chart" ref={chartRef} />
              </div>
            </div>

            {/* Table */}
            <div className="table-card">
              <div className="table-head">
                <div className="table-title">
                  Failed Payments
                  <span className="tcount">{filteredPayments.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="table-search">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <button className="tb-btn out" style={{ fontSize: '11px', padding: '6px 10px' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export
                  </button>
                </div>
              </div>

              <div className="th">
                <span>Customer</span>
                <span>Amount</span>
                <span>Reason</span>
                <span>Date</span>
                <span style={{ textAlign: 'right' }}>Action</span>
              </div>

              {filteredPayments.length === 0 ? (
                <div className="empty">
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <p>No payments found</p>
                </div>
              ) : (
                filteredPayments.map((p, i) => (
                  <div className="tr" key={p.id} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="tr-customer">
                      <div
                        className="tr-av"
                        style={{ background: `${p.color}22`, color: p.color }}
                      >
                        {p.initials}
                      </div>
                      <div>
                        <div className="tr-name">{p.name}</div>
                        <div className="tr-email">{p.email}</div>
                      </div>
                    </div>
                    <div className="tr-amount">−${p.amount}.00</div>
                    <div><span className={`tag ${p.reason}`}>{p.reasonLabel}</span></div>
                    <div className="tr-date">{p.date}</div>
                    <div className="tr-action">
                      {p.recovered ? (
                        <span className="recover-btn done">✓ Recovered</span>
                      ) : (
                        <Link href="/upgrade">
                          <button className="recover-btn locked" title="Upgrade to recover">
                            🔒 Recover
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>{/* /content */}
        </div>{/* /main */}
      </div>{/* /app */}
    </div>
  )
}
