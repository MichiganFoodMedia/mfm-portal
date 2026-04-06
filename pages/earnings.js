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

export default function Earnings() {
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
        .select('*, restaurants(name)')
        .eq('creator_id', user.id)
        .in('status', ['completed', 'confirmed'])
        .order('collab_date', { ascending: false })
      setCollabs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading-screen">Loading...</div>

  const totalEarned = collabs.filter(c => c.payment_status === 'paid').reduce((s, c) => s + (c.creator_pay || 0), 0)
  const pending = collabs.filter(c => c.payment_status === 'unpaid').reduce((s, c) => s + (c.creator_pay || 0), 0)

  return (
    <Layout profile={profile} navItems={NAV} title="Earnings">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px', maxWidth: '540px' }}>
        <div className="stat-card"><div className="stat-label">Total Earned</div><div className="stat-value">${totalEarned}</div></div>
        <div className="stat-card"><div className="stat-label">Pending Payment</div><div className="stat-value" style={{ color: 'var(--yellow)' }}>${pending}</div></div>
      </div>

      <div className="card" style={{ maxWidth: '540px' }}>
        <div className="card-header"><span className="card-title">Payment History</span></div>
        {collabs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No completed collaborations yet.</div>
        ) : collabs.map(c => (
          <div key={c.id} className="earnings-row">
            <div>
              <div style={{ fontWeight: 500 }}>{c.restaurants?.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{c.collab_date || '—'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={`badge ${c.payment_status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>{c.payment_status}</span>
              <span style={{ fontWeight: 600 }}>${c.creator_pay}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
