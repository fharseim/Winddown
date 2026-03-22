import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

export default function AdminLogin() {
  const { signIn, demoMode } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // In demo mode there's no auth — skip straight to dashboard
  useEffect(() => {
    if (demoMode) navigate('/admin', { replace: true })
  }, [demoMode, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/admin')
    }
  }

  if (demoMode) return null

  return (
    <div className="min-h-screen bg-rise-bg flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-serif text-rise-dark tracking-logo text-3xl uppercase">Rise</span>
          <p className="font-sans text-rise-muted text-sm mt-2">Admin-Bereich</p>
        </div>

        <div className="bg-white rounded-xl border border-rise-border p-8 shadow-sm">
          <h1 className="font-sans font-medium text-rise-dark text-lg mb-6">Anmelden</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-sm font-medium text-rise-dark mb-1.5">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full font-sans text-sm text-rise-dark bg-rise-bg border border-rise-border rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rise-dark transition-colors"
                placeholder="admin@risestartup.eu"
              />
            </div>

            <div>
              <label className="block font-sans text-sm font-medium text-rise-dark mb-1.5">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full font-sans text-sm text-rise-dark bg-rise-bg border border-rise-border rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rise-dark transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="font-sans text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rise-dark text-white font-sans font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-rise-dark/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
