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
  const map = { confirmed: 'badge-green', open: 'badge-blue', pending: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function MyCollabs() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [collabs, setCollabs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role === 'admin') { router.push('/'); return; }
      setProfile(prof)

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

  async function cancelCollab(id) {
    await supabase.from('collaborations').update({ status: 'cancelled', creator_id: null }).eq('id', id)
    setCollabs(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <Layout profile={profile} navItems={NAV} title="My Collabs">
      <div className="card">
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px' }}>
          <span>Restaurant</span><span>Date</span><span>Status</span><span>Pay</span><span></span>
        </div>
        {collabs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            No collaborations yet. Browse Open Collabs to request one!
          </div>
        ) : collabs.map(c => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px' }}>
            <div className="name-cell">
              <div className="sm-avatar">{(c.restaurants?.name || 'R').slice(0,2).toUpperCase()}</div>
              <div>
                <div className="cell-main">{c.restaurants?.name}</div>
                <div className="cell-sub">{c.platform}</div>
              </div>
            </div>
            <div className="cell-muted">{c.collab_date || '—'}</div>
            <div><Badge status={c.status} /></div>
            <div className="cell-main" style={{ color: 'var(--green)' }}>${c.creator_pay}</div>
            <div>
              {(c.status === 'confirmed' || c.status === 'pending') && (
                <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => cancelCollab(c.id)}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
