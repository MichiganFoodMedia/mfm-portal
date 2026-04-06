import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const EMPTY = { name: '', location: '', cuisine: '', budget: '', contact_email: '', contact_name: '', notes: '' }

export default function AdminRestaurants() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'admin') { router.push('/'); return; }
      setProfile(prof)
      const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
      setRestaurants(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function saveRestaurant(e) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('restaurants').insert({
      name: form.name,
      location: form.location,
      cuisine: form.cuisine,
      budget: parseInt(form.budget) || 0,
      contact_email: form.contact_email,
      contact_name: form.contact_name,
      notes: form.notes,
      status: 'active'
    }).select().single()
    if (data) setRestaurants(prev => [data, ...prev])
    setSaving(false)
    setShowModal(false)
    setForm(EMPTY)
  }

  async function toggleStatus(id, current) {
    const newStatus = current === 'active' ? 'inactive' : 'active'
    await supabase.from('restaurants').update({ status: newStatus }).eq('id', id)
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <AdminLayout profile={profile} title="Restaurants" actions={
      <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Restaurant</button>
    }>
      <div className="card">
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px 80px' }}>
          <span>Restaurant</span><span>Cuisine</span><span>Budget</span><span>Contact</span><span>Status</span><span></span>
        </div>
        {restaurants.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No restaurants yet. Add one above.</div>
        ) : restaurants.map(r => (
          <div key={r.id} className="table-row" style={{ gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px 80px' }}>
            <div className="name-cell">
              <div className="sm-avatar">{r.name.slice(0, 2).toUpperCase()}</div>
              <div><div className="cell-main">{r.name}</div><div className="cell-sub">{r.location}</div></div>
            </div>
            <div className="cell-muted">{r.cuisine || '—'}</div>
            <div className="cell-main">${r.budget || 0}</div>
            <div className="cell-muted">{r.contact_name || '—'}</div>
            <div><span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{r.status}</span></div>
            <div>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => toggleStatus(r.id, r.status)}>
                {r.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target.classList.contains('modal-backdrop')) setShowModal(false) }}>
          <div className="modal-box">
            <div className="modal-title">Add Restaurant</div>
            <form onSubmit={saveRestaurant}>
              <div className="form-field"><label>Restaurant Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rosita Kitchen" required /></div>
              <div className="form-row">
                <div className="form-field"><label>Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Lansing, MI" /></div>
                <div className="form-field"><label>Cuisine Type</label><input value={form.cuisine} onChange={e => setForm({ ...form, cuisine: e.target.value })} placeholder="Mexican" /></div>
              </div>
              <div className="form-row">
                <div className="form-field"><label>Monthly Budget ($)</label><input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="500" /></div>
                <div className="form-field"><label>Contact Name</label><input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Owner name" /></div>
              </div>
              <div className="form-field"><label>Contact Email</label><input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="owner@restaurant.com" /></div>
              <div className="form-field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add Restaurant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
