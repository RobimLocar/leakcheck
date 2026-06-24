'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

// This page exists specifically so the actual token verification only ever
// happens on a real click, never on page load. Email clients (Gmail, Outlook
// Safe Links, corporate security gateways) automatically pre-fetch links
// inside incoming emails to scan them for safety — if the email link pointed
// straight at Supabase's one-time-use /verify endpoint, that prefetch would
// silently consume the token before the human ever clicks, and the real
// click would then fail with "Could not authenticate user". Routing through
// a page that requires a manual button press avoids that: a prefetch bot
// loads this page's HTML (harmless, no token spent) but doesn't click
// buttons or run the verifyOtp call.
function ConfirmContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const tokenHash = params.get('token_hash')
  const type = params.get('type') as EmailOtpType | null
  const next = params.get('next') ?? '/dashboard'

  const confirm = async () => {
    if (!tokenHash || !type) {
      setError('This confirmation link is invalid or incomplete.')
      setStatus('error')
      return
    }
    setStatus('loading')
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    if (verifyError) {
      setError(verifyError.message)
      setStatus('error')
      return
    }

    fetch('/api/auth/post-confirm', { method: 'POST' }).catch(() => {})
    router.push(next)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <div className="pip" />
            LeakCheck
          </div>
          <div className="login-title">Confirm it&apos;s you</div>
          <p className="login-sub">Click below to finish signing in.</p>
        </div>

        <div className="login-body">
          {error && <p className="login-error" style={{ marginBottom: '16px' }}>{error}</p>}
          <button
            onClick={confirm}
            className="connect-btn"
            disabled={status === 'loading'}
            style={status === 'loading' ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
          >
            {status === 'loading' ? 'Confirming...' : 'Confirm and continue →'}
          </button>
          <p className="cc-note">For your security, this has to be a real click — not an automated link scan.</p>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
