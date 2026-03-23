import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'

// ─── Document generation ──────────────────────────────────────────────────────

async function downloadDocument(type, caseData, setLoadingDoc) {
  setLoadingDoc(type)
  try {
    const res = await fetch('/api/generate-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, caseData }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }))
      alert(`Fehler: ${err.error || res.statusText}`)
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? `${type}.docx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    alert(`Netzwerkfehler: ${err.message}`)
  } finally {
    setLoadingDoc(null)
  }
}

const STATUS_OPTIONS = [
  { value: 'intake',            label: 'Intake' },
  { value: 'ersteinschaetzung', label: 'Ersteinschätzung' },
  { value: 'angebot',           label: 'Angebot' },
  { value: 'aktiv',             label: 'Aktiv' },
  { value: 'abgeschlossen',     label: 'Abgeschlossen' },
  { value: 'abgebrochen',       label: 'Abgebrochen' },
]

const STATUS_COLOR = {
  intake:            'bg-stone-100 text-stone-600',
  ersteinschaetzung: 'bg-amber-100 text-amber-700',
  angebot:           'bg-blue-100 text-blue-700',
  aktiv:             'bg-rise-sage/15 text-rise-sage',
  abgeschlossen:     'bg-green-100 text-green-700',
  abgebrochen:       'bg-red-100 text-red-600',
}

const MOCK_CASE = {
  id: 'mock-001',
  created_at: '2026-03-18T10:24:00Z',
  status: 'ersteinschaetzung',
  contact_name: 'Julia Bauer',
  contact_email: 'julia@acme.de',
  contact_phone: '+49 160 1234567',
  rolle: 'Geschäftsführer/in',
  firma_name: 'Acme Ventures GmbH',
  firma_rechtsform: 'GmbH',
  firma_gruendungsjahr: 2019,
  firma_sitz: 'Berlin',
  hrb_nummer: 'HRB 12345 B',
  hr_validated: false,
  operativ_aktiv: false,
  mitarbeiter: false,
  mitarbeiter_anzahl: 0,
  glaeubiger: 'nein',
  jahresabschluesse_aktuell: false,
  rueckstand_jahre: 2,
  steuerberater: true,
  gesellschafter_anzahl: '2',
  vsop_esop: 'nein',
  investoren: false,
  vermoegensfrei: 'ja',
  satzung_filename: 'satzung_acme.pdf',
  calculated_fee: 1990,
  internal_notes: '',
}

const MOCK_DOCUMENTS = [
  { id: 'd1', type: 'ersteinschaetzung', filename: 'ersteinschaetzung_acme.pdf', status: 'entwurf', created_at: '2026-03-18T12:00:00Z' },
  { id: 'd2', type: 'kostenangebot',     filename: 'angebot_acme_2026.pdf',       status: 'freigegeben', created_at: '2026-03-19T09:30:00Z' },
]

const MOCK_ACTIVITY = [
  { id: 'a1', created_at: '2026-03-18T10:24:00Z', action: 'Intake eingereicht', actor: 'system' },
  { id: 'a2', created_at: '2026-03-18T10:25:00Z', action: 'E-Mail-Bestätigung gesendet', actor: 'system' },
  { id: 'a3', created_at: '2026-03-18T12:00:00Z', action: 'Ersteinschätzung erstellt', actor: 'admin' },
  { id: 'a4', created_at: '2026-03-19T09:30:00Z', action: 'Status → Angebot', actor: 'admin' },
]

function StatusBadge({ status }) {
  const cfg = STATUS_COLOR[status] ?? 'bg-stone-100 text-stone-600'
  const opt = STATUS_OPTIONS.find(o => o.value === status)
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full font-sans text-xs font-medium ${cfg}`}>
      {opt?.label ?? status}
    </span>
  )
}

function DataRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex py-2.5 border-b border-rise-border last:border-0">
      <span className="font-sans text-sm text-rise-muted w-48 flex-shrink-0">{label}</span>
      <span className="font-sans text-sm text-rise-dark">{String(value)}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="font-sans text-xs font-medium text-rise-muted uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-white rounded-xl border border-rise-border px-5">{children}</div>
    </div>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const DOC_STATUS_COLOR = {
  entwurf:    'bg-stone-100 text-stone-600',
  freigegeben:'bg-blue-100 text-blue-700',
  versendet:  'bg-green-100 text-green-700',
}

