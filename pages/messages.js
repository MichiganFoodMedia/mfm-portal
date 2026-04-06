import { useEffect, useState, useRef } from 'react'
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

export default function Messages() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [adminId, setAdminId] = useState(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role === 'admin') { router.push('/'); return; }
      setProfile(prof)

      // Get admin
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1)
      const aid = admins?.[0]?.id
      setAdminId(aid)

      // Load messages between creator and admin
      if (aid) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${aid}),and(sender_id.eq.${aid},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true })
        setMessages(msgs || [])

        // Mark incoming as read
        await supabase.from('messages').update({ read: true })
          .eq('recipient_id', user.id).eq('sender_id', aid).eq('read', false)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !adminId || !profile) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: adminId,
      content: newMessage.trim(),
      read: false
    }).select().single()
    if (data) setMessages(prev => [...prev, data])
    setNewMessage('')
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <Layout profile={profile} navItems={NAV} title="Messages">
      <div className="card" style={{ maxWidth: '700px' }}>
        <div className="card-header">
          <div className="name-cell">
            <div className="msg-avatar">MF</div>
            <div>
              <div className="cell-main">Michigan Food Media</div>
              <div className="cell-sub">Agency Support</div>
            </div>
          </div>
        </div>
        <div className="thread-wrap">
          <div className="thread-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginTop: '40px' }}>
                No messages yet. Send us a message!
              </div>
            )}
            {messages.map(m => {
              const isOut = m.sender_id === profile?.id || (profile && m.sender_id !== adminId)
              return (
                <div key={m.id} className={`bubble-wrap ${isOut ? 'out' : 'in'}`}>
                  <div className={`bubble ${isOut ? 'out' : 'in'}`}>{m.content}</div>
                  <div className="bubble-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <form className="thread-input" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Message the agency..."
            />
            <button type="submit" className="btn btn-primary">Send</button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
