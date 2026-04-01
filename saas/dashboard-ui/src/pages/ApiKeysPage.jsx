import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const s = {
  h1:     { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub:    { color: '#64748b', fontSize: 14, marginBottom: 32 },
  row:    { display: 'flex', gap: 12, marginBottom: 24 },
  input:  { flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14 },
  btn:    { padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  table:  { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  th:     { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' },
  td:     { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid #f9fafb' },
  mono:   { fontFamily: 'monospace', fontSize: 13, background: '#f1f5f9', padding: '3px 7px', borderRadius: 4 },
  revoke: { background: 'none', border: '1px solid #e2e8f0', color: '#ef4444', padding: '5px 12px', borderRadius: 5, fontSize: 13, cursor: 'pointer' },
  modal:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  mbox:   { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, width: '90%' },
  mh2:    { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  msub:   { fontSize: 14, color: '#64748b', marginBottom: 20 },
  mkey:   { fontFamily: 'monospace', fontSize: 13, background: '#f1f5f9', padding: '12px 16px', borderRadius: 6, wordBreak: 'break-all', marginBottom: 20 },
  mcopy:  { padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', marginRight: 8 },
  mclose: { padding: '10px 20px', background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([])
  const [label, setLabel] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    const data = await api.listKeys()
    setKeys(data)
  }

  useEffect(() => { load() }, [])

  async function create() {
    setLoading(true)
    try {
      const { key, record } = await api.createKey(label)
      setNewKey(key)
      setLabel('')
      load()
    } finally {
      setLoading(false)
    }
  }

  async function revoke(id) {
    if (!confirm('API-Key wirklich widerrufen?')) return
    await api.revokeKey(id)
    load()
  }

  return (
    <div>
      <div style={s.h1}>API-Keys</div>
      <div style={s.sub}>Erstelle Keys für deine Anwendungen. Der Plaintext wird nur einmal angezeigt.</div>

      <div style={s.row}>
        <input style={s.input} placeholder="Label (z.B. production)" value={label} onChange={e => setLabel(e.target.value)} />
        <button style={s.btn} onClick={create} disabled={loading}>{loading ? 'Erstelle…' : '+ Key erstellen'}</button>
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Label</th>
            <th style={s.th}>Key (Prefix)</th>
            <th style={s.th}>Erstellt</th>
            <th style={s.th}>Zuletzt genutzt</th>
            <th style={s.th}></th>
          </tr>
        </thead>
        <tbody>
          {keys.filter(k => k.is_active).map(k => (
            <tr key={k.id}>
              <td style={s.td}>{k.label || '—'}</td>
              <td style={s.td}><span style={s.mono}>{k.key_prefix}…</span></td>
              <td style={s.td}>{new Date(k.created_at).toLocaleDateString('de-DE')}</td>
              <td style={s.td}>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('de-DE') : '—'}</td>
              <td style={s.td}><button style={s.revoke} onClick={() => revoke(k.id)}>Widerrufen</button></td>
            </tr>
          ))}
          {keys.filter(k => k.is_active).length === 0 && (
            <tr><td colSpan={5} style={{ ...s.td, color: '#94a3b8', textAlign: 'center' }}>Noch keine aktiven Keys.</td></tr>
          )}
        </tbody>
      </table>

      {newKey && (
        <div style={s.modal}>
          <div style={s.mbox}>
            <div style={s.mh2}>API-Key erstellt</div>
            <div style={s.msub}>Kopiere den Key jetzt — er wird nicht erneut angezeigt.</div>
            <div style={s.mkey}>{newKey}</div>
            <button style={s.mcopy} onClick={() => navigator.clipboard.writeText(newKey)}>Kopieren</button>
            <button style={s.mclose} onClick={() => setNewKey(null)}>Schließen</button>
          </div>
        </div>
      )}
    </div>
  )
}
