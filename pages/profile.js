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

function initials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function Profile() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role === 'admin') { router.push('/'); return; }
      setProfile(prof)
      setForm(prof)
      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({
      full_name: form.full_name,
      instagram_handle: form.instagram_handle,
      tiktok_handle: form.tiktok_handle,
      location: form.location,
      phone: form.phone,
      rate: parseInt(form.rate) || 0,
      travel_radius: parseInt(form.travel_radius) || 50,
    }).eq('id', user.id)
    setProfile({ ...profile, ...form })
    setSaving(false)
    setEditing(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <Layout profile={profile} navItems={NAV} title="My Profile">
      {success && <div className="alert alert-success" style={{ maxWidth: '540px' }}>Profile updated successfully!</div>}
      {editing ? (
        <form onSubmit={saveProfile} style={{ maxWidth: '540px' }}>
          <div className="profile-section">
            <div className="profile-section-title">Edit Profile</div>
            <div className="form-field"><label>Full Name</label><input value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="form-field"><label>Instagram Handle</label><input value={form.instagram_handle || ''} onChange={e => setForm({ ...form, instagram_handle: e.target.value })} /></div>
            <div className="form-field"><label>TikTok Handle</label><input value={form.tiktok_handle || ''} onChange={e => setForm({ ...form, tiktok_handle: e.target.value })} /></div>
            <div className="form-field"><label>Location</label><input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div className="form-field"><label>Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-field"><label>Rate per Collab ($)</label><input type="number" value={form.rate || ''} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
            <div className="form-field"><label>Travel Radius (miles)</label><input type="number" value={form.travel_radius || ''} onChange={e => setForm({ ...form, travel_radius: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div style={{ maxWidth: '540px' }}>
          <div className="profile-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div className="avatar" style={{ width: '52px', height: '52px', fontSize: '16px' }}>{initials(profile?.full_name)}</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile?.full_name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{profile?.instagram_handle || 'No handle set'}</div>
              </div>
            </div>
            <div className="profile-section-title">Contact Info</div>
            <div className="profile-row"><span>Email</span><span className="profile-val">{profile?.email}</span></div>
            <div className="profile-row"><span>Phone</span><span className="profile-val">{profile?.phone || '—'}</span></div>
            <div className="profile-row"><span>Location</span><span className="profile-val">{profile?.location || '—'}</span></div>
          </div>
          <div className="profile-section">
            <div className="profile-section-title">Creator Details</div>
            <div className="profile-row"><span>Instagram</span><span className="profile-val">{profile?.instagram_handle || '—'}</span></div>
            <div className="profile-row"><span>TikTok</span><span className="profile-val">{profile?.tiktok_handle || '—'}</span></div>
            <div className="profile-row"><span>Travel Radius</span><span className="profile-val">{profile?.travel_radius || 50} miles</span></div>
            <div className="profile-row"><span>Rate per Collab</span><span className="profile-val">${profile?.rate || 0}</span></div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        </div>
      )}
    </Layout>
  )
}
