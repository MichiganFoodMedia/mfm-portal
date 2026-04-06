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

export default function Messages() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [adminId, setAdminId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newMsgAlert, setNewMsgAlert] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return; }
      setUserId(user.id)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role === 'admin') { router.push('/'); return; }
      setProfile(prof)

      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1)
      const aid = admins?.[0]?.id
      setAdminId(aid)

      if (aid) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${aid}),and(sender_id.eq.${aid},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true })
        setMessages(msgs || [])

        await supabase.from('messages').update({ read: true })
          .eq('recipient_id', user.id).eq('sender_id', aid).eq('read', false)

        // Real-time subscription
        channelRef.current = supabase
          .channel(`messages-creator-${user.id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`
          }, async (payload) => {
            const msg = payload.new
            setMessages(prev => {
              const exists = prev.find(m => m.id === msg.id)
              if (exists) return prev
              return [...prev, msg]
            })
            setNewMsgAlert(true)
            setTimeout(() => setNewMsgAlert(false), 3000)
            await supabase.from('messages').update({ read: true }).eq('id', msg.id)
          })
          .subscribe()
      }

      setLoading(false)
    }
    load()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !adminId || !userId) return
    const content = newMessage.trim()
    setNewMessage('')
    const { data } = await supabase.from('messages').insert({
      sender_id: userId,
      recipient_id: adminId,
      content,
      read: false
    }).select().single()
    if (data) setMessages(prev => [...prev, data])
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <Layout profile={profile} navItems={NAV} title="Messages">
      {newMsgAlert && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 50,
          background: 'var(--green)', color: '#000', padding: '10px 16px',
          borderRadius: '8px', fontSize: '13px', fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          New message from Michigan Food Media!
        </div>
      )}

      <div className="card" style={{ maxWidth: '700px' }}>
        <div className="card-header">
          <div className="name-cell">
            <div className="msg-avatar" style={{ background: 'var(--bg4)' }}>MF</div>
            <div>
              <div className="cell-main">Michigan Food Media</div>
              <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}></span>
                Live chat
              </div>
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
              const isOut = m.sender_id === userId
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

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Layout>
  )
}
