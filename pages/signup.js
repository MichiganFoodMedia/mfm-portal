import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeRecord, setCodeRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', instagram: '',
    tiktok: '', location: '', rate: '', phone: ''
  })

  async function verifyCode(e) {
    e.preventDefault()
    setLoading(true)
    setCodeError('')

    const { data, error } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('used', false)
      .single()

    if (error || !data) {
      setCodeError('Invalid or already used code. Contact Michigan Food Media if you need help.')
      setLoading(false)
      return
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCodeError('This code has expired. Please contact Michigan Food Media for a new one.')
      setLoading(false)
      return
    }

    setCodeRecord(data)
    setStep(2)
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Create auth user
    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    const userId = data.user.id

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: form.fullName,
      email: form.email,
      role: codeRecord.role || 'creator',
      instagram_handle: form.instagram,
      tiktok_handle: form.tiktok,
      location: form.location,
      rate: parseInt(form.rate) || 0,
      phone: form.phone,
      agreed_to_terms: false,
      status: 'active'
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Mark code as used
    await supabase.from('activation_codes').update({
      used: true,
      used_by: userId,
      used_at: new Date().toISOString()
    }).eq('id', codeRecord.id)

    router.push('/agreement')
  }

  if (step === 1) {
    return (
      <div className="auth-wrap">
        <div className="auth-left">
          <div className="auth-portal-label">Michigan Food Media</div>
          <div className="auth-portal-title">Michigan Food Media<br />Creator Portal</div>
          <div className="auth-portal-sub">This portal is invite-only. You'll need an activation code from our team to create an account.</div>
          <div className="auth-features">
            <div className="auth-feature"><div className="auth-feature-dot" /><span>Codes are issued after onboarding with our agency</span></div>
            <div className="auth-feature"><div className="auth-feature-dot" /><span>Each code is single-use and tied to your invite</span></div>
            <div className="auth-feature"><div className="auth-feature-dot" /><span>Contact us if you haven't received your code</span></div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-title">Create account</div>
            <div className="auth-sub">Step 1 of 2 — Verify your invite code</div>
            <form onSubmit={verifyCode}>
              <div className="field">
                <label>Activation Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="e.g. MFMC-2025"
                  style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                  className={codeError ? 'error' : ''}
                  required
                />
                {codeError
                  ? <div className="error-msg">{codeError}</div>
                  : <div className="hint-msg">Your code was sent to you by the Michigan Food Media team.</div>
                }
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
            <div className="auth-switch">Already have an account? <Link href="/">Sign in</Link></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-portal-label">Michigan Food Media</div>
        <div className="auth-portal-title">Michigan Food Media<br />Creator Portal</div>
        <div className="auth-portal-sub">You're almost in. Fill out your details to complete your account.</div>
        <div className="auth-features">
          <div className="auth-feature"><div className="auth-feature-dot" style={{ background: 'var(--green)' }} /><span style={{ color: 'var(--green)' }}>✓ Activation code verified</span></div>
          <div className="auth-feature"><div className="auth-feature-dot" /><span>Complete your profile details</span></div>
          <div className="auth-feature"><div className="auth-feature-dot" /><span>Accept the creator agreement</span></div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-title">Your details</div>
          <div className="auth-sub">Step 2 of 2 — Create your account</div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSignup}>
            <div className="field"><label>Full Name</label><input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Jane Smith" required /></div>
            <div className="field"><label>Email address</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required /></div>
            <div className="field"><label>Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Create a strong password" required /></div>
            <div className="field"><label>Instagram Handle</label><input type="text" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@yourhandle" /></div>
            <div className="field"><label>TikTok Handle (optional)</label><input type="text" value={form.tiktok} onChange={e => setForm({ ...form, tiktok: e.target.value })} placeholder="@yourhandle" /></div>
            <div className="field"><label>Location (City, MI)</label><input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Detroit, MI" /></div>
            <div className="field"><label>Phone Number</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
            <div className="field"><label>Rate per Collaboration ($)</label><input type="number" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder="250" /></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center', marginTop: '4px' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Continue to Agreement'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
