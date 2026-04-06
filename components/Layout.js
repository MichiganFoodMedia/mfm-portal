import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

function initials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function Layout({ children, user, profile, navItems, title }) {
  const router = useRouter()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">Michigan Food Media</div>
          <div className="sidebar-logo-sub">{profile?.role === 'admin' ? 'Admin Panel' : 'Creator Portal'}</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${router.pathname === item.href ? 'active' : ''}`}
            >
              <span style={{ fontSize: '15px' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </Link>
          ))}
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
          <div className="topbar-title">{title}</div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
