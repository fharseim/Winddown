import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { supabase, isDemoMode } from './lib/supabase'

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
  {
    id: 'mock-007',
    created_at: '2026-03-24T08:00:00Z',
    firma_name: 'amplius Cleantech UG (haftungsbeschränkt)',
    firma_rechtsform: 'UG',
    contact_name: 'Justus Schmidt',
    contact_email: 'j.schmidt@amplius-cleantech.de',
    rolle: 'Gründer',
    status: 'intake',
  },
  {
    id: 'mock-008',
    created_at: '2026-03-24T09:00:00Z',
    firma_name: 'KP Management UG (haftungsbeschränkt)',
    firma_rechtsform: 'UG',
    contact_name: 'Kai Petersen',
    contact_email: 'k.petersen@kp-management.de',
    rolle: 'Gründer',
    status: 'intake',
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
    <div className="bg-white rounded-2xl border border-rise-border p-8 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <p className="text-xs text-rise-muted font-medium uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-4xl font-serif text-rise-dark">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [search, setSearch] = useState('')
  const [cases, setCases] = useState(MOCK_CASES)

  useEffect(() => {
    if (isDemoMode) return
    supabase
      .from('cases')
      .select('id, created_at, firma_name, firma_rechtsform, contact_name, contact_email, rolle, status')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setCases(data)
      })
  }, [])

  const neue = cases.filter(c => c.status === 'intake').length
  const inBearbeitung = cases.filter(c => ['ersteinschaetzung', 'angebot'].includes(c.status)).length
  const aktiv = cases.filter(c => c.status === 'aktiv').length
  const abgeschlossen = cases.filter(c => c.status === 'abgeschlossen').length

  const filtered = cases.filter(c => {
    const q = search.toLowerCase()
    return (
      c.firma_name.toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      c.contact_email.toLowerCase().includes(q)
    )
  })

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-rise-dark text-3xl">Übersicht</h1>
          <p className="font-sans text-sm text-rise-muted mt-1">Alle Liquidierungsanfragen im Überblick</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard label="Neue Anfragen" value={neue} dotColor="bg-rise-coral" />
          <StatCard label="In Bearbeitung" value={inBearbeitung} dotColor="bg-amber-400" />
          <StatCard label="Aktiv" value={aktiv} dotColor="bg-emerald-400" />
          <StatCard label="Abgeschlossen" value={abgeschlossen} dotColor="bg-gray-300" />
        </div>

        {/* Cases table */}
        <div className="bg-white rounded-2xl border border-rise-border shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="px-7 py-5 border-b border-rise-border flex items-center justify-between gap-4">
            <h2 className="font-serif text-rise-dark text-xl whitespace-nowrap">Alle Cases</h2>
            <div className="relative max-w-xs w-full">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rise-muted-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Firma, Kontakt suchen…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm font-sans text-rise-dark bg-rise-bg border border-rise-border rounded-xl shadow-sm focus:outline-none focus:border-rise-muted transition-colors placeholder:text-rise-muted-light"
              />
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-rise-border bg-rise-bg-warm">
                <th className="px-7 py-4 text-left text-xs font-medium text-rise-muted uppercase tracking-widest">
                  Firma
                </th>
                <th className="px-7 py-4 text-left text-xs font-medium text-rise-muted uppercase tracking-widest">
                  Kontakt
                </th>
                <th className="px-7 py-4 text-left text-xs font-medium text-rise-muted uppercase tracking-widest">
                  Status
                </th>
                <th className="px-7 py-4 text-left text-xs font-medium text-rise-muted uppercase tracking-widest">
                  Letzte Aktivität
                </th>
                <th className="px-7 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rise-border">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-rise-bg transition-colors duration-150 group">
                  <td className="px-7 py-5">
                    <div className="flex items-center gap-0">
                      <span className="font-sans text-[15px] font-medium text-rise-dark">{c.firma_name}</span>
                      <RechtsformBadge rechtsform={c.firma_rechtsform} />
                    </div>
                  </td>
                  <td className="px-7 py-5">
                    <p className="font-sans text-[15px] text-rise-dark">{c.contact_name}</p>
                    <p className="font-sans text-xs text-rise-muted-light mt-0.5">{c.contact_email}</p>
                  </td>
                  <td className="px-7 py-5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-7 py-5 font-sans text-sm text-rise-muted whitespace-nowrap">
                    {relativeTime(c.created_at)}
                  </td>
                  <td className="px-7 py-5 text-right">
                    <Link
                      to={`/admin/case/${c.id}`}
                      className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-rise-muted-light hover:text-rise-dark group-hover:text-rise-muted transition-colors duration-150"
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
                  <td colSpan={5} className="px-7 py-12 text-center font-sans text-sm text-rise-muted">
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
