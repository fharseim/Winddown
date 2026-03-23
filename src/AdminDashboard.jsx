import { useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'

const STATUS_CONFIG = {
  intake:            { label: 'Intake',           color: 'bg-gray-100 text-gray-600' },
  ersteinschaetzung: { label: 'Ersteinschätzung', color: 'bg-amber-100 text-amber-700' },
  angebot:           { label: 'Angebot',           color: 'bg-blue-100 text-blue-700' },
  aktiv:             { label: 'Aktiv',             color: 'bg-emerald-100 text-emerald-700' },
  abgeschlossen:     { label: 'Abgeschlossen',     color: 'bg-gray-200 text-gray-600' },
  abgebrochen:       { label: 'Abgebrochen',       color: 'bg-red-100 text-red-600' },
}

const MOCK_CASES = [
  {
    id: 'mock-001',
    created_at: '2026-03-23T09:15:00Z',
    firma_name: 'TechVenture GmbH',
    firma_rechtsform: 'GmbH',
    contact_name: 'Sarah Müller',
    contact_email: 'sarah@techventure.de',
    rolle: 'Gründer',
    status: 'intake',
  },
  {
    id: 'mock-002',
    created_at: '2026-03-21T14:30:00Z',
    firma_name: 'DataFlow Analytics GmbH',
    firma_rechtsform: 'GmbH',
    contact_name: 'Markus Weber',
    contact_email: 'm.weber@dataflow.io',
    rolle: 'Geschäftsführer',
    status: 'ersteinschaetzung',
  },
  {
    id: 'mock-003',
    created_at: '2026-03-18T11:45:00Z',
    firma_name: 'GreenLogistics UG',
    firma_rechtsform: 'UG',
    contact_name: 'Anna Schmidt',
    contact_email: 'anna@greenlogistics.de',
    rolle: 'Gründer',
    status: 'angebot',
  },
  {
    id: 'mock-004',
    created_at: '2026-03-10T16:00:00Z',
    firma_name: 'CloudBase Solutions GmbH',
    firma_rechtsform: 'GmbH',
    contact_name: 'Thomas Richter',
    contact_email: 't.richter@cloudbase.tech',
    rolle: 'VC-Fonds',
    status: 'aktiv',
  },
  {
    id: 'mock-005',
    created_at: '2026-03-05T10:20:00Z',
    firma_name: 'FinPay GmbH',
    firma_rechtsform: 'GmbH',
    contact_name: 'Julia Becker',
    contact_email: 'julia@finpay.de',
    rolle: 'Anwalt',
    status: 'aktiv',
  },
  {
    id: 'mock-006',
    created_at: '2026-02-15T08:00:00Z',
    firma_name: 'MediTech Innovations GmbH',
    firma_rechtsform: 'GmbH',
    contact_name: 'Dr. Stefan Lang',
    contact_email: 's.lang@meditech.de',
    rolle: 'Gründer',
    status: 'abgeschlossen',
  },
]

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 7) return `vor ${days} Tagen`
  const weeks = Math.floor(days / 7)
  if (days < 30) return `vor ${weeks} Woche${weeks > 1 ? 'n' : ''}`
  const months = Math.floor(days / 30)
  return `vor ${months} Monat${months > 1 ? 'en' : ''}`
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function RechtsformBadge({ rechtsform }) {
  return (
    <span className="inline-block ml-2 px-1.5 py-0 rounded text-xs font-mono text-gray-500 bg-gray-100 border border-gray-200">
      {rechtsform}
    </span>
  )
}

function StatCard({ label, value, dotColor }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900 font-sans">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [search, setSearch] = useState('')

  const neue = MOCK_CASES.filter(c => c.status === 'intake').length
  const inBearbeitung = MOCK_CASES.filter(c => ['ersteinschaetzung', 'angebot'].includes(c.status)).length
  const aktiv = MOCK_CASES.filter(c => c.status === 'aktiv').length
  const abgeschlossen = MOCK_CASES.filter(c => c.status === 'abgeschlossen').length

  const filtered = MOCK_CASES.filter(c => {
    const q = search.toLowerCase()
    return (
      c.firma_name.toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      c.contact_email.toLowerCase().includes(q)
    )
  })

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="font-sans font-semibold text-gray-900 text-xl">Übersicht</h1>
          <p className="font-sans text-sm text-gray-500 mt-0.5">Alle Liquidierungsanfragen im Überblick</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Neue Anfragen" value={neue} dotColor="bg-rise-coral" />
          <StatCard label="In Bearbeitung" value={inBearbeitung} dotColor="bg-amber-400" />
          <StatCard label="Aktiv" value={aktiv} dotColor="bg-emerald-400" />
          <StatCard label="Abgeschlossen" value={abgeschlossen} dotColor="bg-gray-300" />
        </div>

        {/* Cases table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
            <h2 className="font-sans font-medium text-gray-900 text-sm whitespace-nowrap">Alle Cases</h2>
            <div className="relative max-w-xs w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Firma, Kontakt suchen…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm font-sans text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Firma
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Kontakt
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Letzte Aktivität
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-0">
                      <span className="font-sans text-sm font-medium text-gray-900">{c.firma_name}</span>
                      <RechtsformBadge rechtsform={c.firma_rechtsform} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-sans text-sm text-gray-800">{c.contact_name}</p>
                    <p className="font-sans text-xs text-gray-400 mt-0.5">{c.contact_email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 font-sans text-sm text-gray-400 whitespace-nowrap">
                    {relativeTime(c.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/admin/case/${c.id}`}
                      className="inline-flex items-center gap-1 font-sans text-xs font-medium text-gray-400 hover:text-gray-900 group-hover:text-gray-700 transition-colors"
                    >
                      Öffnen
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center font-sans text-sm text-gray-400">
                    Keine Cases gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
