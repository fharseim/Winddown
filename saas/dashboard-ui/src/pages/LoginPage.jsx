import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const s = {
  page:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' },
  card:   { background: '#fff', borderRadius: 12, padding: 40, width: 380, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  logo:   { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub:    { color: '#64748b', fontSize: 14, marginBottom: 32 },
  label:  { fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 },
  input:  { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' },
  btn:    { width: '100%', marginTop: 16, padding: '11px 0', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  notice: { marginTop: 16, fontSize: 13, color: '#16a34a', textAlign: 'center' },
  err:    { marginTop: 16, fontSize: 13, color: '#dc2626', textAlign: 'center' },
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>hrauszug.io</div>
        <div style={s.sub}>Handelsregister-Dokumente per API</div>
        {sent ? (
          <div style={s.notice}>Magic Link gesendet — bitte E-Mail prüfen.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={s.label}>E-Mail-Adresse</label>
            <input
              style={s.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@firma.de"
              required
            />
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Senden…' : 'Magic Link senden'}
            </button>
            {error && <div style={s.err}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  )
}
