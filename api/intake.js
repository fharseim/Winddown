import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const data = req.body

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Rise <noreply@risestartup.eu>',
          to: ['hello@risestartup.eu'],
          subject: `Neue Intake-Anfrage: ${data.firmenname || 'Unbekannt'}`,
          html: buildEmailHtml(data),
        }),
      })
    } catch (err) {
      console.error('Resend error:', err)
    }
  }

  // Store in Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && supabaseServiceKey) {
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
        satzung_filename: data.satzungFilename || null,
        status: 'intake',
      })
    } catch (err) {
      console.error('Supabase error:', err)
    }
  }

  return res.status(200).json({ success: true })
}

function buildEmailHtml(d) {
  const row = (label, value) =>
    value ? `<tr><td style="padding:4px 12px 4px 0;color:#78716C;white-space:nowrap">${label}</td><td style="padding:4px 0;color:#1C1917">${value}</td></tr>` : ''

  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1C1917">
  <h2 style="font-size:18px;margin-bottom:16px">Neue Intake-Anfrage</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row('Name', d.name)}
    ${row('E-Mail', d.email)}
    ${row('Telefon', d.telefon)}
    ${row('Rolle', d.rolle)}
    ${row('Firma', d.firmenname)}
    ${row('Rechtsform', d.rechtsform)}
    ${row('Gründungsjahr', d.gruendungsjahr)}
    ${row('Sitz', d.sitz)}
    ${row('Operativ aktiv', d.operativAktiv)}
    ${row('Mitarbeiter', d.hatMitarbeiter)}
    ${row('Anzahl Mitarbeiter', d.mitarbeiterAnzahl)}
    ${row('Verbindlichkeiten', d.offeneVerbindlichkeiten)}
    ${row('JA aktuell', d.jahresabschluesseAktuell)}
    ${row('JA Rückstand', d.jahreRueckstand)}
    ${row('Steuerberater', d.hatSteuerberater)}
    ${row('Gesellschafter', d.gesellschafterAnzahl)}
    ${row('VSOP/ESOP', d.hatVSOPESOP)}
    ${row('Investoren', d.hatInstitutionelleInvestoren)}
    ${row('Vermögensfrei', d.vermogenSchuldenfrei)}
    ${row('Satzung', d.satzungFilename)}
  </table>
</div>
`
}
