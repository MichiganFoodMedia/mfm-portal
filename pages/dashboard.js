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
  const map = { confirmed: 'badge-green', open: 'badge-blue', pending: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red', offered: 'badge-yellow', adjustment_requested: 'badge-yellow' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status.replace('_', ' ')}</span>
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [collabs, setCollabs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return; }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/'); return; }
      if (prof.role === 'admin') { router.push('/admin/dashboard'); return; }
      if (!prof.agreed_to_terms) { router.push('/agreement'); return; }
      setProfile(prof)

      const { data: myCollabs } = await supabase
        .from('collaborations')
        .select('*, restaurants(name, location)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setCollabs(myCollabs || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading-screen">Loading...</div>

  const activeCollabs = collabs.filter(c => c.status === 'confirmed')
  const offeredCollabs = collabs.filter(c => c.status === 'offered' || c.status === 'pending')
  const pendingPay = collabs.filter(c => c.payment_status === 'unpaid' && c.status === 'completed').reduce((s, c) => s + (c.creator_pay || 0), 0)

  return (
    <Layout profile={profile} navItems={NAV} title="Dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Collabs</div>
          <div className="stat-value">{activeCollabs.length}</div>
          <div className="stat-sub">Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Pay</div>
          <div className="stat-value">${pendingPay}</div>
          <div className="stat-sub">Awaiting payment</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Rate</div>
          <div className="stat-value">${profile?.rate || 0}</div>
          <div className="stat-sub">Per collaboration</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Collabs</div>
          <div className="stat-value">{collabs.length}</div>
          <div className="stat-sub">All time</div>
        </div>
      </div>

      {/* Action required - offers waiting */}
      {offeredCollabs.length > 0 && (
        <div className="card" style={{ border: '1px solid rgba(234,179,8,0.3)' }}>
          <div className="card-header" style={{ background: 'rgba(234,179,8,0.06)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--yellow)' }}>⚡ You have {offeredCollabs.length} offer{offeredCollabs.length > 1 ? 's' : ''} waiting</span>
            <button className="btn" onClick={() => router.push('/my-collabs')}>Review Now</button>
          </div>
          {offeredCollabs.map(c => (
            <div key={c.id} style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{c.restaurants?.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{c.collab_date || 'Date TBD'} · ${c.creator_pay}</div>
              </div>
              <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => router.push('/my-collabs')}>
                View Offer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming confirmed collabs */}
      {activeCollabs.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Upcoming Collaboration</span></div>
          {activeCollabs.map(c => (
            <div key={c.id} style={{ padding: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{c.restaurants?.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>{c.restaurants?.location}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div><div className="stat-label">Date</div><div style={{ fontWeight: 500 }}>{c.collab_date || '—'}</div></div>
                <div><div className="stat-label">Time</div><div style={{ fontWeight: 500 }}>{c.collab_time || '—'}</div></div>
                <div><div className="stat-label">Your Pay</div><div style={{ fontWeight: 500, color: 'var(--green)' }}>${c.creator_pay}</div></div>
              </div>
              {c.deliverables && (
                <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text2)' }}>
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '4px' }}>Deliverables</strong>
                  {c.deliverables}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Collaborations</span>
          <button className="btn" onClick={() => router.push('/my-collabs')}>View all</button>
        </div>
        {collabs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            No collaborations yet. Check Open Collabs to get started!
          </div>
        ) : (
          <>
            <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', display: 'grid' }}>
              <span>Restaurant</span><span>Date</span><span>Status</span><span>Pay</span>
            </div>
            {collabs.map(c => (
              <div key={c.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                <div className="name-cell">
                  <div className="sm-avatar">{(c.restaurants?.name || 'R').slice(0, 2).toUpperCase()}</div>
                  <div><div className="cell-main">{c.restaurants?.name}</div><div className="cell-sub">{c.platform}</div></div>
                </div>
                <div className="cell-muted">{c.collab_date || '—'}</div>
                <div><Badge status={c.status} /></div>
                <div className="cell-main" style={{ color: 'var(--green)' }}>${c.creator_pay}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </Layout>
  )
}
