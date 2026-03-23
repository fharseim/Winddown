import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

const CASES_COUNT = 6

const navItems = [
  { to: '/admin', label: 'Übersicht', end: true },
  { to: '/admin/cases', label: 'Cases', badge: CASES_COUNT },
  { to: '/admin/einstellungen', label: 'Einstellungen' },
]

export default function AdminLayout({ children }) {
  const { user, loading, signOut, demoMode } = useAuth()
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
      <aside className="w-64 bg-[#1C1917] flex flex-col flex-shrink-0">
        <div className="px-7 py-6 border-b border-white/8">
          <span className="font-serif text-white tracking-logo text-2xl uppercase">Rise</span>
          <span className="ml-2.5 font-sans text-white/40 text-xs uppercase tracking-widest">Admin</span>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl font-sans text-[15px] transition-all duration-200 ${
                  isActive
                    ? 'bg-rise-coral/20 text-rise-coral font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full font-medium">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-white/8">
          {demoMode && (
            <div className="flex items-center gap-1.5 px-4 py-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="font-sans text-xs text-white/40">Demo-Modus</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-3 rounded-xl font-sans text-[15px] text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-rise-border px-8 flex items-center justify-between flex-shrink-0">
          <span className="font-serif text-rise-dark text-lg tracking-wide">Rise Admin</span>
          <div className="flex items-center gap-3">
            {demoMode && (
              <span className="font-sans text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                Demo
              </span>
            )}
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 bg-rise-bg overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
