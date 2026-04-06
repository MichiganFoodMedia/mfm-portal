import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function initials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function AdminCreators() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'admin') { router.push('/'); return; }
      setProfile(prof)

      const { data } = await supabase.from('profiles').select('*').eq('role', 'creator').order('created_at', { ascending: false })
      setCreators(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function toggleStatus(id, current) {
    const newStatus = current === 'active' ? 'suspended' : 'active'
    await supabase.from('profiles').update({ status: newStatus }).eq('id', id)
    setCreators(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <AdminLayout profile={profile} title="Creators">
      <div className="card">
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px 80px' }}>
          <span>Creator</span><span>Location</span><span>Instagram</span><span>Rate</span><span>Status</span><span></span>
        </div>
        {creators.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            No creators yet. Generate invite codes to onboard creators.
          </div>
        ) : creators.map(c => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px 80px' }} onClick={() => setSelected(c)}>
            <div className="name-cell">
              <div className="sm-avatar">{initials(c.full_name)}</div>
              <div><div className="cell-main">{c.full_name}</div><div className="cell-sub">{c.email}</div></div>
            </div>
            <div className="cell-muted">{c.location || '—'}</div>
            <div className="cell-muted">{c.instagram_handle || '—'}</div>
            <div className="cell-main">${c.rate || 0}</div>
            <div><span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-red'}`}>{c.status || 'active'}</span></div>
            <div onClick={e => { e.stopPropagation(); toggleStatus(c.id, c.status || 'active') }}>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }}>
                {c.status === 'suspended' ? 'Restore' : 'Suspend'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div className="avatar" style={{ width: '46px', height: '46px', fontSize: '15px' }}>{initials(selected.full_name)}</div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 600 }}>{selected.full_name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{selected.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                ['Instagram', selected.instagram_handle || '—'],
                ['TikTok', selected.tiktok_handle || '—'],
                ['Location', selected.location || '—'],
                ['Phone', selected.phone || '—'],
                ['Rate', `$${selected.rate || 0}`],
                ['Travel Radius', `${selected.travel_radius || 50} miles`],
                ['Agreed to Terms', selected.agreed_to_terms ? 'Yes' : 'No'],
                ['Status', selected.status || 'active'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
