import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function Badge({ status }) {
  const map = { confirmed: 'badge-green', open: 'badge-blue', pending: 'badge-yellow', offered: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red', adjustment_requested: 'badge-yellow' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status.replace('_', ' ')}</span>
}

const EMPTY_FORM = { restaurant_id: '', creator_id: '', platform: 'Instagram', collab_date: '', collab_time: '', creator_pay: '', deliverables: '', status: 'open' }

export default function AdminCollabs() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [collabs, setCollabs] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [creators, setCreators] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingCollab, setEditingCollab] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'admin') { router.push('/'); return; }
      setProfile(prof)
      await fetchAll()
      setLoading(false)
    }
    load()
  }, [])

  async function fetchAll() {
    const [{ data: c }, { data: r }, { data: cr }] = await Promise.all([
      supabase.from('collaborations').select('*, restaurants(name), profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('restaurants').select('*').eq('status', 'active'),
      supabase.from('profiles').select('*').eq('role', 'creator'),
    ])
    setCollabs(c || [])
    setRestaurants(r || [])
    setCreators(cr || [])
  }

  function openNewModal() {
    setEditingCollab(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEditModal(c) {
    setEditingCollab(c)
    setForm({
      restaurant_id: c.restaurant_id || '',
      creator_id: c.creator_id || '',
      platform: c.platform || 'Instagram',
      collab_date: c.collab_date || '',
      collab_time: c.collab_time || '',
      creator_pay: c.creator_pay || '',
      deliverables: c.deliverables || '',
      status: c.status || 'open'
    })
    setShowModal(true)
  }

  async function saveCollab(e) {
    e.preventDefault()
    setSaving(true)

    if (editingCollab) {
      // Update existing
      await supabase.from('collaborations').update({
        restaurant_id: form.restaurant_id || null,
        creator_id: form.creator_id || null,
        platform: form.platform,
        collab_date: form.collab_date || null,
        collab_time: form.collab_time || null,
        creator_pay: parseInt(form.creator_pay) || 0,
        deliverables: form.deliverables,
        status: form.status,
      }).eq('id', editingCollab.id)
    } else {
      // Create new
      await supabase.from('collaborations').insert({
        restaurant_id: form.restaurant_id || null,
        creator_id: form.creator_id || null,
        platform: form.platform,
        collab_date: form.collab_date || null,
        collab_time: form.collab_time || null,
        creator_pay: parseInt(form.creator_pay) || 0,
        deliverables: form.deliverables,
        status: form.creator_id ? 'offered' : 'open',
      })
    }

    await fetchAll()
    setSaving(false)
    setShowModal(false)
    setEditingCollab(null)
    setForm(EMPTY_FORM)
  }

  async function deleteCollab(id) {
    await supabase.from('collaborations').delete().eq('id', id)
    setCollabs(prev => prev.filter(c => c.id !== id))
    setDeleteConfirm(null)
  }

  async function makeOpen(id) {
    await supabase.from('collaborations').update({ creator_id: null, status: 'open' }).eq('id', id)
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, creator_id: null, status: 'open', profiles: null } : c))
  }

  async function updateStatus(id, status) {
    await supabase.from('collaborations').update({ status }).eq('id', id)
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  async function markPaid(id) {
    await supabase.from('collaborations').update({ payment_status: 'paid' }).eq('id', id)
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, payment_status: 'paid' } : c))
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <AdminLayout profile={profile} title="Collaborations" actions={
      <button className="btn btn-primary" onClick={openNewModal}>+ New Collaboration</button>
    }>
      <div className="card">
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 180px' }}>
          <span>Restaurant</span><span>Creator</span><span>Date</span><span>Status</span><span>Pay</span><span>Actions</span>
        </div>
        {collabs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No collaborations yet. Create one above.</div>
        ) : collabs.map(c => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 180px' }}>
            <div className="name-cell">
              <div className="sm-avatar">{(c.restaurants?.name || 'R').slice(0, 2).toUpperCase()}</div>
              <div><div className="cell-main">{c.restaurants?.name || '—'}</div><div className="cell-sub">{c.platform}</div></div>
            </div>
            <div className="cell-muted">{c.profiles?.full_name || 'Open slot'}</div>
            <div className="cell-muted">{c.collab_date || '—'}</div>
            <div><Badge status={c.status} /></div>
            <div>
              <div className="cell-main">${c.creator_pay}</div>
              <div className="cell-sub">{c.payment_status}</div>
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {/* Edit */}
              <button
                className="btn"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => openEditModal(c)}
              >
                Edit
              </button>

              {/* Make Open */}
              {c.creator_id && c.status !== 'completed' && (
                <button
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--blue)', borderColor: 'rgba(59,130,246,0.3)' }}
                  onClick={() => makeOpen(c.id)}
                >
                  Make Open
                </button>
              )}

              {/* Confirm */}
              {(c.status === 'pending' || c.status === 'adjustment_requested') && (
                <button
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--green)', borderColor: 'rgba(34,197,94,0.3)' }}
                  onClick={() => updateStatus(c.id, 'confirmed')}
                >
                  Confirm
                </button>
              )}

              {/* Mark Paid */}
              {c.status === 'confirmed' && c.payment_status === 'unpaid' && (
                <button
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={() => markPaid(c.id)}
                >
                  Mark Paid
                </button>
              )}

              {/* Delete */}
              <button
                className="btn btn-danger"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => setDeleteConfirm(c.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target.classList.contains('modal-backdrop')) { setShowModal(false); setEditingCollab(null) } }}>
          <div className="modal-box">
            <div className="modal-title">{editingCollab ? 'Edit Collaboration' : 'New Collaboration'}</div>
            <form onSubmit={saveCollab}>
              <div className="form-row">
                <div className="form-field">
                  <label>Restaurant</label>
                  <select value={form.restaurant_id} onChange={e => setForm({ ...form, restaurant_id: e.target.value })} required>
                    <option value="">Select restaurant</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Creator (optional)</label>
                  <select value={form.creator_id} onChange={e => setForm({ ...form, creator_id: e.target.value })}>
                    <option value="">Open slot</option>
                    {creators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field"><label>Date</label><input type="date" value={form.collab_date} onChange={e => setForm({ ...form, collab_date: e.target.value })} /></div>
                <div className="form-field"><label>Time</label><input type="time" value={form.collab_time} onChange={e => setForm({ ...form, collab_time: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Platform</label>
                  <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                    <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Multiple</option>
                  </select>
                </div>
                <div className="form-field"><label>Creator Pay ($)</label><input type="number" value={form.creator_pay} onChange={e => setForm({ ...form, creator_pay: e.target.value })} placeholder="350" required /></div>
              </div>
              <div className="form-field"><label>Deliverables</label><textarea value={form.deliverables} onChange={e => setForm({ ...form, deliverables: e.target.value })} placeholder="1x Instagram Reel (60s), 3x Stories..." /></div>

              {/* Status override when editing */}
              {editingCollab && (
                <div className="form-field">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="open">Open</option>
                    <option value="offered">Offered</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={() => { setShowModal(false); setEditingCollab(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingCollab ? 'Save Changes' : 'Create Collaboration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗑️</div>
              <div className="modal-title" style={{ textAlign: 'center' }}>Delete Collaboration?</div>
              <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '8px', lineHeight: '1.6' }}>
                This will permanently delete this collaboration. This cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => deleteCollab(deleteConfirm)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
