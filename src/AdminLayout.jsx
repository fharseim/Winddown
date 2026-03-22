import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

const navItems = [
  { to: '/admin', label: 'Übersicht', end: true },
  { to: '/admin/cases', label: 'Cases' },
  { to: '/admin/einstellungen', label: 'Einstellungen' },
]

export default function AdminLayout({ children }) {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen bg-rise-bg flex items-center justify-center">
        <span className="font-sans text-sm text-rise-muted">Laden…</span>
      </div>
    )
  }

  if (!user) {
    navigate('/admin/login')
    return null
  }

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-rise-dark flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="font-serif text-white tracking-logo text-xl uppercase">Rise</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg font-sans text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-3 py-2 rounded-lg font-sans text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-rise-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div />
          <span className="font-sans text-xs font-medium text-white bg-rise-muted px-2.5 py-1 rounded-full uppercase tracking-wide">
            Admin
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 bg-rise-bg overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