export default function AdminCaseDetail() {
  const { id } = useParams()
  const [tab, setTab] = useState('uebersicht')
  const [status, setStatus] = useState(MOCK_CASE.status)
  const [notes, setNotes] = useState(MOCK_CASE.internal_notes)
  const [loadingDoc, setLoadingDoc] = useState(null)

  // In production: fetch case by `id` from Supabase
  const c = MOCK_CASE

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <Link to="/admin" className="font-sans text-sm text-rise-muted hover:text-rise-dark transition-colors">
            Übersicht
          </Link>
          <span className="text-rise-muted">/</span>
          <span className="font-sans text-sm text-rise-dark">{c.firma_name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-sans font-medium text-rise-dark text-xl">{c.firma_name}</h1>
            <p className="font-sans text-sm text-rise-muted mt-0.5">
              Eingegangen: {formatDate(c.created_at)} · Case ID: {id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="font-sans text-sm text-rise-dark bg-white border border-rise-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-rise-dark transition-colors"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-rise-border mb-6">
              {[
                { key: 'uebersicht', label: 'Übersicht' },
                { key: 'dokumente',  label: 'Dokumente' },
                { key: 'aktivitaet',label: 'Aktivität' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 font-sans text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.key
                      ? 'border-rise-dark text-rise-dark'
                      : 'border-transparent text-rise-muted hover:text-rise-dark'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Übersicht */}
            {tab === 'uebersicht' && (
              <div>
                <Section title="Kontakt">
                  <DataRow label="Name" value={c.contact_name} />
                  <DataRow label="E-Mail" value={c.contact_email} />
                  <DataRow label="Telefon" value={c.contact_phone} />
                  <DataRow label="Rolle" value={c.rolle} />
                </Section>

                <Section title="Unternehmen">
                  <DataRow label="Firma" value={c.firma_name} />
                  <DataRow label="Rechtsform" value={c.firma_rechtsform} />
                  <DataRow label="Gründungsjahr" value={c.firma_gruendungsjahr} />
                  <DataRow label="Sitz" value={c.firma_sitz} />
                  <DataRow label="HRB-Nummer" value={c.hrb_nummer} />
                </Section>

                <Section title="Handelsregister">
                  <div className="py-3">
                    <div className="flex items-center gap-2 mb-3">
                      {c.hr_validated ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-sans text-xs font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          HR-validiert
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-sans text-xs font-medium">
                          Nicht validiert
                        </span>
                      )}
                    </div>
                    {c.hr_validated && c.hrb_nummer && (
                      <p className="font-sans text-sm text-rise-dark mb-2">{c.hrb_nummer}</p>
                    )}
                    <a
                      href={`https://www.handelsregister.de/rp_web/mask.do?Typ=e&Schlagwort=${encodeURIComponent(c.firma_name)}&Bundesland=0`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-xs font-medium text-rise-dark hover:text-rise-coral transition-colors inline-flex items-center gap-1"
                    >
                      Im Handelsregister prüfen →
                    </a>
                  </div>
                </Section>

                <Section title="Aktueller Status">
                  <DataRow label="Operativ aktiv" value={c.operativ_aktiv ? 'Ja' : 'Nein'} />
                  <DataRow label="Mitarbeiter" value={c.mitarbeiter ? `Ja (${c.mitarbeiter_anzahl})` : 'Nein'} />
                  <DataRow label="Gläubiger" value={c.glaeubiger} />
                </Section>

                <Section title="Steuerliche Situation">
                  <DataRow label="Jahresabschlüsse aktuell" value={c.jahresabschluesse_aktuell ? 'Ja' : 'Nein'} />
                  <DataRow label="Jahre im Rückstand" value={c.rueckstand_jahre} />
                  <DataRow label="Steuerberater vorhanden" value={c.steuerberater ? 'Ja' : 'Nein'} />
                </Section>

                <Section title="Gesellschafter">
                  <DataRow label="Anzahl" value={c.gesellschafter_anzahl} />
                  <DataRow label="VSOP/ESOP" value={c.vsop_esop} />
                  <DataRow label="Institutionelle Investoren" value={c.investoren ? 'Ja' : 'Nein'} />
                </Section>

                <Section title="§394 FamFG">
                  <DataRow label="Vermögensfrei" value={c.vermoegensfrei} />
                </Section>

                {c.calculated_fee && (
                  <Section title="Honorar">
                    <DataRow label="Kalkuliertes Honorar" value={`${c.calculated_fee.toLocaleString('de-DE')} €`} />
                  </Section>
                )}
              </div>
            )}

            {/* Dokumente */}
            {tab === 'dokumente' && (
              <div className="space-y-4">
                {/* Generate buttons */}
                <div className="bg-white rounded-xl border border-rise-border p-5">
                  <p className="font-sans text-xs font-medium text-rise-muted uppercase tracking-wide mb-4">Dokument erstellen</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { type: 'ersteinschaetzung',    label: 'Ersteinschätzung generieren' },
                      { type: 'kostenangebot',         label: 'Kostenangebot generieren' },
                      { type: 'aufloesungsbeschluss',  label: 'Auflösungsbeschluss generieren' },
                    ].map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => downloadDocument(type, c, setLoadingDoc)}
                        disabled={loadingDoc !== null}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-sans text-sm font-medium transition-colors ${
                          loadingDoc === type
                            ? 'bg-rise-bg border-rise-border text-rise-muted cursor-not-allowed'
                            : 'bg-white border-rise-dark text-rise-dark hover:bg-rise-dark hover:text-white'
                        }`}
                      >
                        {loadingDoc === type ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Generiere…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            {label}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Existing documents table */}
                <div className="bg-white rounded-xl border border-rise-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-rise-border">
                        <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Dokument</th>
                        <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Typ</th>
                        <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-left font-sans text-xs font-medium text-rise-muted uppercase tracking-wide">Erstellt</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rise-border">
                      {MOCK_DOCUMENTS.map(d => (
                        <tr key={d.id} className="hover:bg-rise-bg/50 transition-colors">
                          <td className="px-5 py-3.5 font-sans text-sm text-rise-dark">{d.filename}</td>
                          <td className="px-5 py-3.5 font-sans text-sm text-rise-muted">{d.type}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-sans text-xs font-medium ${DOC_STATUS_COLOR[d.status]}`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-sans text-sm text-rise-muted whitespace-nowrap">
                            {formatDate(d.created_at)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button className="font-sans text-xs font-medium text-rise-dark hover:text-rise-coral transition-colors">
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {MOCK_DOCUMENTS.length === 0 && (
                    <p className="px-5 py-8 text-center font-sans text-sm text-rise-muted">Keine Dokumente vorhanden.</p>
                  )}
                </div>
              </div>
            )}

            {/* Aktivität */}
            {tab === 'aktivitaet' && (
              <div className="space-y-0">
                {MOCK_ACTIVITY.map((a, i) => (
                  <div key={a.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-rise-dark mt-1 flex-shrink-0" />
                      {i < MOCK_ACTIVITY.length - 1 && (
                        <div className="w-px bg-rise-border flex-1 my-1" />
                      )}
                    </div>
                    <div className="pb-5">
                      <p className="font-sans text-sm text-rise-dark">{a.action}</p>
                      <p className="font-sans text-xs text-rise-muted mt-0.5">
                        {formatDate(a.created_at)} · {a.actor}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* Handelsregister */}
            {c.hrb_nummer && (
              <div className="bg-white rounded-xl border border-rise-border p-4">
                <p className="font-sans text-xs font-medium text-rise-muted uppercase tracking-wide mb-2">Handelsregister</p>
                <p className="font-sans text-sm text-rise-dark mb-2">{c.hrb_nummer}</p>
                <a
                  href={`https://www.handelsregister.de/rp_web/mask.do?Typ=e&Schlagwort=${encodeURIComponent(c.firma_name)}&Bundesland=0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs font-medium text-rise-dark hover:text-rise-coral transition-colors"
                >
                  Im HR prüfen →
                </a>
              </div>
            )}

            {/* Satzung */}
            {c.satzung_filename && (
              <div className="bg-white rounded-xl border border-rise-border p-4">
                <p className="font-sans text-xs font-medium text-rise-muted uppercase tracking-wide mb-2">Satzung</p>
                <p className="font-sans text-sm text-rise-dark mb-2">{c.satzung_filename}</p>
                <button className="font-sans text-xs font-medium text-rise-dark hover:text-rise-coral transition-colors">
                  Herunterladen →
                </button>
              </div>
            )}

            {/* Internal notes */}
            <div className="bg-white rounded-xl border border-rise-border p-4">
              <p className="font-sans text-xs font-medium text-rise-muted uppercase tracking-wide mb-2">Interne Notizen</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notizen hinzufügen…"
                rows={5}
                className="w-full font-sans text-sm text-rise-dark bg-rise-bg border border-rise-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-rise-dark transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
