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
  const [form, setForm] = useState({ name: '', email: '', expiry: '30', role: 'creator' })
  const [generatedCode, setGeneratedCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showAdminConfirm, setShowAdminConfirm] = useState(false)

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

  function handleGenerateClick(e) {
    e.preventDefault()
    if (form.role === 'admin') {
      setShowAdminConfirm(true)
    } else {
      createCode()
    }
  }

  async function createCode() {
    setShowAdminConfirm(false)
    setSaving(true)
    const code = generateCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(form.expiry))

    const { data } = await supabase.from('activation_codes').insert({
      code,
      created_for_name: form.name,
      created_for_email: form.email,
      expires_at: expiresAt.toISOString(),
      used: false,
      role: form.role
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
    setShowAdminConfirm(false)
    setForm({ name: '', email: '', expiry: '30', role: 'creator' })
  }

  async function deleteCode(id) {
    await supabase.from('activation_codes').delete().eq('id', id)
    setCodes(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <AdminLayout profile={profile} title="Invite Codes" actions={
      <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Generate Code</button>
    }>
      <div className="card">
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 60px' }}>
          <span>Code</span><span>Created For</span><span>Role</span><span>Expires</span><span>Status</span><span>Used By</span><span></span>
        </div>
        {codes.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No codes yet. Generate one to invite someone.</div>
        ) : codes.map(c => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 60px' }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px', fontSize: '14px' }}>{c.code}</div>
            <div>
              <div className="cell-main">{c.created_for_name || '—'}</div>
              <div className="cell-sub">{c.created_for_email || '—'}</div>
            </div>
            <div>
              <span className={`badge ${c.role === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>
                {c.role || 'creator'}
              </span>
            </div>
            <div className="cell-muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</div>
            <div>
              <span className={`badge ${c.used ? 'badge-gray' : new Date(c.expires_at) < new Date() ? 'badge-red' : 'badge-green'}`}>
                {c.used ? 'used' : new Date(c.expires_at) < new Date() ? 'expired' : 'active'}
              </span>
            </div>
            <div className="cell-muted">{c.profiles?.full_name || '—'}</div>
            <div>
              <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => deleteCode(c.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target.classList.contains('modal-backdrop')) resetModal() }}>
          <div className="modal-box">
            {showAdminConfirm ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
                  <div className="modal-title" style={{ textAlign: 'center' }}>Are you sure?</div>
                  <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', marginTop: '8px' }}>
                    You are about to create an <strong style={{ color: 'var(--yellow)' }}>Admin code</strong> for <strong style={{ color: 'var(--text)' }}>{form.name}</strong>. This code will give full access to everything — collaborations, creators, restaurants, messages, and invite codes.
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--red)', marginTop: '10px', lineHeight: '1.6' }}>
                    Only share this with someone you fully trust.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAdminConfirm(false)}>Go Back</button>
                  <button
                    className="btn"
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--yellow)', borderColor: 'var(--yellow)', color: '#000', fontWeight: 600 }}
                    onClick={createCode}
                    disabled={saving}
                  >
                    {saving ? 'Generating...' : 'Yes, Generate Admin Code'}
                  </button>
                </div>
              </>
            ) : !generatedCode ? (
              <>
                <div className="modal-title">Generate Invite Code</div>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.6' }}>
                  Generate a single-use invite code. Choose whether this gives creator or admin access.
                </p>
                <form onSubmit={handleGenerateClick}>
                  <div className="form-field"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" required /></div>
                  <div className="form-field"><label>Email (optional)</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@email.com" /></div>
                  <div className="form-field">
                    <label>Account Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                      <div
                        onClick={() => setForm({ ...form, role: 'creator' })}
                        style={{
                          padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                          border: `1.5px solid ${form.role === 'creator' ? 'var(--blue)' : 'var(--border2)'}`,
                          background: form.role === 'creator' ? 'rgba(59,130,246,0.08)' : 'var(--bg3)',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>◉</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: form.role === 'creator' ? 'var(--blue)' : 'var(--text)' }}>Creator</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Portal access only</div>
                      </div>
                      <div
                        onClick={() => setForm({ ...form, role: 'admin' })}
                        style={{
                          padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                          border: `1.5px solid ${form.role === 'admin' ? 'var(--yellow)' : 'var(--border2)'}`,
                          background: form.role === 'admin' ? 'rgba(234,179,8,0.08)' : 'var(--bg3)',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>◆</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: form.role === 'admin' ? 'var(--yellow)' : 'var(--text)' }}>Admin</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Full access</div>
                      </div>
                    </div>
                  </div>
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
                  Share this <strong style={{ color: form.role === 'admin' ? 'var(--yellow)' : 'var(--blue)' }}>{form.role}</strong> code with <strong style={{ color: 'var(--text)' }}>{form.name}</strong>. It's single-use and expires in {form.expiry} days.
                </p>
                <div className="code-display">
                  <div className="code-label">{form.role === 'admin' ? '⚠ Admin' : 'Creator'} Activation Code</div>
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
