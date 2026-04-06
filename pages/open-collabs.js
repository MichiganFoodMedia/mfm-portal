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

export default function OpenCollabs() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [collabs, setCollabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(null)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role === 'admin') { router.push('/'); return; }
      setProfile(prof)

      const { data } = await supabase
        .from('collaborations')
        .select('*, restaurants(name, location, cuisine)')
        .eq('status', 'open')
        .is('creator_id', null)
        .order('collab_date', { ascending: true })
      setCollabs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function requestCollab(collabId) {
    setRequesting(collabId)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('collaborations').update({
      creator_id: user.id,
      status: 'pending'
    }).eq('id', collabId)
    setCollabs(prev => prev.filter(c => c.id !== collabId))
    setSuccess('Request sent! The agency will confirm your spot shortly.')
    setRequesting(null)
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <Layout profile={profile} navItems={NAV} title="Open Collabs">
      <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px' }}>
        Browse available collaborations. Requests require admin approval before being confirmed.
      </p>

      {success && <div className="alert alert-success">{success}</div>}

      {collabs.length === 0 ? (
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            No open collaborations right now. Check back soon!
          </div>
        </div>
      ) : (
        <div className="collab-cards">
          {collabs.map(c => (
            <div key={c.id} className="collab-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="badge badge-blue">{c.platform}</span>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{c.collab_date || 'TBD'}</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{c.restaurants?.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>{c.restaurants?.location}</div>
              {c.deliverables && (
                <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5', marginBottom: '14px' }}>{c.deliverables}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)' }}>${c.creator_pay}</span>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>per collab</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => requestCollab(c.id)}
                disabled={requesting === c.id}
              >
                {requesting === c.id ? 'Requesting...' : 'Request This Slot'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
