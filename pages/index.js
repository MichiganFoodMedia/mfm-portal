import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-portal-label">Michigan Food Media</div>
        <div className="auth-portal-title">Michigan Food Media<br />Creator Portal</div>
        <div className="auth-portal-sub">
          The exclusive platform connecting Michigan food content creators with local restaurants for paid collaborations.
        </div>
        <div className="auth-features">
          <div className="auth-feature"><div className="auth-feature-dot" /><span>Browse and request paid collaboration opportunities</span></div>
          <div className="auth-feature"><div className="auth-feature-dot" /><span>Track your earnings and payment status</span></div>
          <div className="auth-feature"><div className="auth-feature-dot" /><span>Communicate directly with the agency</span></div>
          <div className="auth-feature"><div className="auth-feature-dot" /><span>Invite-only — verified creators only</span></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-title">Sign in</div>
          <div className="auth-sub">Welcome back to the portal</div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center', marginTop: '4px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="auth-switch">
            Don't have an account? <Link href="/signup">Create one</Link>
          </div>
          <hr className="divider" />
          <div className="admin-link"><Link href="/admin/login">Admin sign in →</Link></div>
        </div>
      </div>
    </div>
  )
}
