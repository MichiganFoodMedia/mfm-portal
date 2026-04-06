import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function initials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function Layout({ children, user, profile, navItems, title }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const channelRef = useRef(null)

  useEffect(() => {
    async function loadUnread() {
      if (!profile?.id) return

      // Get admin id
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1)
      const adminId = admins?.[0]?.id
      if (!adminId) return

      // Count unread messages from admin
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .eq('sender_id', adminId)
        .eq('read', false)

      setUnreadCount(count || 0)

      // Real-time: listen for new messages
      channelRef.current = supabase
        .channel(`nav-unread-${profile.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${profile.id}`
        }, () => {
          setUnreadCount(prev => prev + 1)
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${profile.id}`
        }, () => {
          // Refresh unread count when messages marked as read
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', profile.id)
            .eq('read', false)
            .then(({ count }) => setUnreadCount(count || 0))
        })
        .subscribe()
    }

    loadUnread()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [profile?.id])

  // Reset unread when visiting messages page
  useEffect(() => {
    if (router.pathname === '/messages') {
      setUnreadCount(0)
    }
  }, [router.pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function closeMenu() { setMenuOpen(false) }

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={closeMenu} />
      <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">Michigan Food Media</div>
          <div className="sidebar-logo-sub">Creator Portal</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => {
            const isMessages = item.href === '/messages'
            const showDot = isMessages && unreadCount > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${router.pathname === item.href ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span style={{ fontSize: '15px', position: 'relative', display: 'inline-flex' }}>
                  {item.icon}
                  {showDot && (
                    <span style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--red)',
                      border: '1.5px solid var(--bg2)',
                      display: 'block'
                    }} />
                  )}
                </span>
                <span>{item.label}</span>
                {showDot && (
                  <span style={{
                    marginLeft: 'auto',
                    background: 'var(--red)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '20px',
                    minWidth: '18px',
                    textAlign: 'center'
                  }}>
                    {unreadCount}
                  </span>
                )}
                {!showDot && item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill" onClick={signOut} title="Sign out">
            <div className="avatar">{initials(profile?.full_name)}</div>
            <div>
              <div className="user-name" style={{ fontSize: '13px', fontWeight: 500 }}>{profile?.full_name || 'User'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Sign out</div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>☰</button>
            <div className="topbar-title">{title}</div>
          </div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
