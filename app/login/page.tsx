'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(urlError ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <div className="pip" />
            LeakCheck
          </div>
          {!sent ? (
            <>
              <div className="login-title">Sign in to LeakCheck</div>
              <p className="login-sub">Enter your email and we&apos;ll send you a magic link.</p>
            </>
          ) : (
            <>
              <div className="login-title">Check your email</div>
              <p className="login-sub">Magic link sent to <strong style={{ color: 'var(--tx)' }}>{email}</strong></p>
            </>
          )}
        </div>

        <div className="login-body">
          {!sent ? (
            <form onSubmit={handleSubmit}>
              <label className="login-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
              {error && <p className="login-error">{error}</p>}
              <button
                type="submit"
                className="connect-btn"
                disabled={loading}
                style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
              >
                {loading ? 'Sending magic link...' : 'Send magic link →'}
              </button>
              <p className="cc-note">No password required · Free to start</p>
            </form>
          ) : (
            <div className="login-success">
              <div className="login-success-icon">✉️</div>
              <div className="login-success-title">Magic link on its way</div>
              <p className="login-success-sub">
                Click the link in your email to sign in. The link expires in 1 hour.
                <br /><br />
                <span style={{ color: 'var(--tx3)' }}>Don&apos;t see it? Check your spam folder.</span>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{ marginTop: '20px', background: 'none', border: 'none', color: 'var(--tx3)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--B)' }}
              >
                ← Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
