import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const BASE = import.meta.env.VITE_SAAS_API_URL

const FIXED_DOCS = [
  { type: 'AD',  label: 'Aktueller Abdruck' },
  { type: 'CD',  label: 'Chronologischer Abdruck' },
  { type: 'DK',  docId: 'satzung',             label: 'Satzung / Gesellschaftsvertrag' },
  { type: 'DK',  docId: 'gesellschafterliste', label: 'Gesellschafterliste' },
]

const s = {
  h1:       { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub:      { color: '#64748b', fontSize: 14, marginBottom: 32 },

  // Search
  searchWrap: { position: 'relative', maxWidth: 560, marginBottom: 32 },
  searchInput:{ width: '100%', padding: '12px 16px', fontSize: 16, borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  dropdown:   { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' },
  dropItem:   (active) => ({ padding: '12px 16px', cursor: 'pointer', background: active ? '#f8fafc' : '#fff', borderBottom: '1px solid #f1f5f9' }),
  dropName:   { fontSize: 14, fontWeight: 600, marginBottom: 2 },
  dropMeta:   { fontSize: 12, color: '#64748b' },
  searching:  { padding: '12px 16px', fontSize: 13, color: '#94a3b8' },

  // Company card
  companyCard:{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 700 },
  companyName:{ fontSize: 18, fontWeight: 700, marginBottom: 4 },
  companyMeta:{ fontSize: 13, color: '#64748b' },
  changeBtn:  { background: 'none', border: '1px solid #e2e8f0', padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#64748b' },

  // Documents
  docsWrap:   { maxWidth: 700 },
  docsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  docsTitle:  { fontSize: 16, fontWeight: 600 },
  dlAllBtn:   { padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  docList:    { display: 'flex', flexDirection: 'column', gap: 10 },
  docItem:    { background: '#fff', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  docInfo:    {},
  docType:    { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  docLabel:   { fontSize: 13, color: '#64748b' },
  dlBtn:      (loading) => ({ padding: '8px 16px', background: loading ? '#f1f5f9' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, cursor: loading ? 'default' : 'pointer', color: loading ? '#94a3b8' : '#0f172a', fontWeight: 500, minWidth: 110, textAlign: 'center' }),

  loading:    { color: '#94a3b8', fontSize: 14 },
  err:        { padding: '12px 16px', background: '#fef2f2', borderRadius: 6, color: '#dc2626', fontSize: 14, marginBottom: 16 },
}

async function authFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${session?.access_token}`, ...opts.headers },
  })
}

export default function DownloadPage() {
  const location = useLocation()
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [showDrop, setShowDrop]     = useState(false)
  const [selected, setSelected]     = useState(null)
  const [downloading, setDownloading] = useState({})
  const [error, setError]           = useState('')
  const debounceRef = useRef(null)
  const wrapRef = useRef(null)

  // Preselect company navigated from DashboardHome
  useEffect(() => {
    const pre = location.state?.preselect
    if (pre) selectCompany({ register_art: pre.register_art, register_nummer: pre.register_nummer, register_gericht: pre.register_gericht, firma_name: `${pre.register_art} ${pre.register_nummer}`, sitz: pre.register_gericht })
  }, []) // eslint-disable-line

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleQueryChange(e) {
    const q = e.target.value
    setQuery(q)
    setShowDrop(true)
    clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => doSearch(q), 350)
  }

  async function doSearch(q) {
    setSearching(true)
    setError('')
    try {
      const res = await authFetch(`/dashboard/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.results || [])
      setResults(list)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function selectCompany(company) {
    setSelected(company)
    setQuery(company.firma_name)
    setShowDrop(false)
    setResults([])
    setError('')
  }

  async function downloadDoc(doc) {
    if (!selected) return
    const key = doc.docId ? `${doc.type}:${doc.docId}` : doc.type
    setDownloading(d => ({ ...d, [key]: true }))
    try {
      const params = new URLSearchParams({
        registerArt:     selected.register_art,
        registerNummer:  selected.register_nummer,
        registerGericht: selected.register_gericht,
        docType:         doc.type,
        ...(doc.docId ? { docId: doc.docId } : {}),
      })
      const res = await authFetch(`/dashboard/download?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected.register_art}_${selected.register_nummer}_${key}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(d => ({ ...d, [key]: false }))
    }
  }

  async function downloadAll() {
    for (const doc of FIXED_DOCS) {
      await downloadDoc(doc)
    }
  }

  return (
    <div>
      <div style={s.h1}>Dokumente abrufen</div>
      <div style={s.sub}>Gesellschaft suchen, Dokumente auswählen und herunterladen</div>

      {error && <div style={s.err}>{error}</div>}

      {/* ── Step 1: Search ── */}
      {!selected && (
        <div style={s.searchWrap} ref={wrapRef}>
          <input
            style={s.searchInput}
            placeholder="Gesellschaft suchen, z.B. Mustermann GmbH"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => query.length >= 2 && setShowDrop(true)}
            autoFocus
          />
          {showDrop && (searching || results.length > 0) && (
            <div style={s.dropdown}>
              {searching && <div style={s.searching}>Suche läuft…</div>}
              {!searching && results.map((r, i) => (
                <div key={i} style={s.dropItem(false)} onMouseDown={() => selectCompany(r)}>
                  <div style={s.dropName}>{r.firma_name}</div>
                  <div style={s.dropMeta}>{r.register_art} {r.register_nummer} · {r.register_gericht} · {r.sitz} · <span style={{ color: r.status === 'aktiv' ? '#16a34a' : '#dc2626' }}>{r.status}</span></div>
                </div>
              ))}
              {!searching && results.length === 0 && query.length >= 2 && (
                <div style={s.searching}>Keine Treffer</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Selected company ── */}
      {selected && (
        <>
          <div style={s.companyCard}>
            <div>
              <div style={s.companyName}>{selected.firma_name}</div>
              <div style={s.companyMeta}>{selected.register_art} {selected.register_nummer} · {selected.register_gericht} · {selected.sitz}</div>
            </div>
            <button style={s.changeBtn} onClick={() => { setSelected(null); setQuery('') }}>
              Ändern
            </button>
          </div>

          {/* ── Step 3: Documents ── */}
          <div style={s.docsWrap}>
            <div style={s.docsHeader}>
              <div style={s.docsTitle}>{FIXED_DOCS.length} Dokumente verfügbar</div>
              <button style={s.dlAllBtn} onClick={downloadAll}>
                Alle herunterladen
              </button>
            </div>
            <div style={s.docList}>
              {FIXED_DOCS.map(doc => {
                const key = doc.docId ? `${doc.type}:${doc.docId}` : doc.type
                return (
                  <div key={key} style={s.docItem}>
                    <div style={s.docInfo}>
                      <div style={s.docType}>{doc.type}{doc.docId ? ` · ${doc.docId}` : ''}</div>
                      <div style={s.docLabel}>{doc.label}</div>
                    </div>
                    <button
                      style={s.dlBtn(downloading[key])}
                      onClick={() => downloadDoc(doc)}
                      disabled={downloading[key]}
                    >
                      {downloading[key] ? 'Lädt…' : 'Herunterladen'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
