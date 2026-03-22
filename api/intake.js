import Busboy from 'busboy'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

// ─── Multipart parser ─────────────────────────────────────────────────────────

function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    const fields = {}
    const files = {}

    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (name, stream, info) => {
      const chunks = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        files[name] = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType,
        }
      })
    })

    busboy.on('finish', () => resolve({ fields, files }))
    busboy.on('error', reject)

    req.pipe(busboy)
  })
}

// ─── HTML email builder ───────────────────────────────────────────────────────

const LABELS = {
  name: 'Name',
  email: 'E-Mail',
  telefon: 'Telefon',
  rolle: 'Rolle',
  firmenname: 'Firmenname',
  rechtsform: 'Rechtsform',
  gruendungsjahr: 'Gründungsjahr',
  sitz: 'Sitz',
  operativAktiv: 'Operativ aktiv',
  hatMitarbeiter: 'Mitarbeiter vorhanden',
  mitarbeiterAnzahl: 'Anzahl Mitarbeiter',
  offeneVerbindlichkeiten: 'Offene Verbindlichkeiten',
  jahresabschluesseAktuell: 'Jahresabschlüsse aktuell',
  jahreRueckstand: 'Jahre Rückstand',
  hatSteuerberater: 'Steuerberater vorhanden',
  gesellschafterAnzahl: 'Gesellschafter',
  hatVSOPESOP: 'VSOP/ESOP vorhanden',
  hatInstitutionelleInvestoren: 'Institutionelle Investoren',
  vermogenSchuldenfrei: 'Vermögens- und schuldenfrei',
}

const ROLE_LABELS = {
  gruender: 'Gründer',
  geschaeftsfuehrer: 'Geschäftsführer',
  'vc-fonds': 'VC-Fonds',
  'anwalt-berater': 'Anwalt oder Berater',
}

const SECTIONS = [
  { title: 'Kontaktdaten', fields: ['name', 'email', 'telefon'] },
  { title: 'Rolle', fields: ['rolle'] },
  { title: 'Die Gesellschaft', fields: ['firmenname', 'rechtsform', 'gruendungsjahr', 'sitz'] },
  { title: 'Aktueller Status', fields: ['operativAktiv', 'hatMitarbeiter', 'mitarbeiterAnzahl', 'offeneVerbindlichkeiten'] },
  { title: 'Steuerliche Situation', fields: ['jahresabschluesseAktuell', 'jahreRueckstand', 'hatSteuerberater'] },
  { title: 'Gesellschafter & Beteiligungen', fields: ['gesellschafterAnzahl', 'hatVSOPESOP', 'hatInstitutionelleInvestoren'] },
  { title: '§ 394 FamFG', fields: ['vermogenSchuldenfrei'] },
]

function fmtVal(field, value) {
  if (!value) return '—'
  if (field === 'rolle') return ROLE_LABELS[value] || value
  if (value === 'ja') return 'Ja'
  if (value === 'nein') return 'Nein'
  if (value === 'unsicher') return 'Unsicher'
  return value
}

function buildHtmlEmail(data, hasSatzung) {
  let sectionsHtml = ''

  for (const section of SECTIONS) {
    const rows = section.fields
      .filter((f) => {
        if (f === 'mitarbeiterAnzahl' && data.hatMitarbeiter !== 'ja') return false
        if (f === 'jahreRueckstand' && data.jahresabschluesseAktuell !== 'nein') return false
        if (f === 'telefon' && !data[f]) return false
        return true
      })
      .map(
        (f) =>
          '<tr><td style="color:#6b6b6b;width:220px;padding:7px 16px 7px 0;border-bottom:1px solid #f4f4f4;font-size:13px;vertical-align:top">' + LABELS[f] + '</td><td style="padding:7px 0;border-bottom:1px solid #f4f4f4;font-size:13px;vertical-align:top">' + fmtVal(f, data[f]) + '</td></tr>'
      )
      .join('')

    if (rows) {
      sectionsHtml +=
        '<h2 style="font-size:11px;font-weight:600;color:#b05050;text-transform:uppercase;letter-spacing:0.15em;margin:28px 0 0;padding-bottom:6px;border-bottom:1px solid #e8e8e8">' + section.title + '</h2>' +
        '<table style="width:100%;border-collapse:collapse">' + rows + '</table>'
    }
  }

  const satzungBadge = hasSatzung
    ? '<p style="margin-top:20px"><span style="display:inline-block;background:#f4f4f4;color:#6b6b6b;font-size:11px;padding:3px 10px;border-radius:4px">Satzung als PDF angehängt</span></p>'
    : ''

  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px"><h1 style="font-size:22px;font-weight:400;color:#1a1a1a;margin-bottom:4px">Neue Intake-Anfrage</h1><p style="color:#6b6b6b;font-size:14px;margin-bottom:32px">Rise Ersteinschätzung — eingegangen über das Online-Formular</p>' + sectionsHtml + satzungBadge + '<p style="color:#9b9b9b;font-size:12px;margin-top:40px;border-top:1px solid #e8e8e8;padding-top:16px">Diese E-Mail wurde automatisch über das Rise Intake-Formular gesendet. Bitte antworten Sie direkt an ' + (data.email || 'die angegebene E-Mail-Adresse') + '.</p></body></html>'
}

