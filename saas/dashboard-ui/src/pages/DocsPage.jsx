import { Link } from 'react-router-dom'

const s = {
  page:  { maxWidth: 760, margin: '0 auto', padding: '60px 24px' },
  nav:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 },
  logo:  { fontSize: 18, fontWeight: 700, textDecoration: 'none', color: '#0f172a' },
  back:  { fontSize: 14, color: '#64748b', textDecoration: 'none' },
  h1:    { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub:   { color: '#64748b', marginBottom: 48 },
  h2:    { fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 },
  p:     { fontSize: 15, lineHeight: 1.7, color: '#374151', marginBottom: 16 },
  code:  { background: '#f1f5f9', borderRadius: 8, padding: 20, fontFamily: 'monospace', fontSize: 13, overflowX: 'auto', marginBottom: 24, whiteSpace: 'pre' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 24 },
  th:    { textAlign: 'left', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td:    { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  mono:  { fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 3 },
}

const BASE = 'https://api.hrauszug.io'

export default function DocsPage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>hrauszug.io</Link>
        <Link to="/dashboard" style={s.back}>← Dashboard</Link>
      </nav>

      <div style={s.h1}>API-Dokumentation</div>
      <div style={s.sub}>Handelsregister-Dokumente per HTTP abrufen</div>

      <div style={s.h2}>Authentifizierung</div>
      <p style={s.p}>Alle Requests benötigen deinen API-Key im <code>Authorization</code>-Header:</p>
      <pre style={s.code}>{`Authorization: Bearer hra_live_...`}</pre>

      <div style={s.h2}>Endpunkte</div>

      <div style={s.h2}>GET /v1/search</div>
      <p style={s.p}>Suche nach Unternehmen im Handelsregister.</p>
      <pre style={s.code}>{`curl "${BASE}/v1/search?q=Mustermann+GmbH" \\
  -H "Authorization: Bearer hra_live_..."`}</pre>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Parameter</th><th style={s.th}>Typ</th><th style={s.th}>Beschreibung</th></tr></thead>
        <tbody>
          <tr><td style={s.td}><span style={s.mono}>q</span></td><td style={s.td}>string</td><td style={s.td}>Suchbegriff (Firmenname)</td></tr>
          <tr><td style={s.td}><span style={s.mono}>registerArt</span></td><td style={s.td}>string</td><td style={s.td}>HRB, HRA, GnR, VR (optional)</td></tr>
          <tr><td style={s.td}><span style={s.mono}>registerNummer</span></td><td style={s.td}>string</td><td style={s.td}>Registernummer (optional)</td></tr>
          <tr><td style={s.td}><span style={s.mono}>registerGericht</span></td><td style={s.td}>string</td><td style={s.td}>Registergericht, z.B. "Kiel" (optional)</td></tr>
        </tbody>
      </table>

      <div style={s.h2}>GET /v1/documents</div>
      <p style={s.p}>Verfügbare Dokumente für ein Unternehmen abfragen.</p>
      <pre style={s.code}>{`curl "${BASE}/v1/documents?registerArt=HRB&registerNummer=25133&registerGericht=Kiel" \\
  -H "Authorization: Bearer hra_live_..."`}</pre>

      <div style={s.h2}>GET /v1/download</div>
      <p style={s.p}>Dokument als PDF herunterladen. Primärer Billing-Endpunkt.</p>
      <pre style={s.code}>{`curl "${BASE}/v1/download?registerArt=HRB&registerNummer=25133&registerGericht=Kiel&docType=AD" \\
  -H "Authorization: Bearer hra_live_..." \\
  -o dokument.pdf`}</pre>
      <table style={s.table}>
        <thead><tr><th style={s.th}>docType</th><th style={s.th}>Beschreibung</th></tr></thead>
        <tbody>
          <tr><td style={s.td}><span style={s.mono}>AD</span></td><td style={s.td}>Aktueller Abdruck</td></tr>
          <tr><td style={s.td}><span style={s.mono}>CD</span></td><td style={s.td}>Chronologischer Abdruck</td></tr>
          <tr><td style={s.td}><span style={s.mono}>DK</span></td><td style={s.td}>Dokumentenliste</td></tr>
        </tbody>
      </table>

      <div style={s.h2}>Fehlercodes</div>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Code</th><th style={s.th}>Bedeutung</th></tr></thead>
        <tbody>
          <tr><td style={s.td}><span style={s.mono}>401</span></td><td style={s.td}>API-Key fehlt oder ungültig</td></tr>
          <tr><td style={s.td}><span style={s.mono}>400</span></td><td style={s.td}>Fehlende oder ungültige Parameter</td></tr>
          <tr><td style={s.td}><span style={s.mono}>404</span></td><td style={s.td}>Unternehmen nicht gefunden</td></tr>
          <tr><td style={s.td}><span style={s.mono}>429</span></td><td style={s.td}>Monatliches Limit erreicht</td></tr>
          <tr><td style={s.td}><span style={s.mono}>502</span></td><td style={s.td}>Handelsregister temporär nicht erreichbar</td></tr>
        </tbody>
      </table>
    </div>
  )
}
