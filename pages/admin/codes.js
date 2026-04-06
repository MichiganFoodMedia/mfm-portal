import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'MFMC-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function AdminCodes() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [codes, setCodes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', expiry: '30' })
  const [generatedCode, setGeneratedCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'admin') { router.push('/'); return; }
      setProfile(prof)
      const { data } = await supabase.from('activation_codes').select('*, profiles!activation_codes_used_by_fkey(full_name)').order('created_at', { ascending: false })
      setCodes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function createCode(e) {
    e.preventDefault()
    setSaving(true)
    const code = generateCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(form.expiry))

    const { data } = await supabase.from('activation_codes').insert({
      code,
      created_for_name: form.name,
      created_for_email: form.email,
      expires_at: expiresAt.toISOString(),
      used: false
    }).select().single()

    if (data) {
      setCodes(prev => [data, ...prev])
      setGeneratedCode(code)
    }
    setSaving(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function resetModal() {
    setShowModal(false)
    setGeneratedCode('')
    setForm({ name: '', email: '', expiry: '30' })
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <AdminLayout profile={profile} title="Invite Codes" actions={
      <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Generate Code</button>
    }>
      <div className="card">
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 80px' }}>
          <span>Code</span><span>Created For</span><span>Expires</span><span>Status</span><span>Used By</span>
        </div>
        {codes.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No codes yet. Generate one to invite a creator.</div>
        ) : codes.map(c => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 80px' }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px', fontSize: '14px' }}>{c.code}</div>
            <div>
              <div className="cell-main">{c.created_for_name || '—'}</div>
              <div className="cell-sub">{c.created_for_email || '—'}</div>
            </div>
            <div className="cell-muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</div>
            <div>
              <span className={`badge ${c.used ? 'badge-gray' : new Date(c.expires_at) < new Date() ? 'badge-red' : 'badge-green'}`}>
                {c.used ? 'used' : new Date(c.expires_at) < new Date() ? 'expired' : 'active'}
              </span>
            </div>
            <div className="cell-muted">{c.profiles?.full_name || '—'}</div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target.classList.contains('modal-backdrop')) resetModal() }}>
          <div className="modal-box">
            {!generatedCode ? (
              <>
                <div className="modal-title">Generate Invite Code</div>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.6' }}>
                  Generate a single-use code for a creator you've vetted. Share the code with them so they can sign up.
                </p>
                <form onSubmit={createCode}>
                  <div className="form-field"><label>Creator Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" required /></div>
                  <div className="form-field"><label>Creator Email (optional)</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@email.com" /></div>
                  <div className="form-field">
                    <label>Code Expires In</label>
                    <select value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })}>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button type="button" className="btn" onClick={resetModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Generating...' : 'Generate Code'}</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="modal-title">Code Generated!</div>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px', lineHeight: '1.6' }}>
                  Share this code with <strong style={{ color: 'var(--text)' }}>{form.name}</strong>. It's single-use and expires in {form.expiry} days.
                </p>
                <div className="code-display">
                  <div className="code-label">Activation Code</div>
                  <div className="code-value">{generatedCode}</div>
                  <div className="code-hint">They'll enter this on the signup page to create their account.</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={copyCode}>
                    {copied ? '✓ Copied!' : 'Copy Code'}
                  </button>
                  <button className="btn" onClick={resetModal}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
