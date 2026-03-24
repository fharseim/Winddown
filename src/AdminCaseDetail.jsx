import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { supabase, isDemoMode } from './lib/supabase'

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

// ─── HR document helpers ──────────────────────────────────────────────────────

/** Parses 'HRB 198234' → { registerArt: 'HRB', registerNummer: '198234' } */
function parseHRBNummer(hrb) {
  if (!hrb) return {}
  const m = hrb.trim().match(/^(HRB|HRA|PR|GnR|VR)\s+(.+)$/i)
  return m ? { registerArt: m[1].toUpperCase(), registerNummer: m[2].trim() } : {}
}

/** Parses 'AG Frankfurt am Main' → 'Frankfurt am Main' */
function parseGericht(gericht) {
  if (!gericht) return ''
  return gericht.replace(/^AG\s+/i, '').trim()
}

async function downloadHRDocument(registerArt, registerNummer, registerGericht, docType, docId, setDownloading, showToast) {
  const key = `${docType}:${docId || ''}`
  setDownloading(key)
  try {
    const params = new URLSearchParams({ registerArt, registerNummer, registerGericht, docType })
    if (docId) params.set('docId', docId)
    const res = await fetch(`/api/hr-download?${params}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }))
      showToast(`Fehler: ${err.error || res.statusText}`, 'error')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
      ?? `HR_${registerArt}_${registerNummer}_${docType}.${blob.type.includes('pdf') ? 'pdf' : 'xml'}`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast(`Netzwerkfehler: ${err.message}`, 'error')
  } finally {
    setDownloading(null)
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

const MOCK_CASES_BY_ID = {
  'mock-001': {
    case: {
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
    },
    documents: [
      { id: 'd1', type: 'ersteinschaetzung', filename: 'ersteinschaetzung_techventure_2026-03-23.pdf', status: 'freigegeben', created_at: '2026-03-23T10:00:00Z' },
      { id: 'd2', type: 'kostenangebot', filename: 'kostenangebot_techventure_2026-03-23.pdf', status: 'entwurf', created_at: '2026-03-23T10:30:00Z' },
    ],
    activity: [
      { id: 'a1', created_at: '2026-03-23T09:15:00Z', action: 'Intake-Formular eingereicht', actor: 'system', detail: 'Via Website — Formular vollständig ausgefüllt' },
      { id: 'a2', created_at: '2026-03-23T09:16:00Z', action: 'Bestätigungs-E-Mail gesendet', actor: 'system', detail: 'An sarah@techventure.de' },
      { id: 'a3', created_at: '2026-03-23T10:00:00Z', action: 'Ersteinschätzung generiert', actor: 'admin', detail: 'ersteinschaetzung_techventure_2026-03-23.pdf erstellt' },
      { id: 'a4', created_at: '2026-03-23T10:30:00Z', action: 'Kostenangebot erstellt (Entwurf)', actor: 'admin', detail: 'Kalkuliertes Honorar: noch offen' },
    ],
    messages: [
      { id: 'm1', created_at: '2026-03-23T09:16:00Z', type: 'email_out', subject: 'Ihre Anfrage bei Rise Legal — Eingangsbestätigung', body: 'Sehr geehrte Frau Müller,\n\nwir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 'sarah@techventure.de' },
      { id: 'm2', created_at: '2026-03-23T11:15:00Z', type: 'email_in', subject: 'Re: Ihre Anfrage bei Rise Legal', body: 'Guten Morgen,\n\nvielen Dank für die schnelle Rückmeldung. Haben Sie noch Fragen zur Satzung? Ich kann die Original-Urkunde zusenden.\n\nViele Grüße\nSarah Müller', from: 'sarah@techventure.de', to: 'kontakt@rise-legal.de' },
    ],
  },

  'mock-002': {
    case: {
      id: 'mock-002',
      created_at: '2026-03-21T14:30:00Z',
      status: 'ersteinschaetzung',
      contact_name: 'Markus Weber',
      contact_email: 'm.weber@dataflow.io',
      contact_phone: '+49 89 3456789',
      rolle: 'Geschäftsführer',
      firma_name: 'DataFlow Analytics GmbH',
      firma_rechtsform: 'GmbH',
      firma_gruendungsjahr: 2018,
      firma_sitz: 'München',
      hrb_nummer: 'HRB 187456',
      registergericht: 'AG München',
      hr_validated: true,
      operativ_aktiv: false,
      operativ_inaktiv_seit: '1 Jahr',
      mitarbeiter: true,
      mitarbeiter_anzahl: 3,
      glaeubiger: 'nein',
      jahresabschluesse_aktuell: false,
      rueckstand_jahre: 1,
      steuerberater: true,
      gesellschafter_anzahl: '3',
      vsop_esop: 'nein',
      investoren: false,
      investoren_typ: '',
      vermoegensfrei: 'nein',
      satzung_filename: 'satzung_dataflow.pdf',
      calculated_fee: null,
      internal_notes: 'Steuerberater bereits kontaktiert.',
    },
    documents: [
      { id: 'd1', type: 'ersteinschaetzung', filename: 'ersteinschaetzung_dataflow_2026-03-21.pdf', status: 'versendet', created_at: '2026-03-21T16:00:00Z' },
    ],
    activity: [
      { id: 'a1', created_at: '2026-03-21T14:30:00Z', action: 'Intake-Formular eingereicht', actor: 'system', detail: 'Via Website — Formular vollständig ausgefüllt' },
      { id: 'a2', created_at: '2026-03-21T14:31:00Z', action: 'Bestätigungs-E-Mail gesendet', actor: 'system', detail: 'An m.weber@dataflow.io' },
      { id: 'a3', created_at: '2026-03-21T16:00:00Z', action: 'Ersteinschätzung generiert und versendet', actor: 'admin', detail: 'ersteinschaetzung_dataflow_2026-03-21.pdf per E-Mail versandt' },
      { id: 'a4', created_at: '2026-03-22T09:00:00Z', action: 'Status auf Ersteinschätzung gesetzt', actor: 'admin', detail: 'Reguläres Liquidationsverfahren erforderlich' },
    ],
    messages: [
      { id: 'm1', created_at: '2026-03-21T14:31:00Z', type: 'email_out', subject: 'Ihre Anfrage bei Rise Legal — Eingangsbestätigung', body: 'Sehr geehrter Herr Weber,\n\nwir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 'm.weber@dataflow.io' },
      { id: 'm2', created_at: '2026-03-21T16:00:00Z', type: 'email_out', subject: 'Ersteinschätzung — DataFlow Analytics GmbH', body: 'Sehr geehrter Herr Weber,\n\nerbei übersende ich Ihnen unsere Ersteinschätzung zu Ihrer Liquidationsanfrage.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 'm.weber@dataflow.io' },
      { id: 'm3', created_at: '2026-03-22T10:45:00Z', type: 'email_in', subject: 'Re: Ersteinschätzung — DataFlow Analytics GmbH', body: 'Guten Tag,\n\nvielen Dank für die Ersteinschätzung. Wir werden uns intern besprechen und dann auf Ihr Angebot zurückkommen.\n\nViele Grüße\nMarkus Weber', from: 'm.weber@dataflow.io', to: 'kontakt@rise-legal.de' },
    ],
  },

  'mock-003': {
    case: {
      id: 'mock-003',
      created_at: '2026-03-18T11:45:00Z',
      status: 'angebot',
      contact_name: 'Anna Schmidt',
      contact_email: 'anna@greenlogistics.de',
      contact_phone: '+49 30 9876543',
      rolle: 'Gründer',
      firma_name: 'GreenLogistics UG',
      firma_rechtsform: 'UG',
      firma_gruendungsjahr: 2021,
      firma_sitz: 'Berlin',
      hrb_nummer: 'HRB 210987',
      registergericht: 'AG Berlin',
      hr_validated: true,
      operativ_aktiv: false,
      operativ_inaktiv_seit: '3 Monate',
      mitarbeiter: false,
      mitarbeiter_anzahl: 0,
      glaeubiger: 'nein',
      jahresabschluesse_aktuell: true,
      rueckstand_jahre: 0,
      steuerberater: false,
      gesellschafter_anzahl: '1',
      vsop_esop: 'nein',
      investoren: false,
      investoren_typ: '',
      vermoegensfrei: 'ja',
      satzung_filename: 'satzung_greenlogistics.pdf',
      calculated_fee: 1490,
      internal_notes: '',
    },
    documents: [
      { id: 'd1', type: 'ersteinschaetzung', filename: 'ersteinschaetzung_greenlogistics_2026-03-18.pdf', status: 'freigegeben', created_at: '2026-03-18T13:00:00Z' },
      { id: 'd2', type: 'kostenangebot', filename: 'kostenangebot_greenlogistics_2026-03-19.pdf', status: 'freigegeben', created_at: '2026-03-19T09:30:00Z' },
    ],
    activity: [
      { id: 'a1', created_at: '2026-03-18T11:45:00Z', action: 'Intake-Formular eingereicht', actor: 'system', detail: 'Via Website — Formular vollständig ausgefüllt' },
      { id: 'a2', created_at: '2026-03-18T11:46:00Z', action: 'Bestätigungs-E-Mail gesendet', actor: 'system', detail: 'An anna@greenlogistics.de' },
      { id: 'a3', created_at: '2026-03-18T13:00:00Z', action: 'Ersteinschätzung generiert', actor: 'admin', detail: 'Vereinfachte Löschung nach §394 FamFG möglich' },
      { id: 'a4', created_at: '2026-03-19T09:30:00Z', action: 'Kostenangebot erstellt', actor: 'admin', detail: 'Honorar: 1.490 € (Pauschalpreis §394 FamFG)' },
      { id: 'a5', created_at: '2026-03-19T10:00:00Z', action: 'Status auf Angebot gesetzt', actor: 'admin', detail: '' },
    ],
    messages: [
      { id: 'm1', created_at: '2026-03-18T11:46:00Z', type: 'email_out', subject: 'Ihre Anfrage bei Rise Legal — Eingangsbestätigung', body: 'Sehr geehrte Frau Schmidt,\n\nwir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 'anna@greenlogistics.de' },
      { id: 'm2', created_at: '2026-03-19T10:15:00Z', type: 'email_out', subject: 'Kostenangebot — GreenLogistics UG', body: 'Sehr geehrte Frau Schmidt,\n\nanbei übersende ich Ihnen unser Kostenangebot für die Löschung der GreenLogistics UG.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 'anna@greenlogistics.de' },
    ],
  },

  'mock-004': {
    case: {
      id: 'mock-004',
      created_at: '2026-03-10T16:00:00Z',
      status: 'aktiv',
      contact_name: 'Thomas Richter',
      contact_email: 't.richter@cloudbase.tech',
      contact_phone: '+49 40 1234567',
      rolle: 'VC-Fonds',
      firma_name: 'CloudBase Solutions GmbH',
      firma_rechtsform: 'GmbH',
      firma_gruendungsjahr: 2017,
      firma_sitz: 'Hamburg',
      hrb_nummer: 'HRB 165432',
      registergericht: 'AG Hamburg',
      hr_validated: true,
      operativ_aktiv: false,
      operativ_inaktiv_seit: '18 Monate',
      mitarbeiter: false,
      mitarbeiter_anzahl: 0,
      glaeubiger: 'ja',
      jahresabschluesse_aktuell: false,
      rueckstand_jahre: 2,
      steuerberater: true,
      gesellschafter_anzahl: '4',
      vsop_esop: 'ja',
      investoren: true,
      investoren_typ: 'VC-finanziert',
      vermoegensfrei: 'nein',
      satzung_filename: 'satzung_cloudbase.pdf',
      calculated_fee: 3800,
      internal_notes: 'Gesellschafterversammlung für Auflösungsbeschluss einberufen.',
    },
    documents: [
      { id: 'd1', type: 'ersteinschaetzung', filename: 'ersteinschaetzung_cloudbase_2026-03-10.pdf', status: 'versendet', created_at: '2026-03-10T18:00:00Z' },
      { id: 'd2', type: 'kostenangebot', filename: 'kostenangebot_cloudbase_2026-03-11.pdf', status: 'versendet', created_at: '2026-03-11T09:00:00Z' },
      { id: 'd3', type: 'aufloesungsbeschluss', filename: 'aufloesungsbeschluss_cloudbase_2026-03-15.pdf', status: 'entwurf', created_at: '2026-03-15T14:00:00Z' },
    ],
    activity: [
      { id: 'a1', created_at: '2026-03-10T16:00:00Z', action: 'Intake-Formular eingereicht', actor: 'system', detail: 'Via Website — Formular vollständig ausgefüllt' },
      { id: 'a2', created_at: '2026-03-10T18:00:00Z', action: 'Ersteinschätzung generiert und versendet', actor: 'admin', detail: 'Reguläres Liquidationsverfahren' },
      { id: 'a3', created_at: '2026-03-11T09:00:00Z', action: 'Kostenangebot versendet', actor: 'admin', detail: 'Honorar: 3.800 € inkl. Jahresabschlüsse' },
      { id: 'a4', created_at: '2026-03-12T10:30:00Z', action: 'Mandat erteilt', actor: 'system', detail: 'Auftragsbestätigung eingegangen' },
      { id: 'a5', created_at: '2026-03-15T14:00:00Z', action: 'Auflösungsbeschluss erstellt (Entwurf)', actor: 'admin', detail: 'Zur Prüfung durch Gesellschafter' },
    ],
    messages: [
      { id: 'm1', created_at: '2026-03-10T16:01:00Z', type: 'email_out', subject: 'Ihre Anfrage bei Rise Legal — Eingangsbestätigung', body: 'Sehr geehrter Herr Richter,\n\nwir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 't.richter@cloudbase.tech' },
      { id: 'm2', created_at: '2026-03-12T09:00:00Z', type: 'email_in', subject: 'Re: Kostenangebot — CloudBase Solutions GmbH', body: 'Guten Morgen,\n\nwir erteilen hiermit den Auftrag. Bitte senden Sie uns den Auflösungsbeschluss zur Prüfung.\n\nViele Grüße\nThomas Richter', from: 't.richter@cloudbase.tech', to: 'kontakt@rise-legal.de' },
    ],
  },

  'mock-005': {
    case: {
      id: 'mock-005',
      created_at: '2026-03-05T10:20:00Z',
      status: 'aktiv',
      contact_name: 'Julia Becker',
      contact_email: 'julia@finpay.de',
      contact_phone: '+49 69 8765432',
      rolle: 'Anwalt',
      firma_name: 'FinPay GmbH',
      firma_rechtsform: 'GmbH',
      firma_gruendungsjahr: 2016,
      firma_sitz: 'Frankfurt am Main',
      hrb_nummer: 'HRB 178901',
      registergericht: 'AG Frankfurt',
      hr_validated: true,
      operativ_aktiv: false,
      operativ_inaktiv_seit: '2 Jahre',
      mitarbeiter: false,
      mitarbeiter_anzahl: 0,
      glaeubiger: 'nein',
      jahresabschluesse_aktuell: false,
      rueckstand_jahre: 2,
      steuerberater: true,
      gesellschafter_anzahl: '2',
      vsop_esop: 'nein',
      investoren: false,
      investoren_typ: '',
      vermoegensfrei: 'ja',
      satzung_filename: 'satzung_finpay.pdf',
      calculated_fee: 1890,
      internal_notes: 'Jahresabschlüsse 2023 und 2024 noch ausstehend — Steuerberater klärt.',
    },
    documents: [
      { id: 'd1', type: 'ersteinschaetzung', filename: 'ersteinschaetzung_finpay_2026-03-05.pdf', status: 'versendet', created_at: '2026-03-05T12:00:00Z' },
      { id: 'd2', type: 'kostenangebot', filename: 'kostenangebot_finpay_2026-03-06.pdf', status: 'versendet', created_at: '2026-03-06T10:00:00Z' },
      { id: 'd3', type: 'aufloesungsbeschluss', filename: 'aufloesungsbeschluss_finpay_2026-03-12.pdf', status: 'versendet', created_at: '2026-03-12T11:00:00Z' },
    ],
    activity: [
      { id: 'a1', created_at: '2026-03-05T10:20:00Z', action: 'Intake-Formular eingereicht', actor: 'system', detail: 'Via Website — Kontakt als Anwalt' },
      { id: 'a2', created_at: '2026-03-05T12:00:00Z', action: 'Ersteinschätzung versendet', actor: 'admin', detail: 'Vereinfachte Löschung §394 FamFG möglich' },
      { id: 'a3', created_at: '2026-03-06T10:00:00Z', action: 'Kostenangebot versendet', actor: 'admin', detail: 'Honorar: 1.890 € inkl. fehlende Jahresabschlüsse' },
      { id: 'a4', created_at: '2026-03-07T08:30:00Z', action: 'Mandat erteilt', actor: 'system', detail: 'Auftragsbestätigung per E-Mail eingegangen' },
      { id: 'a5', created_at: '2026-03-12T11:00:00Z', action: 'Auflösungsbeschluss versendet', actor: 'admin', detail: 'Unterzeichnung durch Gesellschafter ausstehend' },
    ],
    messages: [
      { id: 'm1', created_at: '2026-03-05T10:21:00Z', type: 'email_out', subject: 'Ihre Anfrage bei Rise Legal — Eingangsbestätigung', body: 'Sehr geehrte Frau Becker,\n\nwir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 'julia@finpay.de' },
      { id: 'm2', created_at: '2026-03-07T08:30:00Z', type: 'email_in', subject: 'Auftragsbestätigung — FinPay GmbH', body: 'Sehr geehrte Damen und Herren,\n\nim Namen meiner Mandantin erteile ich hiermit den Auftrag zur Durchführung der Löschung der FinPay GmbH.\n\nMit freundlichen Grüßen\nJulia Becker', from: 'julia@finpay.de', to: 'kontakt@rise-legal.de' },
    ],
  },

  'mock-006': {
    case: {
      id: 'mock-006',
      created_at: '2026-02-15T08:00:00Z',
      status: 'abgeschlossen',
      contact_name: 'Dr. Stefan Lang',
      contact_email: 's.lang@meditech.de',
      contact_phone: '+49 221 5432109',
      rolle: 'Gründer',
      firma_name: 'MediTech Innovations GmbH',
      firma_rechtsform: 'GmbH',
      firma_gruendungsjahr: 2015,
      firma_sitz: 'Köln',
      hrb_nummer: 'HRB 145678',
      registergericht: 'AG Köln',
      hr_validated: true,
      operativ_aktiv: false,
      operativ_inaktiv_seit: '3 Jahre',
      mitarbeiter: false,
      mitarbeiter_anzahl: 0,
      glaeubiger: 'nein',
      jahresabschluesse_aktuell: true,
      rueckstand_jahre: 0,
      steuerberater: true,
      gesellschafter_anzahl: '1',
      vsop_esop: 'nein',
      investoren: false,
      investoren_typ: '',
      vermoegensfrei: 'ja',
      satzung_filename: 'satzung_meditech.pdf',
      calculated_fee: 1490,
      internal_notes: 'Abgeschlossen am 14.03.2026. Löschung im Handelsregister eingetragen.',
    },
    documents: [
      { id: 'd1', type: 'ersteinschaetzung', filename: 'ersteinschaetzung_meditech_2026-02-15.pdf', status: 'versendet', created_at: '2026-02-15T10:00:00Z' },
      { id: 'd2', type: 'kostenangebot', filename: 'kostenangebot_meditech_2026-02-16.pdf', status: 'versendet', created_at: '2026-02-16T09:00:00Z' },
      { id: 'd3', type: 'aufloesungsbeschluss', filename: 'aufloesungsbeschluss_meditech_2026-02-20.pdf', status: 'versendet', created_at: '2026-02-20T11:00:00Z' },
      { id: 'd4', type: 'umlaufbeschluss', filename: 'umlaufbeschluss_meditech_2026-03-01.pdf', status: 'versendet', created_at: '2026-03-01T14:00:00Z' },
    ],
    activity: [
      { id: 'a1', created_at: '2026-02-15T08:00:00Z', action: 'Intake-Formular eingereicht', actor: 'system', detail: 'Via Website — Formular vollständig ausgefüllt' },
      { id: 'a2', created_at: '2026-02-15T10:00:00Z', action: 'Ersteinschätzung versendet', actor: 'admin', detail: 'Vereinfachte Löschung §394 FamFG möglich' },
      { id: 'a3', created_at: '2026-02-16T09:00:00Z', action: 'Kostenangebot versendet', actor: 'admin', detail: 'Pauschalhonorar: 1.490 €' },
      { id: 'a4', created_at: '2026-02-17T07:45:00Z', action: 'Mandat erteilt', actor: 'system', detail: 'Auftragsbestätigung von Dr. Lang eingegangen' },
      { id: 'a5', created_at: '2026-02-20T11:00:00Z', action: 'Auflösungsbeschluss unterzeichnet', actor: 'admin', detail: 'Original per Post erhalten und eingescannt' },
      { id: 'a6', created_at: '2026-03-01T14:00:00Z', action: 'Umlaufbeschluss erstellt und versendet', actor: 'admin', detail: 'Schlussverteilung bestätigt' },
      { id: 'a7', created_at: '2026-03-14T09:00:00Z', action: 'Löschung im Handelsregister eingetragen', actor: 'system', detail: 'HRB 145678 AG Köln — Löschung bestätigt' },
      { id: 'a8', created_at: '2026-03-14T09:30:00Z', action: 'Case abgeschlossen', actor: 'admin', detail: '' },
    ],
    messages: [
      { id: 'm1', created_at: '2026-02-15T08:01:00Z', type: 'email_out', subject: 'Ihre Anfrage bei Rise Legal — Eingangsbestätigung', body: 'Sehr geehrter Herr Dr. Lang,\n\nwir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 's.lang@meditech.de' },
      { id: 'm2', created_at: '2026-02-17T07:45:00Z', type: 'email_in', subject: 'Auftragsbestätigung — MediTech Innovations GmbH', body: 'Sehr geehrte Damen und Herren,\n\nhiermit erteile ich den Auftrag und überweise das Honorar in den nächsten Tagen.\n\nFreundliche Grüße\nDr. Stefan Lang', from: 's.lang@meditech.de', to: 'kontakt@rise-legal.de' },
      { id: 'm3', created_at: '2026-03-14T09:30:00Z', type: 'email_out', subject: 'Abschlussbestätigung — MediTech Innovations GmbH gelöscht', body: 'Sehr geehrter Herr Dr. Lang,\n\nwir freuen uns, Ihnen mitteilen zu können, dass die MediTech Innovations GmbH heute erfolgreich im Handelsregister gelöscht wurde.\n\nMit freundlichen Grüßen\nRise Legal', from: 'kontakt@rise-legal.de', to: 's.lang@meditech.de' },
    ],
  },
}

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
    <div className="bg-white rounded-2xl border border-rise-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-l-4 border-rise-coral bg-rise-bg-warm">
        <h3 className="text-xs font-medium text-rise-muted uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-6 py-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex py-3 border-b border-rise-border last:border-0">
      <span className="text-sm text-rise-muted w-44 flex-shrink-0">{label}</span>
      <span className="text-sm text-rise-dark">{String(value)}</span>
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
  const docLabel = doc ? (DOC_TYPE_LABEL[doc.type] ?? doc.type) : null
  const [to, setTo] = useState(caseData.contact_email)
  const [subject, setSubject] = useState(
    docLabel ? `${docLabel} – ${caseData.firma_name}` : `Ihre Anfrage – ${caseData.firma_name}`
  )
  const [body, setBody] = useState(
    docLabel
      ? `Sehr geehrte/r ${caseData.contact_name},\n\nanbei übersende ich Ihnen ${docLabel} für die ${caseData.firma_name}.\n\nBitte prüfen Sie das Dokument und melden Sie sich bei Fragen.\n\nMit freundlichen Grüßen\nRise Legal`
      : `Sehr geehrte/r ${caseData.contact_name},\n\n\n\nMit freundlichen Grüßen\nRise Legal`
  )

  function handleSend() {
    // In production: call Resend API
    onSent()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-7 py-5 border-b border-rise-border flex items-center justify-between">
          <h2 className="font-serif text-rise-dark text-xl">Dokument per E-Mail senden</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Attachment */}
          {doc && (
            <div className="flex items-center gap-3 p-4 bg-rise-bg rounded-xl border border-rise-border">
              <svg className="w-5 h-5 text-rise-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              <span className="text-sm text-rise-dark font-medium truncate">{doc.filename}</span>
            </div>
          )}

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-rise-muted uppercase tracking-widest mb-2">Empfänger</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-sans text-rise-dark bg-white border border-rise-border rounded-xl focus:outline-none focus:border-rise-muted transition-colors"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-rise-muted uppercase tracking-widest mb-2">Betreff</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-sans text-rise-dark bg-white border border-rise-border rounded-xl focus:outline-none focus:border-rise-muted transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-rise-muted uppercase tracking-widest mb-2">Nachricht</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 text-sm font-sans text-rise-dark bg-white border border-rise-border rounded-xl focus:outline-none focus:border-rise-muted transition-colors resize-none"
            />
          </div>
        </div>

        <div className="px-7 py-5 border-t border-rise-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium font-sans text-rise-muted bg-white border border-rise-border rounded-xl hover:bg-rise-bg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            className="px-5 py-2.5 text-sm font-medium font-sans text-white bg-rise-dark rounded-xl hover:bg-rise-dark/90 transition-colors inline-flex items-center gap-2"
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

function Toast({ message, variant = 'success', onClose }) {
  const isError = variant === 'error'
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-sans text-white ${isError ? 'bg-red-700' : 'bg-gray-900'}`}>
      {isError ? (
        <svg className="w-4 h-4 text-red-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
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

  const fallback = MOCK_CASES_BY_ID[id] ?? MOCK_CASES_BY_ID['mock-001']
  const [caseEntry, setCaseEntry] = useState(fallback)
  const c = caseEntry.case
  const caseDocs = caseEntry.documents
  const caseActivity = caseEntry.activity
  const caseMessages = caseEntry.messages

  const [tab, setTab] = useState('uebersicht')
  const [status, setStatus] = useState(c.status)
  const [notes, setNotes] = useState(c.internal_notes)

  useEffect(() => {
    if (isDemoMode) return
    supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setCaseEntry(prev => ({ ...prev, case: data }))
          setStatus(data.status)
          setNotes(data.internal_notes ?? '')
        }
      })
  }, [id])
  const [loadingDoc, setLoadingDoc] = useState(null)
  const [emailModal, setEmailModal] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [toast, setToast] = useState(null)

  // HR document state
  const [hrDocs, setHrDocs] = useState(null)       // null = not fetched, [] = none found
  const [hrDocsLoading, setHrDocsLoading] = useState(false)
  const [hrDocsError, setHrDocsError] = useState(null)
  const [hrDownloading, setHrDownloading] = useState(null) // key of currently downloading doc


  function showToast(msg, variant = 'success') {
    setToast({ msg, variant })
    setTimeout(() => setToast(null), 5000)
  }

  // Parse register data from case
  const { registerArt, registerNummer } = parseHRBNummer(c.hrb_nummer)
  const registerGericht = parseGericht(c.registergericht)

  // Fetch HR document list when Dokumente tab is first opened
  useEffect(() => {
    if (tab !== 'dokumente') return
    if (hrDocs !== null || hrDocsLoading) return
    if (!registerArt || !registerNummer || !registerGericht) return

    setHrDocsLoading(true)
    setHrDocsError(null)

    const params = new URLSearchParams({ registerArt, registerNummer, registerGericht })
    fetch(`/api/hr-documents?${params}`)
      .then(r => r.json())
      .then(data => {
        setHrDocs(data.documents ?? [])
      })
      .catch(err => {
        setHrDocsError('Dokumentenliste konnte nicht geladen werden.')
        console.error('[AdminCaseDetail] hr-documents:', err)
      })
      .finally(() => setHrDocsLoading(false))
  }, [tab, hrDocs, hrDocsLoading, registerArt, registerNummer, registerGericht])


  const TABS = [
    { key: 'uebersicht',     label: 'Übersicht' },
    { key: 'dokumente',      label: 'Dokumente' },
    { key: 'aktivitaet',     label: 'Aktivität' },
    { key: 'kommunikation',  label: 'Kommunikation' },
  ]

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/admin" className="text-sm text-rise-muted hover:text-rise-dark transition-colors">
            Übersicht
          </Link>
          <svg className="w-3.5 h-3.5 text-rise-muted-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-rise-dark">{c.firma_name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-rise-border shadow-sm px-8 py-7 mb-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-rise-dark text-3xl">{c.firma_name}</h1>
                <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-mono text-rise-muted bg-rise-bg border border-rise-border">
                  {c.firma_rechtsform}
                </span>
              </div>
              <p className="text-sm text-rise-muted">
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
                  className="text-sm font-sans text-rise-dark bg-white border border-rise-border rounded-xl px-3 py-2 focus:outline-none focus:border-rise-muted transition-colors cursor-pointer"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Quick actions */}
              <button
                onClick={() => setShowEmailModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium font-sans text-rise-muted bg-white border border-rise-border rounded-xl hover:bg-rise-bg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                E-Mail senden
              </button>
              <button
                onClick={() => setTab('dokumente')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium font-sans text-white bg-rise-dark rounded-xl hover:bg-rise-dark/90 transition-colors"
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
            <div className="flex gap-0 border-b border-rise-border mb-7">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-5 py-3.5 font-sans text-sm font-medium border-b-2 -mb-px transition-all duration-200 ${
                    tab === t.key
                      ? 'border-rise-coral text-rise-dark'
                      : 'border-transparent text-rise-muted hover:text-rise-dark'
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
                <div className="bg-white rounded-2xl border border-rise-border shadow-sm p-6">
                  <p className="text-xs font-medium text-rise-muted uppercase tracking-widest mb-5">Neues Dokument erstellen</p>
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
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border font-sans text-sm font-medium transition-colors ${
                          loadingDoc === type
                            ? 'bg-rise-bg border-rise-border text-rise-muted-light cursor-not-allowed'
                            : 'bg-white border-rise-border text-rise-dark hover:bg-rise-bg hover:border-rise-muted-light'
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

                {/* ── Handelsregister-Dokumente ─────────────────────── */}
                {registerArt && registerNummer && registerGericht && (
                  <div className="bg-white rounded-2xl border border-rise-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-l-4 border-blue-400 bg-blue-50 flex items-center justify-between">
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-widest">
                        Handelsregister-Dokumente
                      </p>
                      {hrDocs !== null && !hrDocsLoading && (
                        <button
                          onClick={() => { setHrDocs(null); setHrDocsError(null) }}
                          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          Aktualisieren
                        </button>
                      )}
                    </div>

                    {/* Loading */}
                    {hrDocsLoading && (
                      <div className="flex items-center gap-3 px-6 py-5 text-sm text-rise-muted">
                        <svg className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Lade Dokumente vom Handelsregister…
                      </div>
                    )}

                    {/* Error */}
                    {hrDocsError && !hrDocsLoading && (
                      <div className="flex items-start gap-3 px-6 py-5">
                        <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-sm text-red-600">{hrDocsError}</p>
                      </div>
                    )}

                    {/* Document list — flat, like handelsregister.ai */}
                    {!hrDocsLoading && !hrDocsError && hrDocs !== null && (
                      <div>
                        {hrDocs.length === 0 ? (
                          <p className="px-6 py-8 text-sm text-rise-muted text-center">
                            Keine Dokumente im Handelsregister gefunden.
                          </p>
                        ) : (() => {
                          const hasDK = hrDocs.some(d => d.type === 'DK')

                          // Fixed document definitions — same order as handelsregister.ai
                          const docRows = [
                            hasDK && {
                              id: 'DK:gesellschafterliste',
                              label: 'Gesellschafterliste',
                              sublabel: 'Aktuellste verfügbare Version',
                              docType: 'DK',
                              docId: 'gesellschafterliste',
                              icon: (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                </svg>
                              ),
                            },
                            hasDK && {
                              id: 'DK:satzung',
                              label: 'Gesellschaftervertrag / Satzung / Statut',
                              sublabel: 'Aktuellste verfügbare Version',
                              docType: 'DK',
                              docId: 'satzung',
                              icon: (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                </svg>
                              ),
                            },
                            hrDocs.find(d => d.type === 'CD') && {
                              id: 'CD:',
                              label: 'Chronologischer Handelsregisterabdruck',
                              sublabel: 'CD — vollständige Historie',
                              docType: 'CD',
                              docId: '',
                              icon: (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                </svg>
                              ),
                            },
                            hrDocs.find(d => d.type === 'AD') && {
                              id: 'AD:',
                              label: 'Aktueller Handelsregisterabdruck',
                              sublabel: 'AD — aktueller Stand',
                              docType: 'AD',
                              docId: '',
                              icon: (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                              ),
                            },
                            hrDocs.find(d => d.type === 'SI') && {
                              id: 'SI:',
                              label: 'Strukturiertes Inhaltsdokument',
                              sublabel: 'SI — maschinenlesbares XML',
                              docType: 'SI',
                              docId: '',
                              icon: (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                </svg>
                              ),
                            },
                          ].filter(Boolean)

                          return (
                            <div className="divide-y divide-rise-border">
                              {docRows.map(row => {
                                const loading = hrDownloading === row.id
                                return (
                                  <div key={row.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-rise-bg transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
                                        {row.icon}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-rise-dark truncate">{row.label}</p>
                                        <p className="text-xs text-rise-muted mt-0.5">{row.sublabel}</p>
                                      </div>
                                    </div>
                                    <button
                                      disabled={hrDownloading !== null}
                                      onClick={() => downloadHRDocument(registerArt, registerNummer, registerGericht, row.docType, row.docId, setHrDownloading, showToast)}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-sans rounded-lg border transition-colors flex-shrink-0 ${
                                        loading
                                          ? 'bg-blue-50 border-blue-200 text-blue-400 cursor-not-allowed'
                                          : hrDownloading
                                            ? 'bg-rise-bg border-rise-border text-rise-muted-light cursor-not-allowed'
                                            : 'bg-white border-rise-border text-rise-muted hover:bg-rise-bg hover:text-rise-dark'
                                      }`}
                                    >
                                      {loading ? (
                                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                      )}
                                      {loading ? 'Lade…' : 'Herunterladen'}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Document list */}
                <div className="bg-white rounded-2xl border border-rise-border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-l-4 border-rise-coral bg-rise-bg-warm">
                    <p className="text-xs font-medium text-rise-muted uppercase tracking-widest">Vorhandene Dokumente</p>
                  </div>
                  {caseDocs.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-rise-muted">Keine Dokumente vorhanden.</p>
                  ) : (
                    <div className="divide-y divide-rise-border">
                      {caseDocs.map(d => (
                        <div key={d.id} className="flex items-center gap-5 px-6 py-5 hover:bg-rise-bg transition-colors">
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-xl bg-rise-bg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-rise-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>

                          {/* Name + type */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-medium text-rise-dark truncate">{d.filename}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-rise-muted">{DOC_TYPE_LABEL[d.type] ?? d.type}</span>
                              <span className="text-rise-border">·</span>
                              <span className="text-xs text-rise-muted">{formatDateShort(d.created_at)}</span>
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
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium font-sans text-white bg-rise-dark rounded-xl hover:bg-rise-dark/90 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                              </svg>
                              Per E-Mail
                            </button>
                            <button className="px-3.5 py-2 text-xs font-medium font-sans text-rise-muted bg-white border border-rise-border rounded-xl hover:bg-rise-bg transition-colors">
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
              <div className="bg-white rounded-2xl border border-rise-border shadow-sm p-7">
                <div className="space-y-0">
                  {caseActivity.map((a, i) => (
                    <div key={a.id} className="flex gap-5">
                      <div className="flex flex-col items-center">
                        <div className={`w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0 ring-2 ring-white ${
                          a.actor === 'admin' ? 'bg-rise-dark' : 'bg-rise-muted-light'
                        }`} />
                        {i < caseActivity.length - 1 && (
                          <div className="w-px bg-rise-border flex-1 my-1.5" />
                        )}
                      </div>
                      <div className="pb-8">
                        <p className="text-[15px] font-medium text-rise-dark">{a.action}</p>
                        {a.detail && (
                          <p className="text-sm text-rise-muted mt-1">{a.detail}</p>
                        )}
                        <p className="text-xs text-rise-muted-light mt-1.5">
                          {formatDate(a.created_at)}
                          <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs ${
                            a.actor === 'admin' ? 'bg-rise-bg text-rise-muted' : 'bg-rise-bg text-rise-muted-light'
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
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium font-sans text-white bg-rise-dark rounded-xl hover:bg-rise-dark/90 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Neue Nachricht
                  </button>
                </div>

                <div className="space-y-4">
                  {caseMessages.map(m => (
                    <div
                      key={m.id}
                      className="bg-white rounded-2xl border border-rise-border shadow-sm overflow-hidden"
                    >
                      <div className={`px-6 py-4 border-b flex items-center justify-between ${
                        m.type === 'email_in'
                          ? 'bg-rise-bg-warm border-rise-border'
                          : 'bg-blue-50 border-blue-100'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            m.type === 'email_in' ? 'bg-rise-muted-light' : 'bg-blue-500'
                          }`} />
                          <span className="text-xs font-medium text-rise-muted uppercase tracking-wider">
                            {m.type === 'email_in' ? 'Eingehend' : 'Ausgehend'}
                          </span>
                          <span className="text-rise-border">·</span>
                          <span className="text-sm text-rise-dark font-medium">{m.subject}</span>
                        </div>
                        <span className="text-xs text-rise-muted-light">{formatDate(m.created_at)}</span>
                      </div>
                      <div className="px-6 py-5">
                        <div className="flex gap-1.5 text-xs text-rise-muted-light mb-4">
                          <span>Von: <span className="text-rise-muted">{m.from}</span></span>
                          <span>→</span>
                          <span>An: <span className="text-rise-muted">{m.to}</span></span>
                        </div>
                        <p className="text-sm text-rise-dark whitespace-pre-line leading-relaxed">{m.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* Handelsregister */}
            {c.hrb_nummer && (
              <div className="bg-white rounded-2xl border border-rise-border shadow-sm p-5">
                <p className="text-xs font-medium text-rise-muted uppercase tracking-widest mb-4">Handelsregister</p>
                <p className="text-sm font-medium text-rise-dark mb-1">{c.hrb_nummer}</p>
                <p className="text-xs text-rise-muted mb-4">{c.registergericht}</p>
                {c.hr_validated ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Validiert
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-1 rounded-full bg-rise-bg text-rise-muted text-xs font-medium mb-3">
                    Nicht validiert
                  </span>
                )}
                <a
                  href={`https://www.handelsregister.de/rp_web/mask.do?Typ=e&Schlagwort=${encodeURIComponent(c.firma_name)}&Bundesland=0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4 text-xs font-medium text-rise-muted hover:text-rise-dark transition-colors"
                >
                  Im HR prüfen →
                </a>
              </div>
            )}

            {/* Satzung */}
            {c.satzung_filename && (
              <div className="bg-white rounded-2xl border border-rise-border shadow-sm p-5">
                <p className="text-xs font-medium text-rise-muted uppercase tracking-widest mb-3">Satzung</p>
                <p className="text-sm text-rise-dark mb-3 break-all">{c.satzung_filename}</p>
                <button className="text-xs font-medium text-rise-muted hover:text-rise-dark transition-colors">
                  Herunterladen →
                </button>
              </div>
            )}

            {/* Internal notes */}
            <div className="bg-white rounded-2xl border border-rise-border shadow-sm p-5">
              <p className="text-xs font-medium text-rise-muted uppercase tracking-widest mb-3">Interne Notizen</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notizen hinzufügen…"
                rows={5}
                className="w-full text-sm font-sans text-rise-dark bg-rise-bg border border-rise-border rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:border-rise-muted transition-colors placeholder:text-rise-muted-light"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email modal — from document list */}
      {emailModal && (
        <EmailModal
          doc={emailModal}
          caseData={c}
          onClose={() => setEmailModal(null)}
          onSent={() => showToast('E-Mail wurde erfolgreich gesendet.', 'success')}
        />
      )}

      {/* Email modal — from header "E-Mail senden" button */}
      {showEmailModal && (
        <EmailModal
          doc={null}
          caseData={c}
          onClose={() => setShowEmailModal(false)}
          onSent={() => showToast('E-Mail wurde erfolgreich gesendet.', 'success')}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
