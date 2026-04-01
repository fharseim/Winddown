import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const s = {
  shell:   { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 220, background: '#0f172a', color: '#e2e8f0', padding: '32px 0', display: 'flex', flexDirection: 'column' },
  logo:    { padding: '0 24px 32px', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  nav:     { flex: 1 },
  link:    { display: 'block', padding: '10px 24px', color: '#94a3b8', textDecoration: 'none', fontSize: 14 },
  active:  { color: '#fff', background: '#1e293b' },
  main:    { flex: 1, padding: 40, maxWidth: 900 },
  signout: { padding: '0 24px 24px', marginTop: 'auto' },
  btn:     { background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, width: '100%' },
}

export default function DashboardLayout() {
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const linkStyle = ({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.logo}>hrauszug.io</div>
        <nav style={s.nav}>
          <NavLink to="/dashboard"        end style={linkStyle}>Übersicht</NavLink>
          <NavLink to="/dashboard/keys"       style={linkStyle}>API-Keys</NavLink>
          <NavLink to="/dashboard/billing"    style={linkStyle}>Abonnement</NavLink>
          <NavLink to="/docs"                 style={linkStyle}>Dokumentation</NavLink>
        </nav>
        <div style={s.signout}>
          <button style={s.btn} onClick={signOut}>Abmelden</button>
        </div>
      </aside>
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  )
}
