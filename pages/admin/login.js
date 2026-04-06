import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
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
    if (error) { setError(error.message); setLoading(false); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role !== 'admin') {
      setError('You do not have admin access.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>Michigan Food Media</div>
        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Admin Sign In</div>
        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px' }}>Restricted access</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@email.com" required /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in as Admin'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text3)' }}>
          <Link href="/" style={{ color: 'var(--text3)' }}>← Back to creator portal</Link>
        </div>
      </div>
    </div>
  )
}
