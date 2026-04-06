import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
 
const NAV = [
  { href: '/admin/dashboard', icon: '◼', label: 'Dashboard' },
  { href: '/admin/collabs', icon: '◈', label: 'Collaborations' },
  { href: '/admin/creators', icon: '◉', label: 'Creators' },
  { href: '/admin/restaurants', icon: '◆', label: 'Restaurants' },
  { href: '/admin/messages', icon: '◧', label: 'Messages' },
  { href: '/admin/codes', icon: '◫', label: 'Invite Codes' },
]
 
function initials(name) {
  if (!name) return 'AD'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}
 
export default function AdminLayout({ children, profile, title, actions }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
 
  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }
 
  function closeMenu() { setMenuOpen(false) }
 
  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={closeMenu} />
      <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">Michigan Food Media</div>
          <div className="sidebar-logo-sub">Admin Panel</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${router.pathname === item.href ? 'active' : ''}`} onClick={closeMenu}>
              <span style={{ fontSize: '15px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill" onClick={signOut} title="Sign out">
            <div className="avatar">{initials(profile?.full_name)}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{profile?.full_name || 'Admin'}</div>
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
          {actions && <div style={{ display: 'flex', gap: '10px' }}>{actions}</div>}
        </div>
        <div className="page-content">{children}</div>
      </div>
    </div>
  )
}
 
