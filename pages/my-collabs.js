import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const NAV = [
  { href: '/dashboard', icon: '◼', label: 'Dashboard' },
  { href: '/my-collabs', icon: '◈', label: 'My Collabs' },
  { href: '/open-collabs', icon: '◆', label: 'Open Collabs' },
  { href: '/messages', icon: '◧', label: 'Messages' },
  { href: '/profile', icon: '◉', label: 'My Profile' },
  { href: '/earnings', icon: '◫', label: 'Earnings' },
]

function Badge({ status }) {
  const map = { confirmed: 'badge-green', open: 'badge-blue', pending: 'badge-yellow', completed: 'badge-green', denied: 'badge-red', cancelled: 'badge-red', offered: 'badge-yellow', adjustment_requested: 'badge-yellow' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status.replace('_', ' ')}</span>
}

export default function MyCollabs() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [collabs, setCollabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [adjustCollab, setAdjustCollab] = useState(null)
  const [adjustNote, setAdjustNote] = useState('')
  const [sending, setSending] = useState(false)
  const [adminId, setAdminId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role === 'admin') { router.push('/'); return; }
      setProfile(prof)

      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1)
      setAdminId(admins?.[0]?.id)

      const { data } = await supabase
        .from('collaborations')
        .select('*, restaurants(name, location)')
        .eq('creator_id', user.id)
        .order('collab_date', { ascending: false })
      setCollabs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function acceptCollab(id) {
    await supabase.from('collaborations').update({ status: 'confirmed' }).eq('id', id)
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, status: 'confirmed' } : c))
  }

  async function denyCollab(id) {
    await supabase.from('collaborations').update({ status: 'denied', creator_id: null }).eq('id', id)
    setCollabs(prev => prev.filter(c => c.id !== id))
  }

  async function sendAdjustment() {
    if (!adjustNote.trim() || !adminId || !profile) return
    setSending(true)
    const collab = collabs.find(c => c.id === adjustCollab)
    const message = `📋 Adjustment Request for ${collab?.restaurants?.name} collab (${collab?.collab_date || 'TBD'}):\n\n${adjustNote}`
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: adminId,
      content: message,
      read: false
    })

    await supabase.from('collaborations').update({ status: 'adjustment_requested' }).eq('id', adjustCollab)
    setCollabs(prev => prev.map(c => c.id === adjustCollab ? { ...c, status: 'adjustment_requested' } : c))
    setSending(false)
    setAdjustCollab(null)
    setAdjustNote('')
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <Layout profile={profile} navItems={NAV} title="My Collabs">

      {/* Offered collabs - need action */}
      {collabs.filter(c => c.status === 'offered' || c.status === 'pending').length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--yellow)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> Action Required
          </div>
          {collabs.filter(c => c.status === 'offered' || c.status === 'pending').map(c => (
            <div key={c.id} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>{c.restaurants?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{c.restaurants?.location}</div>
                  </div>
                  <Badge status={c.status} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div><div className="stat-label">Date</div><div style={{ fontWeight: 500, fontSize: '13px' }}>{c.collab_date || '—'}</div></div>
                  <div><div className="stat-label">Time</div><div style={{ fontWeight: 500, fontSize: '13px' }}>{c.collab_time || '—'}</div></div>
                  <div><div className="stat-label">Pay</div><div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--green)' }}>${c.creator_pay}</div></div>
                </div>
                {c.deliverables && (
                  <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text2)', marginBottom: '14px' }}>
                    <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '3px' }}>Deliverables</strong>
                    {c.deliverables}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ justifyContent: 'center', background: 'var(--green)', borderColor: 'var(--green)', color: '#000' }}
                    onClick={() => acceptCollab(c.id)}
                  >
                    ✓ Accept
                  </button>
                  <button
                    className="btn"
                    style={{ justifyContent: 'center', color: 'var(--text2)' }}
                    onClick={() => setAdjustCollab(c.id)}
                  >
                    ✎ Request Adjustment
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ justifyContent: 'center' }}
                    onClick={() => denyCollab(c.id)}
                  >
                    ✕ Deny
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All collabs table */}
      <div className="card">
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
          <span>Restaurant</span><span>Date</span><span>Status</span><span>Pay</span>
        </div>
        {collabs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            No collaborations yet. Browse Open Collabs to request one!
          </div>
        ) : collabs.map(c => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
            <div className="name-cell">
              <div className="sm-avatar">{(c.restaurants?.name || 'R').slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="cell-main">{c.restaurants?.name}</div>
                <div className="cell-sub">{c.platform}</div>
              </div>
            </div>
            <div className="cell-muted">{c.collab_date || '—'}</div>
            <div><Badge status={c.status} /></div>
            <div className="cell-main" style={{ color: 'var(--green)' }}>${c.creator_pay}</div>
          </div>
        ))}
      </div>

      {/* Adjustment Request Modal */}
      {adjustCollab && (
        <div className="modal-backdrop" onClick={e => { if (e.target.classList.contains('modal-backdrop')) { setAdjustCollab(null); setAdjustNote('') } }}>
          <div className="modal-box">
            <div className="modal-title">Request Adjustment</div>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.6' }}>
              Let us know what you'd like adjusted — pay, date, time, deliverables, or anything else. We'll review and get back to you.
            </p>
            <div className="form-field">
              <label>What would you like us to adjust?</label>
              <textarea
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="e.g. Can we move the date to April 20th? Also hoping for $400 instead of $350..."
                style={{ minHeight: '120px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setAdjustCollab(null); setAdjustNote('') }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={sendAdjustment} disabled={sending || !adjustNote.trim()}>
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
