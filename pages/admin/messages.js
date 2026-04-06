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
  const bottomRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'admin') { router.push('/'); return; }
      setProfile(prof)
      setAdminId(user.id)

      // Get creators who have messaged or been messaged
      const { data: creatorsData } = await supabase.from('profiles').select('*').eq('role', 'creator').order('full_name')
      setCreators(creatorsData || [])

      // Auto-select from query param
      const creatorId = router.query.creator
      if (creatorId && creatorsData) {
        const found = creatorsData.find(c => c.id === creatorId)
        if (found) {
          setSelectedCreator(found)
          await loadThread(user.id, creatorId)
        }
      }
      setLoading(false)
    }
    load()
  }, [router.query.creator])

  async function loadThread(adminUid, creatorId) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${adminUid},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${adminUid})`)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])
    // Mark as read
    await supabase.from('messages').update({ read: true }).eq('recipient_id', adminUid).eq('sender_id', creatorId).eq('read', false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectCreator(creator) {
    setSelectedCreator(creator)
    await loadThread(adminId, creator.id)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedCreator || !adminId) return
    const { data } = await supabase.from('messages').insert({
      sender_id: adminId,
      recipient_id: selectedCreator.id,
      content: newMessage.trim(),
      read: false
    }).select().single()
    if (data) setMessages(prev => [...prev, data])
    setNewMessage('')
  }

  if (loading) return <div className="loading-screen">Loading...</div>

  return (
    <AdminLayout profile={profile} title="Messages">
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', height: 'calc(100vh - 140px)' }}>
        {/* Creator list */}
        <div className="card" style={{ overflow: 'auto', marginBottom: 0 }}>
          <div className="card-header"><span className="card-title">Creators</span></div>
          {creators.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text3)', fontSize: '13px' }}>No creators yet.</div>
          ) : creators.map(c => (
            <div key={c.id} className="msg-item" style={{ background: selectedCreator?.id === c.id ? 'var(--accent-dim)' : '' }} onClick={() => selectCreator(c)}>
              <div className="msg-avatar">{initials(c.full_name)}</div>
              <div className="msg-content">
                <div className="msg-name">{c.full_name}</div>
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
                  <div><div className="cell-main">{selectedCreator.full_name}</div><div className="cell-sub">{selectedCreator.instagram_handle || selectedCreator.email}</div></div>
                </div>
              </div>
              <div className="thread-messages" style={{ flex: 1 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginTop: '40px' }}>No messages yet. Send one to get started.</div>
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
    </AdminLayout>
  )
}
