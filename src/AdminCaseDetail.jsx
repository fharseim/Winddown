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

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'intake',            label: 'Intake' },
  { value: 'ersteinschaetzung', label: 'Ersteinschätzung' },
  { value: 'angebot',           label: 'Angebot' },
  { value: 'aktiv',             label: 'Aktiv' },
  { value: 'abgeschlossen',     label: 'Abgeschlossen' },
  { value: 'abgebrochen',       label: 'Abgebrochen' },
]

const STATUS_COLOR = {
  intake:            'bg-gray-100 text-gray-600',
  ersteinschaetzung: 'bg-amber-100 text-amber-700',
  angebot:           'bg-blue-100 text-blue-700',
  aktiv:             'bg-emerald-100 text-emerald-700',
  abgeschlossen:     'bg-gray-200 text-gray-600',
  abgebrochen:       'bg-red-100 text-red-600',
}

const DOC_STATUS_COLOR = {
  entwurf:    'bg-gray-100 text-gray-600',
  freigegeben:'bg-blue-100 text-blue-700',
  versendet:  'bg-emerald-100 text-emerald-700',
}

const DOC_STATUS_LABEL = {
  entwurf:    'Entwurf',
  freigegeben:'Freigegeben',
  versendet:  'Versendet',
}

const DOC_TYPE_LABEL = {
  ersteinschaetzung:   'Ersteinschätzung',
  kostenangebot:       'Kostenangebot',
  aufloesungsbeschluss:'Auflösungsbeschluss',
  umlaufbeschluss:     'Umlaufbeschluss',
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CASE = {
  id: 'mock-001',
  created_at: '2026-03-23T09:15:00Z',
  status: 'intake',
  contact_name: 'Sarah Müller',
  contact_email: 'sarah@techventure.de',
  contact_phone: '+49 176 5534221',
  rolle: 'Gründer',
  firma_name: 'TechVenture GmbH',
  firma_rechtsform: 'GmbH',
  firma_gruendungsjahr: 2019,
  firma_sitz: 'Frankfurt am Main',
  hrb_nummer: 'HRB 198234',
  registergericht: 'AG Frankfurt',
  hr_validated: false,
  operativ_aktiv: false,
  operativ_inaktiv_seit: '6 Monate',
  mitarbeiter: false,
  mitarbeiter_anzahl: 0,
  glaeubiger: 'nein',
  jahresabschluesse_aktuell: false,
  rueckstand_jahre: 0,
  steuerberater: false,
  gesellschafter_anzahl: '2',
  vsop_esop: 'nein',
  investoren: true,
  investoren_typ: 'VC-finanziert',
  vermoegensfrei: 'ja',
  satzung_filename: 'satzung_techventure.pdf',
  calculated_fee: null,
  internal_notes: '',
}

const MOCK_DOCUMENTS = [
  {
    id: 'd1',
    type: 'ersteinschaetzung',
    filename: 'ersteinschaetzung_techventure_2026-03-23.pdf',
    status: 'freigegeben',
    created_at: '2026-03-23T10:00:00Z',
  },
  {
    id: 'd2',
    type: 'kostenangebot',
    filename: 'kostenangebot_techventure_2026-03-23.pdf',
    status: 'entwurf',
    created_at: '2026-03-23T10:30:00Z',
  },
]

const MOCK_ACTIVITY = [
  {
    id: 'a1',
    created_at: '2026-03-23T09:15:00Z',
    action: 'Intake-Formular eingereicht',
    actor: 'system',
    detail: 'Via Website — Formular vollständig ausgefüllt',
  },
  {
    id: 'a2',
    created_at: '2026-03-23T09:16:00Z',
    action: 'Bestätigungs-E-Mail gesendet',
    actor: 'system',
    detail: 'An sarah@techventure.de',
  },
  {
    id: 'a3',
    created_at: '2026-03-23T10:00:00Z',
    action: 'Ersteinschätzung generiert',
    actor: 'admin',
    detail: 'ersteinschaetzung_techventure_2026-03-23.pdf erstellt',
  },
  {
    id: 'a4',
    created_at: '2026-03-23T10:30:00Z',
    action: 'Kostenangebot erstellt (Entwurf)',
    actor: 'admin',
    detail: 'Kalkuliertes Honorar: noch offen',
  },
]

const MOCK_MESSAGES = [
  {
    id: 'm1',
    created_at: '2026-03-23T09:16:00Z',
    type: 'email_out',
    subject: 'Ihre Anfrage bei Rise Legal — Eingangsbestätigung',
    body: 'Sehr geehrte Frau Müller,\n\nwir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nRise Legal',
    from: 'kontakt@rise-legal.de',
    to: 'sarah@techventure.de',
  },
  {
    id: 'm2',
    created_at: '2026-03-23T11:15:00Z',
    type: 'email_in',
    subject: 'Re: Ihre Anfrage bei Rise Legal',
    body: 'Guten Morgen,\n\nvielen Dank für die schnelle Rückmeldung. Haben Sie noch Fragen zur Satzung? Ich kann die Original-Urkunde zusenden.\n\nViele Grüße\nSarah Müller',
    from: 'sarah@techventure.de',
    to: 'kontakt@rise-legal.de',
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'
  const opt = STATUS_OPTIONS.find(o => o.value === status)
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {opt?.label ?? status}
    </span>
  )
}

function InfoCard({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-400 w-44 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{String(value)}</span>
    </div>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({ doc, caseData, onClose, onSent }) {
  const [to, setTo] = useState(caseData.contact_email)
  const [subject, setSubject] = useState(
    `${DOC_TYPE_LABEL[doc.type] ?? doc.type} – ${caseData.firma_name}`
  )
  const [body, setBody] = useState(
    `Sehr geehrte/r ${caseData.contact_name},\n\nanbei übersende ich Ihnen ${DOC_TYPE_LABEL[doc.type] ?? doc.type} für die ${caseData.firma_name}.\n\nBitte prüfen Sie das Dokument und melden Sie sich bei Fragen.\n\nMit freundlichen Grüßen\nRise Legal`
  )

  function handleSend() {
    // In production: call Resend API
    onSent()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-sans font-medium text-gray-900">Dokument per E-Mail senden</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Attachment */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
            <span className="text-sm text-gray-700 font-medium truncate">{doc.filename}</span>
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Empfänger</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full px-3 py-2 text-sm font-sans text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Betreff</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm font-sans text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nachricht</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-sm font-sans text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium font-sans text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 text-sm font-medium font-sans text-white bg-rise-dark rounded-lg hover:bg-rise-dark/90 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Senden
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-sans">
      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
      <button onClick={onClose} className="ml-2 text-white/50 hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminCaseDetail() {
  const { id } = useParams()
  const [tab, setTab] = useState('uebersicht')
  const [status, setStatus] = useState(MOCK_CASE.status)
  const [notes, setNotes] = useState(MOCK_CASE.internal_notes)
  const [loadingDoc, setLoadingDoc] = useState(null)
  const [emailModal, setEmailModal] = useState(null)
  const [toast, setToast] = useState(null)

  // In production: fetch case by `id` from Supabase
  const c = MOCK_CASE

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const TABS = [
    { key: 'uebersicht',     label: 'Übersicht' },
    { key: 'dokumente',      label: 'Dokumente' },
    { key: 'aktivitaet',     label: 'Aktivität' },
    { key: 'kommunikation',  label: 'Kommunikation' },
  ]

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <Link to="/admin" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Übersicht
          </Link>
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-gray-700">{c.firma_name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-5 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-sans font-semibold text-gray-900 text-xl">{c.firma_name}</h1>
                <span className="inline-block px-1.5 py-0 rounded text-xs font-mono text-gray-500 bg-gray-100 border border-gray-200">
                  {c.firma_rechtsform}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Eingegangen: {formatDate(c.created_at)} · Case {id}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Status selector */}
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="text-sm font-sans text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400 transition-colors cursor-pointer"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Quick actions */}
              <button
                onClick={() => setTab('kommunikation')}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium font-sans text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                E-Mail senden
              </button>
              <button
                onClick={() => setTab('dokumente')}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium font-sans text-white bg-rise-dark rounded-lg hover:bg-rise-dark/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Dokument erstellen
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-200 mb-6">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 font-sans text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.key
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Übersicht ─────────────────────────────────────── */}
            {tab === 'uebersicht' && (
              <div className="space-y-4">
                <InfoCard title="Kontaktdaten">
                  <InfoRow label="Name" value={c.contact_name} />
                  <InfoRow label="E-Mail" value={c.contact_email} />
                  <InfoRow label="Telefon" value={c.contact_phone} />
                  <InfoRow label="Rolle" value={c.rolle} />
                </InfoCard>

                <InfoCard title="Gesellschaft">
                  <InfoRow label="Firma" value={c.firma_name} />
                  <InfoRow label="Rechtsform" value={c.firma_rechtsform} />
                  <InfoRow label="HRB-Nummer" value={c.hrb_nummer} />
                  <InfoRow label="Registergericht" value={c.registergericht} />
                  <InfoRow label="Gründungsjahr" value={c.firma_gruendungsjahr} />
                  <InfoRow label="Sitz" value={c.firma_sitz} />
                </InfoCard>

                <InfoCard title="Status & Situation">
                  <InfoRow label="Operativ aktiv" value={c.operativ_aktiv ? 'Ja' : 'Nein'} />
                  {!c.operativ_aktiv && c.operativ_inaktiv_seit && (
                    <InfoRow label="Inaktiv seit" value={c.operativ_inaktiv_seit} />
                  )}
                  <InfoRow label="Mitarbeiter" value={c.mitarbeiter ? `Ja (${c.mitarbeiter_anzahl})` : 'Nein'} />
                  <InfoRow label="Gläubiger" value={c.glaeubiger} />
                  <InfoRow label="Steuerberater" value={c.steuerberater ? 'Ja' : 'Nein'} />
                  {c.rueckstand_jahre > 0 && (
                    <InfoRow label="Steuerrückstand" value={`${c.rueckstand_jahre} Jahr${c.rueckstand_jahre > 1 ? 'e' : ''}`} />
                  )}
                  <InfoRow label="Gesellschafter" value={c.gesellschafter_anzahl} />
                  <InfoRow label="VSOP/ESOP" value={c.vsop_esop} />
                  {c.investoren && <InfoRow label="Investoren" value={c.investoren_typ} />}
                </InfoCard>

                <InfoCard title="§394 FamFG">
                  <div className="py-3">
                    <div className="flex items-start gap-3">
                      {c.vermoegensfrei === 'ja' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium mt-0.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Vermögensfrei
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium mt-0.5">
                          Nicht vermögensfrei
                        </span>
                      )}
                      <p className="text-sm text-gray-500 mt-0.5">
                        {c.vermoegensfrei === 'ja'
                          ? 'Vereinfachte Löschung nach §394 FamFG möglich — kein förmliches Liquidationsverfahren erforderlich.'
                          : 'Reguläres Liquidationsverfahren erforderlich.'}
                      </p>
                    </div>
                  </div>
                </InfoCard>

                {c.calculated_fee && (
                  <InfoCard title="Honorar">
                    <InfoRow label="Kalkuliertes Honorar" value={`${c.calculated_fee.toLocaleString('de-DE')} €`} />
                  </InfoCard>
                )}
              </div>
            )}

            {/* ── Tab: Dokumente ─────────────────────────────────────── */}
            {tab === 'dokumente' && (
              <div className="space-y-4">
                {/* Generate buttons */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Neues Dokument erstellen</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { type: 'ersteinschaetzung',   label: 'Ersteinschätzung' },
                      { type: 'kostenangebot',        label: 'Kostenangebot' },
                      { type: 'aufloesungsbeschluss', label: 'Auflösungsbeschluss' },
                    ].map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => downloadDocument(type, c, setLoadingDoc)}
                        disabled={loadingDoc !== null}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-sans text-sm font-medium transition-colors ${
                          loadingDoc === type
                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
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

                {/* Document list */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vorhandene Dokumente</p>
                  </div>
                  {MOCK_DOCUMENTS.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-gray-400">Keine Dokumente vorhanden.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {MOCK_DOCUMENTS.map(d => (
                        <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                          {/* Icon */}
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>

                          {/* Name + type */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{d.filename}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">{DOC_TYPE_LABEL[d.type] ?? d.type}</span>
                              <span className="text-gray-200">·</span>
                              <span className="text-xs text-gray-400">{formatDateShort(d.created_at)}</span>
                            </div>
                          </div>

                          {/* Status */}
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${DOC_STATUS_COLOR[d.status]}`}>
                            {DOC_STATUS_LABEL[d.status]}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setEmailModal(d)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-sans text-white bg-rise-dark rounded-lg hover:bg-rise-dark/90 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                              </svg>
                              Per E-Mail
                            </button>
                            <button className="px-3 py-1.5 text-xs font-medium font-sans text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Aktivität ─────────────────────────────────────── */}
            {tab === 'aktivitaet' && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="space-y-0">
                  {MOCK_ACTIVITY.map((a, i) => (
                    <div key={a.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                          a.actor === 'admin' ? 'bg-rise-dark' : 'bg-gray-300'
                        }`} />
                        {i < MOCK_ACTIVITY.length - 1 && (
                          <div className="w-px bg-gray-100 flex-1 my-1" />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-medium text-gray-900">{a.action}</p>
                        {a.detail && (
                          <p className="text-xs text-gray-400 mt-0.5">{a.detail}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(a.created_at)}
                          <span className={`ml-2 inline-block px-1.5 py-0 rounded text-xs ${
                            a.actor === 'admin' ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {a.actor === 'admin' ? 'Admin' : 'System'}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab: Kommunikation ─────────────────────────────────── */}
            {tab === 'kommunikation' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium font-sans text-white bg-rise-dark rounded-lg hover:bg-rise-dark/90 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Neue Nachricht
                  </button>
                </div>

                <div className="space-y-3">
                  {MOCK_MESSAGES.map(m => (
                    <div
                      key={m.id}
                      className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
                        m.type === 'email_in' ? 'border-gray-200' : 'border-gray-200'
                      }`}
                    >
                      <div className={`px-5 py-3 border-b flex items-center justify-between ${
                        m.type === 'email_in'
                          ? 'bg-gray-50 border-gray-100'
                          : 'bg-blue-50 border-blue-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            m.type === 'email_in' ? 'bg-gray-400' : 'bg-blue-500'
                          }`} />
                          <span className="text-xs font-medium text-gray-600">
                            {m.type === 'email_in' ? 'Eingehend' : 'Ausgehend'}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500 font-medium">{m.subject}</span>
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(m.created_at)}</span>
                      </div>
                      <div className="px-5 py-4">
                        <div className="flex gap-1.5 text-xs text-gray-400 mb-3">
                          <span>Von: <span className="text-gray-600">{m.from}</span></span>
                          <span>→</span>
                          <span>An: <span className="text-gray-600">{m.to}</span></span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{m.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-60 flex-shrink-0 space-y-4">
            {/* Handelsregister */}
            {c.hrb_nummer && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Handelsregister</p>
                <p className="text-sm font-medium text-gray-900 mb-0.5">{c.hrb_nummer}</p>
                <p className="text-xs text-gray-400 mb-3">{c.registergericht}</p>
                {c.hr_validated ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Validiert
                  </span>
                ) : (
                  <span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium mb-2">
                    Nicht validiert
                  </span>
                )}
                <a
                  href={`https://www.handelsregister.de/rp_web/mask.do?Typ=e&Schlagwort=${encodeURIComponent(c.firma_name)}&Bundesland=0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-3 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Im HR prüfen →
                </a>
              </div>
            )}

            {/* Satzung */}
            {c.satzung_filename && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Satzung</p>
                <p className="text-sm text-gray-700 mb-2 break-all">{c.satzung_filename}</p>
                <button className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                  Herunterladen →
                </button>
              </div>
            )}

            {/* Internal notes */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Interne Notizen</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notizen hinzufügen…"
                rows={5}
                className="w-full text-sm font-sans text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email modal */}
      {emailModal && (
        <EmailModal
          doc={emailModal}
          caseData={c}
          onClose={() => setEmailModal(null)}
          onSent={() => showToast('E-Mail wurde erfolgreich gesendet.')}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
