import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'

const STATUS_CONFIG = {
  intake:            { label: 'Intake',            color: 'bg-stone-100 text-stone-600' },
  ersteinschaetzung: { label: 'Ersteinschätzung',  color: 'bg-amber-100 text-amber-700' },
  angebot:           { label: 'Angebot',            color: 'bg-blue-100 text-blue-700' },
  aktiv:             { label: 'Aktiv',              color: 'bg-rise-sage/15 text-rise-sage' },
  abgeschlossen:     { label: 'Abgeschlossen',      color: 'bg-green-100 text-green-700' },
  abgebrochen:       { label: 'Abgebrochen',        color: 'bg-red-100 text-red-600' },
}

const MOCK_CASES = [
  {
    id: 'mock-001',
    created_at: '2026-03-18T10:24:00Z',
    firma_name: 'Acme Ventures GmbH',
    contact_name: 'Julia Bauer',
    contact_email: 'julia@acme.de',
    status: 'ersteinschaetzung',
  },
  {
    id: 'mock-002',
    created_at: '2026-03-20T14:05:00Z',
    firma_name: 'Bloom Analytics GmbH',
    contact_name: 'Markus Richter',
    contact_email: 'markus@bloom.io',
    status: 'angebot',
  },
  {
    id: 'mock-003',
    created_at: '2026-03-21T09:12:00Z',
    firma_name: 'Strata Software GmbH',
    contact_name: 'Sarah Klein',
    contact_email: 's.klein@strata.de',
    status: 'intake',
  },
  {
    id: 'mock-004',
    created_at: '2026-03-15T16:30:00Z',
    firma_name: 'Nexio Labs GmbH',
    contact_name: 'Tom Weber',
    contact_email: 'tom@nexio.de',
    status: 'aktiv',
  },
  {
    id: 'mock-005',
    created_at: '2026-02-28T11:00:00Z',
    firma_name: 'Helio Systems GmbH',
    contact_name: 'Anna Schulz',
    contact_email: 'anna@helio.de',
    status: 'abgeschlossen',
  },
]

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-stone-100 text-stone-600' }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full font-sans text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-rise-border p-5">
      <p className="font-sans text-xs text-rise-muted uppercase tracking-wide mb-2">{label}</p>
      <p className="font-sans text-2xl font-medium text-rise-dark">{value}</p>
      {sub && <p className="font-sans text-xs text-rise-muted mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const total = MOCK_CASES.length
  const neue = MOCK_CASES.filter(c => c.status === 'intake').length
  const inBearbeitung = MOCK_CASES.filter(c => ['ersteinschaetzung', 'angebot', 'aktiv'].includes(c.status)).length
  const abgeschlossen = MOCK_CASES.filter(c => c.status === 'abgeschlossen').length

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="font-sans font-medium text-rise-dark text-xl mb-6">Übersicht</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Gesamt" value={total} />
          <StatCard label="Neue Anfragen" value={neue} />
          <StatCard label="In Bearbeitung" value={inBearbeitung} />
          <StatCard label="Abgeschlossen" value={abgeschlossen} />
        </div>

        {/* Cases table */}
        <div className="bg-white rounded-xl border border-rise-border overflow-hidden">
          <div className="px-5 py-4 border-b border-rise-border flex items-center justify-between">
            <h2 className="font-sans font-medium text-rise-dark text-sm">Aktuelle Cases</h2>
            <span className="font-sans text-xs text-rise-muted">Demo-Daten</span>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-rise-border">
                <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Datum</th>
                <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Firma</th>
                <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Kontakt</th>
                <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rise-border">
              {MOCK_CASES.map(c => (
                <tr key={c.id} className="hover:bg-rise-bg/50 transition-colors">
                  <td className="px-5 py-3.5 font-sans text-sm text-rise-muted whitespace-nowrap">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-5 py-3.5 font-sans text-sm font-medium text-rise-dark">
                    {c.firma_name}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-sans text-sm text-rise-dark">{c.contact_name}</p>
                    <p className="font-sans text-xs text-rise-muted">{c.contact_email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/admin/case/${c.id}`}
                      className="font-sans text-xs font-medium text-rise-dark hover:text-rise-coral transition-colors"
                    >
                      Öffnen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
