import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function Badge({ status }) {
  const map = { confirmed: 'badge-green', open: 'badge-blue', pending: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red', paid: 'badge-green', unpaid: 'badge-yellow', active: 'badge-green', suspended: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function AdminDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ creators: 0, restaurants: 0, collabs: 0, openCollabs: 0 })
  const [recentCollabs, setRecentCollabs] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'admin') { router.push('/'); return; }
      setProfile(prof)

      const [{ count: creators }, { count: restaurants }, { data: collabs }, { data: messages }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('collaborations').select('*, restaurants(name), profiles(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('messages').select('*, profiles!messages_sender_id_fkey(full_name)').eq('read', false).order('created_at', { ascending: false }).limit(5),
      ])

      const allCollabs = collabs || []
      setStats({
        creators: creators || 0,
        restaurants: restaurants || 0,
        collabs: allCollabs.filter(c => c.status === 'confirmed').length,
        openCollabs: allCollabs.filter(c => c.status === 'open').length,
      })
      setRecentCollabs(allCollabs)
      setRecentMessages(messages || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <AdminLayout profile={profile} title="Dashboard">
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total Creators</div><div className="stat-value">{stats.creators}</div><div className="stat-sub">Registered</div></div>
        <div className="stat-card"><div className="stat-label">Restaurants</div><div className="stat-value">{stats.restaurants}</div><div className="stat-sub">In database</div></div>
        <div className="stat-card"><div className="stat-label">Active Collabs</div><div className="stat-value">{stats.collabs}</div><div className="stat-sub">Confirmed</div></div>
        <div className="stat-card"><div className="stat-label">Open Slots</div><div className="stat-value">{stats.openCollabs}</div><div className="stat-sub">Awaiting creator</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Collaborations</span>
          <Link href="/admin/collabs"><button className="btn">View all</button></Link>
        </div>
        <div className="table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px' }}>
          <span>Restaurant</span><span>Creator</span><span>Date</span><span>Status</span><span>Pay</span>
        </div>
        {recentCollabs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No collaborations yet.</div>
        ) : recentCollabs.map(c => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px' }}>
            <div className="name-cell">
              <div className="sm-avatar">{(c.restaurants?.name || 'R').slice(0, 2).toUpperCase()}</div>
              <div><div className="cell-main">{c.restaurants?.name || '—'}</div><div className="cell-sub">{c.platform}</div></div>
            </div>
            <div className="cell-muted">{c.profiles?.full_name || 'Open'}</div>
            <div className="cell-muted">{c.collab_date || '—'}</div>
            <div><Badge status={c.status} /></div>
            <div className="cell-main">${c.creator_pay || 0}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Unread Messages</span>
          <Link href="/admin/messages"><button className="btn">View all</button></Link>
        </div>
        {recentMessages.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No unread messages.</div>
        ) : recentMessages.map(m => (
          <div key={m.id} className="msg-item" onClick={() => router.push(`/admin/messages?creator=${m.sender_id}`)}>
            <div className="msg-avatar">{(m.profiles?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div className="msg-content">
              <div className="msg-name">{m.profiles?.full_name || 'Unknown'}</div>
              <div className="msg-preview">{m.content}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div className="msg-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="unread-dot" />
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