// ─── Supabase insert ──────────────────────────────────────────────────────────

async function insertCase(data, satzungFilename) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    await supabase.from('cases').insert({
      contact_name: data.name,
      contact_email: data.email,
      contact_phone: data.telefon || null,
      rolle: data.rolle || null,
      firma_name: data.firmenname || null,
      firma_rechtsform: data.rechtsform || null,
      firma_gruendungsjahr: data.gruendungsjahr ? parseInt(data.gruendungsjahr) : null,
      firma_sitz: data.sitz || null,
      operativ_aktiv: data.operativAktiv === 'ja' ? true : data.operativAktiv === 'nein' ? false : null,
      mitarbeiter: data.hatMitarbeiter === 'ja' ? true : data.hatMitarbeiter === 'nein' ? false : null,
      mitarbeiter_anzahl: data.mitarbeiterAnzahl ? parseInt(data.mitarbeiterAnzahl) : null,
      glaeubiger: data.offeneVerbindlichkeiten || null,
      jahresabschluesse_aktuell: data.jahresabschluesseAktuell === 'ja' ? true : data.jahresabschluesseAktuell === 'nein' ? false : null,
      rueckstand_jahre: data.jahreRueckstand ? parseInt(data.jahreRueckstand) : null,
      steuerberater: data.hatSteuerberater === 'ja' ? true : data.hatSteuerberater === 'nein' ? false : null,
      gesellschafter_anzahl: data.gesellschafterAnzahl || null,
      vsop_esop: data.hatVSOPESOP || null,
      investoren: data.hatInstitutionelleInvestoren === 'ja' ? true : data.hatInstitutionelleInvestoren === 'nein' ? false : null,
      vermoegensfrei: data.vermogenSchuldenfrei || null,
      satzung_filename: satzungFilename || null,
      status: 'intake',
    })
  } catch (err) {
    console.error('[intake] Supabase error:', err)
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let fields, files
  try {
    ;({ fields, files } = await parseFormData(req))
  } catch (err) {
    return res.status(400).json({ error: 'Fehler beim Verarbeiten der Formulardaten.' })
  }

  let data
  try {
    data = JSON.parse(fields.data)
  } catch {
    return res.status(400).json({ error: 'Ungültige Formulardaten.' })
  }

  const satzungFile = files.satzung || null
  const hasSatzung = !!satzungFile

  const RESEND_API_KEY = process.env.RESEND_API_KEY

  if (!RESEND_API_KEY) {
    console.log('[intake] Kein RESEND_API_KEY konfiguriert. Formulardaten empfangen:', data)
    await insertCase(data, satzungFile?.filename)
    return res.status(200).json({ success: true })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)

    const attachments = hasSatzung
      ? [{ filename: satzungFile.filename || 'Satzung.pdf', content: satzungFile.buffer }]
      : []

    const { error } = await resend.emails.send({
      from: 'Rise Intake <noreply@risestartup.eu>',
      to: 'hello@risestartup.eu',
      replyTo: data.email,
      subject: 'Neue Intake-Anfrage: ' + (data.firmenname || 'Unbekannt') + ' — Rise Ersteinschätzung',
      html: buildHtmlEmail(data, hasSatzung),
      attachments,
    })

    if (error) {
      console.error('[intake] Resend-Fehler:', error)
      return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden.' })
    }

    await insertCase(data, satzungFile?.filename)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[intake] Unerwarteter Fehler:', err)
    return res.status(500).json({ error: 'Interner Serverfehler.' })
  }
}
