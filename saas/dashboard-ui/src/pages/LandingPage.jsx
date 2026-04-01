import { Link } from 'react-router-dom'

const s = {
  page:   { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#111' },
  nav:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid #f1f5f9' },
  logo:   { fontSize: 18, fontWeight: 700, textDecoration: 'none', color: '#0f172a' },
  navLinks: { display: 'flex', gap: 24, alignItems: 'center' },
  navLink:{ textDecoration: 'none', fontSize: 14, color: '#64748b' },
  loginBtn: { padding: '8px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none' },
  hero:   { textAlign: 'center', padding: '100px 24px 80px' },
  badge:  { display: 'inline-block', background: '#f1f5f9', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 24, letterSpacing: '0.05em', textTransform: 'uppercase' },
  h1:     { fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.5px', maxWidth: 700, margin: '0 auto 20px' },
  hsub:   { fontSize: 20, color: '#64748b', maxWidth: 540, margin: '0 auto 40px' },
  ctas:   { display: 'flex', gap: 12, justifyContent: 'center' },
  ctaPrimary: { padding: '14px 28px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, textDecoration: 'none' },
  ctaSec: { padding: '14px 28px', background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16, textDecoration: 'none' },
  codeBlock: { background: '#0f172a', borderRadius: 12, padding: '32px 40px', maxWidth: 680, margin: '64px auto 0', textAlign: 'left', overflowX: 'auto' },
  codePre: { fontFamily: 'monospace', fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre', lineHeight: 1.8 },
  codeComment: { color: '#64748b' },
  features: { background: '#f9fafb', padding: '80px 48px' },
  featGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 960, margin: '0 auto' },
  featCard: { background: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  featIcon: { fontSize: 28, marginBottom: 12 },
  featH:  { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  featP:  { fontSize: 14, color: '#64748b', lineHeight: 1.6 },
  pricing:{ padding: '80px 48px', textAlign: 'center' },
  ph2:    { fontSize: 36, fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' },
  psub:   { color: '#64748b', marginBottom: 48 },
  pgrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto' },
  pcard:  (highlight) => ({
    background: highlight ? '#0f172a' : '#fff',
    color: highlight ? '#fff' : '#111',
    borderRadius: 12, padding: 32,
    boxShadow: highlight ? '0 8px 32px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.07)',
    transform: highlight ? 'scale(1.03)' : 'none',
  }),
  pname:  { fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, opacity: 0.7 },
  pprice: { fontSize: 42, fontWeight: 800, marginBottom: 4 },
  ppmo:   { fontSize: 14, opacity: 0.6, marginBottom: 20 },
  pline:  (h) => ({ fontSize: 14, opacity: h ? 1 : 0.8, marginBottom: 8 }),
  pbtn:   (highlight) => ({
    display: 'block', marginTop: 28, padding: '12px 0', width: '100%',
    background: highlight ? '#fff' : '#0f172a',
    color: highlight ? '#0f172a' : '#fff',
    border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer',
    textDecoration: 'none', textAlign: 'center',
  }),
  footer: { borderTop: '1px solid #f1f5f9', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: 13 },
}

const FEATURES = [
  { icon: '⚡', title: 'Sofort verfügbar', text: 'API-Key erstellen, direkt loslegen. Keine manuelle Freischaltung.' },
  { icon: '📄', title: 'AD, CD & DK', text: 'Aktueller Abdruck, chronologischer Abdruck und Dokumentenliste — alle gängigen HR-Dokumente.' },
  { icon: '🔍', title: 'Präzise Suche', text: 'Suche nach Registernummer und Gericht. Korrekte Zuordnung auch bei identischen Nummern.' },
  { icon: '📊', title: 'Usage-Tracking', text: 'Sieh genau, wie viele Calls du gemacht hast — im Dashboard in Echtzeit.' },
  { icon: '🔑', title: 'Mehrere API-Keys', text: 'Pro Environment ein Key. Produktiv, Staging, Test — alles sauber getrennt.' },
  { icon: '🇩🇪', title: 'Alle deutschen Gerichte', text: 'Über 140 Registergerichte abgedeckt, inkl. automatischer Code-Auflösung.' },
]

export default function LandingPage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>hrauszug.io</Link>
        <div style={s.navLinks}>
          <Link to="/docs" style={s.navLink}>Dokumentation</Link>
          <Link to="/login" style={s.loginBtn}>Kostenlos starten</Link>
        </div>
      </nav>

      <section style={s.hero}>
        <div style={s.badge}>Handelsregister API</div>
        <h1 style={s.h1}>HR-Dokumente per API abrufen</h1>
        <p style={s.hsub}>Aktueller Abdruck, chronologischer Abdruck und Dokumentenliste — direkt in deine Anwendung.</p>
        <div style={s.ctas}>
          <Link to="/login" style={s.ctaPrimary}>Jetzt starten</Link>
          <Link to="/docs" style={s.ctaSec}>Dokumentation</Link>
        </div>
        <div style={s.codeBlock}>
          <pre style={s.codePre}>
            <span style={s.codeComment}># Aktuellen Abdruck herunterladen{'\n'}</span>
            {`curl "https://api.hrauszug.io/v1/download" \\
  -H "Authorization: Bearer hra_live_..." \\
  -G \\
  -d "registerArt=HRB" \\
  -d "registerNummer=25133" \\
  -d "registerGericht=Kiel" \\
  -d "docType=AD" \\
  -o auszug.pdf`}
          </pre>
        </div>
      </section>

      <section style={s.features}>
        <div style={s.featGrid}>
          {FEATURES.map(f => (
            <div key={f.title} style={s.featCard}>
              <div style={s.featIcon}>{f.icon}</div>
              <div style={s.featH}>{f.title}</div>
              <div style={s.featP}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={s.pricing}>
        <div style={s.ph2}>Einfache Preise</div>
        <div style={s.psub}>Monatlich kündbar. Keine Setup-Gebühren.</div>
        <div style={s.pgrid}>
          {[
            { id: 'starter', name: 'Starter', price: '49', calls: '500 Calls/Monat', overage: '0,05 € / weiterer Call', highlight: false },
            { id: 'growth',  name: 'Growth',  price: '199', calls: '5.000 Calls/Monat', overage: '0,03 € / weiterer Call', highlight: true },
            { id: 'scale',   name: 'Scale',   price: '799', calls: '50.000 Calls/Monat', overage: '0,02 € / weiterer Call', highlight: false },
          ].map(plan => (
            <div key={plan.id} style={s.pcard(plan.highlight)}>
              <div style={s.pname}>{plan.name}</div>
              <div style={s.pprice}>{plan.price} €</div>
              <div style={s.ppmo}>pro Monat</div>
              <div style={s.pline(true)}>{plan.calls}</div>
              <div style={s.pline(false)}>{plan.overage}</div>
              <Link to="/login" style={s.pbtn(plan.highlight)}>Jetzt starten</Link>
            </div>
          ))}
        </div>
      </section>

      <footer style={s.footer}>
        <div>© 2025 hrauszug.io</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/docs" style={{ color: '#94a3b8', textDecoration: 'none' }}>Dokumentation</Link>
        </div>
      </footer>
    </div>
  )
}
