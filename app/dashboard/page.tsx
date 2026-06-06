'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbPayment {
  id: string
  stripe_invoice_id: string
  customer_name: string | null
  customer_email: string | null
  amount: number
  currency: string
  failure_reason: string
  status: 'open' | 'recovered' | 'lost'
  created_at: string
}

type NavKey = 'dashboard' | 'payments' | 'revenue' | 'auto-recovery' | 'email' | 'alerts' | 'settings'

// ── Nav definitions ───────────────────────────────────────────────────────────

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

const PRO_FEATURE_LABELS: Record<string, string> = {
  'auto-recovery': 'Auto-Recovery',
  'email': 'Email Sequences',
  'alerts': 'Alerts',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#ff6b6b', '#6b9bff', '#ffd93d', '#a29bfe', '#fd79a8', '#55efc4', '#fdcb6e', '#e17055']

function avatarColor(s: string) {
  let h = 0
  for (const c of s) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getInitials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (email?.[0] ?? '?').toUpperCase()
}

function reasonTag(r: string) {
  if (r === 'Expired Card') return 'ex'
  if (r === 'Bank Decline') return 'dc'
  if (r === 'Insufficient Funds') return 'fu'
  return 'fr'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtAgo(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just synced'
  if (mins === 1) return 'Last synced 1 min ago'
  return `Last synced ${mins} mins ago`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard')

  // Data state
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<'idle' | 'ok' | 'err'>('idle')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [hasConnection, setHasConnection] = useState<boolean | null>(null)
  const [allPayments, setAllPayments] = useState<DbPayment[]>([])
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [isPro, setIsPro] = useState(false)

  // Animated counter values
  const [v1, setV1] = useState(0)
  const [v2, setV2] = useState(0)
  const [v3, setV3] = useState(0)

  const chartRef = useRef<HTMLCanvasElement>(null)
  const syncResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) setUserEmail(user.email)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro, plan_type')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.is_pro) setIsPro(true)
    }

    const { data: connection } = await supabase
      .from('stripe_connections')
      .select('stripe_account_id')
      .maybeSingle()

    setHasConnection(!!connection)
    if (connection) setStripeAccountId(connection.stripe_account_id as string)

    if (!connection) {
      setLoading(false)
      return
    }

    const { data: payments } = await supabase
      .from('failed_payments')
      .select('*')
      .order('created_at', { ascending: false })

    setAllPayments((payments ?? []) as DbPayment[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Lock body scroll for full-viewport layout
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Cleanup sync result timer on unmount
  useEffect(() => {
    return () => { if (syncResultTimer.current) clearTimeout(syncResultTimer.current) }
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90

  const periodPayments = useMemo(() => {
    const since = Date.now() - periodDays * 86400000
    return allPayments.filter(p => new Date(p.created_at).getTime() >= since)
  }, [allPayments, periodDays])

  const totalLostCents = useMemo(
    () => periodPayments.filter(p => p.status === 'open').reduce((s, p) => s + p.amount, 0),
    [periodPayments]
  )
  const totalLost = Math.round(totalLostCents / 100)
  const recoverable = totalLost
  const failCount = periodPayments.length

  const filteredPayments = useMemo(
    () => periodPayments.filter(p =>
      (p.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.customer_email ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [periodPayments, search]
  )

  const recoveredCount = useMemo(
    () => periodPayments.filter(p => p.status === 'recovered').length,
    [periodPayments]
  )
  const recoveryRate = failCount > 0 ? Math.round((recoveredCount / failCount) * 100) : 0

  const chartData = useMemo(() => {
    const n = periodDays
    const buckets = Array<number>(n).fill(0)
    const now = Date.now()
    periodPayments
      .filter(p => p.status === 'open')
      .forEach(p => {
        const daysAgo = Math.floor((now - new Date(p.created_at).getTime()) / 86400000)
        const idx = n - 1 - daysAgo
        if (idx >= 0 && idx < n) buckets[idx] += p.amount / 100
      })
    return buckets
  }, [periodPayments, periodDays])

  const chartLabels = useMemo(() => {
    const n = periodDays
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.now() - (n - 1 - i) * 86400000)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }, [periodDays])

  const chartLabelIndices = useMemo(() => {
    const n = periodDays
    if (n <= 7) return Array.from({ length: n }, (_, i) => i)
    const step = Math.floor((n - 1) / 5)
    return [0, step, step * 2, step * 3, step * 4, n - 1]
  }, [periodDays])

  // ── Counter animation — re-fires when data or period changes ──────────────

  useEffect(() => {
    if (loading) return
    const ivals: ReturnType<typeof setInterval>[] = []
    const animCount = (target: number, setter: (v: number) => void) => {
      setter(0)
      if (target === 0) return
      let cur = 0
      const inc = Math.max(target / (1600 / 16), 0.1)
      const iv = setInterval(() => {
        cur = Math.min(cur + inc, target)
        setter(Math.round(cur))
        if (cur >= target) clearInterval(iv)
      }, 16)
      ivals.push(iv)
    }
    const t = setTimeout(() => {
      animCount(totalLost, setV1)
      animCount(failCount, setV2)
      animCount(recoverable, setV3)
    }, 300)
    return () => {
      clearTimeout(t)
      ivals.forEach(clearInterval)
    }
  }, [loading, totalLost, failCount, recoverable])

  // ── Chart canvas — re-draws when data or period changes ───────────────────

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

    const MAX = Math.max(...chartData, 1) * 1.3
    const pad = { l: 8, r: 8, t: 8, b: 24 }
    const n = chartData.length

    const drawFrame = (progress: number) => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)
      const gW = W - pad.l - pad.r
      const gH = H - pad.t - pad.b
      const bW = gW / n

      ;[0.25, 0.5, 0.75, 1].forEach(f => {
        const y = pad.t + gH * (1 - f)
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(255,255,255,.05)'
        ctx.lineWidth = 1
        ctx.moveTo(pad.l, y)
        ctx.lineTo(W - pad.r, y)
        ctx.stroke()
      })

      chartData.forEach((v, i) => {
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

      ctx.fillStyle = 'rgba(255,255,255,.3)'
      ctx.font = '10px DM Sans'
      ctx.textAlign = 'center'
      chartLabelIndices.forEach(i => {
        if (chartLabels[i]) ctx.fillText(chartLabels[i], pad.l + i * bW + bW / 2, H - 6)
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
    const t = setTimeout(() => { rafId = requestAnimationFrame(animBar) }, 400)

    return () => {
      clearTimeout(t)
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [chartData, chartLabels, chartLabelIndices])

  // ── Sync ──────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    if (syncResultTimer.current) clearTimeout(syncResultTimer.current)
    setSyncing(true)
    setSyncResult('idle')
    try {
      const res = await fetch('/api/stripe/sync', { method: 'POST' })
      if (res.ok) {
        setLastSynced(new Date())
        setSyncResult('ok')
        await fetchData()
      } else {
        setSyncResult('err')
      }
    } catch {
      setSyncResult('err')
    } finally {
      setSyncing(false)
      syncResultTimer.current = setTimeout(() => setSyncResult('idle'), 3000)
    }
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const subText = loading
    ? 'Loading...'
    : lastSynced
    ? fmtAgo(lastSynced)
    : hasConnection
    ? 'Click Sync to fetch latest data'
    : 'Connect Stripe to get started'

  const userInitials = userEmail ? userEmail[0].toUpperCase() : '?'
  const accountLabel = stripeAccountId ?? 'Not connected'

  const closeDrawer = () => setMobileMenuOpen(false)

  // ── Sidebar (shared between desktop + mobile drawer) ──────────────────────

  const SidebarNav = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="sb-section">Main</div>
      {NAV_MAIN.map(item => (
        <div
          key={item.key}
          className={`sb-nav${activeNav === item.key ? ' on' : ''}`}
          onClick={() => { setActiveNav(item.key); onClose?.() }}
        >
          {item.icon}{item.label}
        </div>
      ))}
      <div className="sb-section" style={{ marginTop: '8px' }}>Recovery</div>
      {NAV_RECOVERY.map(item => (
        <div
          key={item.key}
          className={`sb-nav${activeNav === item.key ? ' on' : ''}`}
          onClick={() => { setActiveNav(item.key); onClose?.() }}
        >
          {item.icon}{item.label}
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

  // ── Reusable content blocks ────────────────────────────────────────────────

  const StatCards = () => (
    <div className="stat-grid">
      <div className="sc" style={{ animationDelay: '.05s' }}>
        <div className="sc-label">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Lost This Period
        </div>
        <div className="sc-val r">${v1.toLocaleString()}</div>
        <div className="sc-change">in the last {periodDays} days</div>
      </div>

      <div className="sc" style={{ animationDelay: '.1s' }}>
        <div className="sc-label">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
          </svg>
          Failed Payments
        </div>
        <div className="sc-val">{v2}</div>
        <div className="sc-change">payments this period</div>
      </div>

      <div className="sc" style={{ animationDelay: '.15s' }}>
        <div className="sc-label">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Recovery Rate
          {!isPro && <span className="sc-lock">🔒 Pro</span>}
        </div>
        <div className={`sc-val${isPro ? ' g' : ' dim'}`}>{isPro ? `${recoveryRate}%` : '—'}</div>
        <div className="sc-change">{isPro ? 'recovered this period' : 'Upgrade to track'}</div>
      </div>

      <div className="sc" style={{ animationDelay: '.2s' }}>
        <div className="sc-label">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
          </svg>
          Recoverable
        </div>
        <div className="sc-val g">${v3.toLocaleString()}</div>
        <div className="sc-change">within recovery window</div>
      </div>
    </div>
  )

  const ChartCard = () => (
    <div className="chart-card">
      <div className="chart-head">
        <div className="chart-title">Failed Payments — Last {periodDays} Days</div>
        <div className="chart-legend">
          <div className="cl-item"><div className="cl-dot" style={{ background: 'var(--red)' }} />Lost</div>
          <div className="cl-item"><div className="cl-dot" style={{ background: 'var(--grn)' }} />Recovered (Pro)</div>
        </div>
      </div>
      <div className="chart-body">
        <canvas id="chart" ref={chartRef} />
      </div>
    </div>
  )

  const PaymentsTable = () => (
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
          <p>
            {loading
              ? 'Loading payments...'
              : hasConnection === false
              ? 'Connect Stripe to see your failed payments'
              : 'No failed payments in this period'}
          </p>
        </div>
      ) : (
        filteredPayments.map((p, i) => {
          const displayName = p.customer_name ?? p.customer_email ?? 'Unknown'
          const color = avatarColor(p.stripe_invoice_id)
          const ini = getInitials(p.customer_name, p.customer_email)
          const tag = reasonTag(p.failure_reason)
          return (
            <div className="tr" key={p.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="tr-customer">
                <div className="tr-av" style={{ background: `${color}22`, color }}>
                  {ini}
                </div>
                <div>
                  <div className="tr-name">{displayName}</div>
                  <div className="tr-email">{p.customer_email ?? ''}</div>
                </div>
              </div>
              <div className="tr-amount">−${(p.amount / 100).toFixed(2)}</div>
              <div><span className={`tag ${tag}`}>{p.failure_reason}</span></div>
              <div className="tr-date">{fmtDate(p.created_at)}</div>
              <div className="tr-action">
                {p.status === 'recovered' ? (
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
          )
        })
      )}
    </div>
  )

  const ProUpgradeCard = ({ feature }: { feature: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '420px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 20px' }}>
        <div style={{ fontSize: '44px', marginBottom: '20px' }}>🔒</div>
        <div style={{ fontFamily: 'var(--D)', fontSize: '20px', fontWeight: 800, color: 'var(--tx)', marginBottom: '12px' }}>
          {feature} is a Pro feature
        </div>
        <p style={{ color: 'var(--tx2)', fontSize: '14px', lineHeight: '1.7', marginBottom: '28px' }}>
          Upgrade to Pro to unlock {feature.toLowerCase()} and start recovering failed payments automatically.
        </p>
        <Link href="/upgrade">
          <button className="tb-btn red" style={{ fontSize: '13px', padding: '10px 22px' }}>
            Upgrade to Pro →
          </button>
        </Link>
      </div>
    </div>
  )

  const SettingsCard = () => (
    <div className="table-card" style={{ maxWidth: '520px' }}>
      <div className="table-head">
        <div className="table-title">Account Settings</div>
      </div>
      <div style={{ padding: '8px 20px 24px' }}>
        {[
          { label: 'Email', value: userEmail || '—' },
          { label: 'Plan', value: 'Free' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--bd)' }}>
            <div style={{ fontSize: '13px', color: 'var(--tx2)' }}>{row.label}</div>
            <div style={{ fontSize: '13px', color: 'var(--tx)', fontWeight: 500 }}>{row.value}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--bd)' }}>
          <div style={{ fontSize: '13px', color: 'var(--tx2)' }}>Stripe</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasConnection ? 'var(--grn)' : 'var(--tx3)' }} />
            <span style={{ fontSize: '13px', color: 'var(--tx)', fontWeight: 500 }}>
              {hasConnection ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
        {stripeAccountId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--bd)' }}>
            <div style={{ fontSize: '13px', color: 'var(--tx2)' }}>Account ID</div>
            <div style={{ fontSize: '12px', color: 'var(--tx3)', fontFamily: 'monospace' }}>{stripeAccountId}</div>
          </div>
        )}
        <div style={{ paddingTop: '20px' }}>
          <Link href="/onboarding">
            <button className="tb-btn out" style={{ fontSize: '12px' }}>
              {hasConnection ? 'Reconnect Stripe' : 'Connect Stripe'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* MOBILE TOPBAR */}
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

      {/* MOBILE DRAWER */}
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
            <div className="sb-stripe-dot" style={hasConnection === false ? { background: 'var(--tx3)' } : undefined} />
            <span>{accountLabel} · Stripe</span>
          </div>
        </div>
      </div>

      {/* APP */}
      <div className="app">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-logo"><div className="pip" />LeakCheck</div>
          <SidebarNav />
          <div className="sb-stripe" style={{ margin: '8px' }}>
            <div className="sb-stripe-dot" style={hasConnection === false ? { background: 'var(--tx3)' } : undefined} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--tx)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {accountLabel}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>
                Stripe · {hasConnection ? 'Connected' : 'Not connected'}
              </div>
            </div>
          </div>
          <div className="sb-bottom">
            <div className="sb-user">
              <div className="sb-avatar">{userInitials}</div>
              <div style={{ minWidth: 0 }}>
                <div className="sb-uname" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail || '—'}
                </div>
                <div className="sb-uemail" style={isPro ? { color: 'var(--grn)' } : undefined}>
                  {isPro ? 'Pro plan' : 'Free plan'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <div className="tb-left">
              <div>
                <div className="tb-title">Payment Health</div>
                <div className="tb-sub">{subText}</div>
              </div>
            </div>
            <div className="tb-right">
              <div className="tb-period">
                {(['7d', '30d', '90d'] as const).map(p => (
                  <div key={p} className={`tb-p${period === p ? ' on' : ''}`} onClick={() => setPeriod(p)}>{p}</div>
                ))}
              </div>
              {hasConnection && (
                <button
                  className="tb-btn out"
                  onClick={handleSync}
                  disabled={syncing}
                  style={{
                    opacity: syncing ? 0.6 : 1,
                    cursor: syncing ? 'not-allowed' : 'pointer',
                    ...(syncResult === 'ok' && { borderColor: 'var(--grn)', color: 'var(--grn)' }),
                    ...(syncResult === 'err' && { borderColor: 'var(--red)', color: 'var(--red)' }),
                  }}
                >
                  {syncing ? 'Syncing...' : syncResult === 'ok' ? '✓ Synced!' : syncResult === 'err' ? '✕ Error' : (
                    <>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      Sync
                    </>
                  )}
                </button>
              )}
              <button className="tb-btn out" onClick={() => setActiveNav('settings')}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                </svg>
                Settings
              </button>
              {!isPro && (
                <Link href="/upgrade">
                  <button className="tb-btn red">⚡ Activate Recovery</button>
                </Link>
              )}
            </div>
          </div>

          {/* CONTENT */}
          <div className="content">

            {/* ── DASHBOARD ── */}
            {activeNav === 'dashboard' && (
              <>
                {!loading && hasConnection === false && (
                  <div className="upgrade-banner">
                    <div className="ub-left">
                      <div className="ub-pip" />
                      <div>
                        <div className="ub-title">Connect your Stripe to see real data</div>
                        <div className="ub-sub">Your dashboard is ready — link your Stripe account to start tracking failed payments.</div>
                      </div>
                    </div>
                    <Link href="/onboarding">
                      <button className="ub-btn">Connect Stripe →</button>
                    </Link>
                  </div>
                )}
                {!loading && hasConnection && totalLost > 0 && (
                  <div className="upgrade-banner">
                    <div className="ub-left">
                      <div className="ub-pip" />
                      <div>
                        <div className="ub-title">
                          💡 You have <strong style={{ color: 'var(--red)' }}>${totalLost.toLocaleString()}</strong> recoverable right now
                        </div>
                        <div className="ub-sub">Upgrade to Recovery plan to automatically retry failed payments and send recovery emails.</div>
                      </div>
                    </div>
                    <Link href="/upgrade">
                      <button className="ub-btn">Activate Recovery — $29/mo →</button>
                    </Link>
                  </div>
                )}
                <StatCards />
                <ChartCard />
                <PaymentsTable />
              </>
            )}

            {/* ── PAYMENTS ── */}
            {activeNav === 'payments' && <PaymentsTable />}

            {/* ── REVENUE ── */}
            {activeNav === 'revenue' && (
              <>
                <StatCards />
                <ChartCard />
              </>
            )}

            {/* ── PRO LOCKED ── */}
            {(activeNav === 'auto-recovery' || activeNav === 'email' || activeNav === 'alerts') && (
              isPro ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '420px' }}>
                  <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 20px' }}>
                    <div style={{ fontSize: '44px', marginBottom: '20px' }}>✅</div>
                    <div style={{ fontFamily: 'var(--D)', fontSize: '20px', fontWeight: 800, color: 'var(--tx)', marginBottom: '12px' }}>
                      {PRO_FEATURE_LABELS[activeNav]} — Active
                    </div>
                    <p style={{ color: 'var(--tx2)', fontSize: '14px', lineHeight: '1.7' }}>
                      This feature is active on your account. Full UI coming soon.
                    </p>
                  </div>
                </div>
              ) : (
                <ProUpgradeCard feature={PRO_FEATURE_LABELS[activeNav]} />
              )
            )}

            {/* ── SETTINGS ── */}
            {activeNav === 'settings' && <SettingsCard />}

          </div>{/* /content */}
        </div>{/* /main */}
      </div>{/* /app */}
    </div>
  )
}
