import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function initials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function AdminMessages() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [adminId, setAdminId] = useState(null)
  const [creators, setCreators] = useState([])
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [unreadMap, setUnreadMap] = useState({})
  const [newMsgAlert, setNewMsgAlert] = useState(null)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)
  const selectedCreatorRef = useRef(null)

  useEffect(() => { selectedCreatorRef.current = selectedCreator }, [selectedCreator])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'admin') { router.push('/'); return; }
      setProfile(prof)
      setAdminId(user.id)

      const { data: creatorsData } = await supabase.from('profiles').select('*').eq('role', 'creator').order('full_name')
      setCreators(creatorsData || [])

      // Get unread counts per creator
      const { data: unread } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('recipient_id', user.id)
        .eq('read', false)

      const map = {}
      unread?.forEach(m => { map[m.sender_id] = (map[m.sender_id] || 0) + 1 })
      setUnreadMap(map)

      // Auto-select from query param
      const creatorId = router.query.creator
      if (creatorId && creatorsData) {
        const found = creatorsData.find(c => c.id === creatorId)
        if (found) {
          setSelectedCreator(found)
          selectedCreatorRef.current = found
          await loadThread(user.id, creatorId)
          setUnreadMap(prev => { const next = { ...prev }; delete next[creatorId]; return next })
        }
      }

      // Real-time subscription for ALL incoming messages
      channelRef.current = supabase
        .channel(`admin-messages-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        }, async (payload) => {
          const msg = payload.new
          const current = selectedCreatorRef.current

          if (current && msg.sender_id === current.id) {
            // Currently viewing this thread — add message in real time
            setMessages(prev => {
              const exists = prev.find(m => m.id === msg.id)
              if (exists) return prev
              return [...prev, msg]
            })
            await supabase.from('messages').update({ read: true }).eq('id', msg.id)
          } else {
            // Different thread — show unread badge
            setUnreadMap(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }))
            const sender = creatorsData?.find(c => c.id === msg.sender_id)
            setNewMsgAlert(sender?.full_name || 'Someone')
            setTimeout(() => setNewMsgAlert(null), 4000)
          }
        })
        .subscribe()

      setLoading(false)
    }
    load()

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [router.query.creator])

  async function loadThread(adminUid, creatorId) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${adminUid},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${adminUid})`)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])
    await supabase.from('messages').update({ read: true }).eq('recipient_id', adminUid).eq('sender_id', creatorId).eq('read', false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectCreator(creator) {
    setSelectedCreator(creator)
    selectedCreatorRef.current = creator
    await loadThread(adminId, creator.id)
    setUnreadMap(prev => { const next = { ...prev }; delete next[creator.id]; return next })
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedCreator || !adminId) return
    const content = newMessage.trim()
    setNewMessage('')
    const { data } = await supabase.from('messages').insert({
      sender_id: adminId,
      recipient_id: selectedCreator.id,
      content,
      read: false
    }).select().single()
    if (data) setMessages(prev => [...prev, data])
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0)

  return (
    <AdminLayout profile={profile} title={`Messages${totalUnread > 0 ? ` (${totalUnread})` : ''}`}>

      {/* New message toast notification */}
      {newMsgAlert && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 50,
          background: 'var(--text)', color: 'var(--bg)', padding: '12px 16px',
          borderRadius: '10px', fontSize: '13px', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease', cursor: 'pointer'
        }}>
          💬 New message from {newMsgAlert}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', height: 'calc(100vh - 140px)' }}>
        {/* Creator list */}
        <div className="card" style={{ overflow: 'auto', marginBottom: 0 }}>
          <div className="card-header"><span className="card-title">Creators</span></div>
          {creators.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text3)', fontSize: '13px' }}>No creators yet.</div>
          ) : creators.map(c => (
            <div
              key={c.id}
              className="msg-item"
              style={{ background: selectedCreator?.id === c.id ? 'var(--accent-dim)' : '' }}
              onClick={() => selectCreator(c)}
            >
              <div className="msg-avatar" style={{ position: 'relative' }}>
                {initials(c.full_name)}
                {unreadMap[c.id] > 0 && (
                  <div style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: 'var(--text)', color: 'var(--bg)',
                    fontSize: '9px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {unreadMap[c.id]}
                  </div>
                )}
              </div>
              <div className="msg-content">
                <div className="msg-name" style={{ fontWeight: unreadMap[c.id] ? 700 : 500 }}>{c.full_name}</div>
                <div className="msg-preview">{c.instagram_handle || c.email}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Thread */}
        <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
          {!selectedCreator ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Select a creator to view messages
            </div>
          ) : (
            <>
              <div className="card-header">
                <div className="name-cell">
                  <div className="msg-avatar">{initials(selectedCreator.full_name)}</div>
                  <div>
                    <div className="cell-main">{selectedCreator.full_name}</div>
                    <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}></span>
                      Live chat
                    </div>
                  </div>
                </div>
              </div>
              <div className="thread-messages" style={{ flex: 1 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginTop: '40px' }}>No messages yet.</div>
                )}
                {messages.map(m => {
                  const isOut = m.sender_id === adminId
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
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={`Message ${selectedCreator.full_name}...`} />
                <button type="submit" className="btn btn-primary">Send</button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </AdminLayout>
  )
}
