import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
} from 'docx'
import { calculatePricing, formatEUR } from '../lib/pricing.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function germanDate(date = new Date()) {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function bold(text) {
  return new TextRun({ text, bold: true, font: 'Calibri', size: 22 })
}

function normal(text) {
  return new TextRun({ text, font: 'Calibri', size: 22 })
}

function para(runs, options = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [normal(runs)],
    spacing: { after: 160 },
    ...options,
  })
}

function heading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: 24, color: '1a1a1a' })],
    spacing: { before: 320, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
    },
  })
}

function bullet(text) {
  return new Paragraph({
    children: [normal(text)],
    bullet: { level: 0 },
    spacing: { after: 80 },
  })
}

function emptyLine() {
  return new Paragraph({ children: [], spacing: { after: 80 } })
}

// ─── Letterhead ───────────────────────────────────────────────────────────────

function letterhead() {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'RISE',
          bold: true,
          font: 'Calibri',
          size: 36,
          color: 'cc5533',
        }),
      ],
      spacing: { after: 40 },
    }),
    para([new TextRun({ text: 'Riseq GmbH · Frankfurt', font: 'Calibri', size: 18, color: '888888' })]),
    para([new TextRun({ text: 'hello@risestartup.eu', font: 'Calibri', size: 18, color: '888888' })]),
    new Paragraph({
      children: [],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'cc5533', space: 4 },
      },
      spacing: { after: 240 },
    }),
  ]
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateErsteinschaetzung(caseData) {
  const pricing = calculatePricing(caseData)
  const date = germanDate()

  const isFastTrack = caseData.vermoegensfrei === 'ja'
  const hasCreditors = caseData.glaeubiger === 'ja'
  const rueckstandJahre = Number(caseData.rueckstand_jahre) || 0

  // Build addressee block
  const addressee = [
    para([bold(caseData.contact_name || '—')]),
    para(caseData.firma_name || '—'),
    emptyLine(),
    para([new TextRun({ text: `Frankfurt, ${date}`, font: 'Calibri', size: 20, italics: true })]),
    emptyLine(),
  ]

  // Title
  const title = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Ersteinschätzung',
          bold: true,
          font: 'Calibri',
          size: 40,
          color: '1a1a1a',
        }),
      ],
      spacing: { before: 160, after: 80 },
    }),
    para([
      new TextRun({
        text: `Betreff: ${caseData.firma_name || 'Ihr Unternehmen'} – Auflösung und Liquidation`,
        font: 'Calibri',
        size: 22,
        italics: true,
        color: '666666',
      }),
    ]),
    emptyLine(),
  ]

  // Section 1: Zusammenfassung
  const section1 = [
    heading('1. Zusammenfassung der Situation'),
    para([
      normal(`Die ${caseData.firma_rechtsform || 'GmbH'} ${caseData.firma_name || '—'}`),
      normal(` wurde ${caseData.firma_gruendungsjahr ? `im Jahr ${caseData.firma_gruendungsjahr} gegründet` : 'gegründet'}`),
      normal(` und hat ihren Sitz in ${caseData.firma_sitz || 'Deutschland'}.`),
    ]),
    para([
      normal(`Die Gesellschaft ist `),
      bold(caseData.operativ_aktiv ? 'operativ aktiv' : 'nicht mehr operativ tätig'),
      normal('. '),
      caseData.mitarbeiter
        ? normal(`Es ${caseData.mitarbeiter_anzahl === 1 ? 'beschäftigt' : 'beschäftigen'} sich ${caseData.mitarbeiter_anzahl || 'keine'} Mitarbeiter in der Gesellschaft.`)
        : normal('Die Gesellschaft hat keine Mitarbeiter.'),
    ]),
    para([
      normal('Gläubiger sind '),
      bold(hasCreditors ? 'vorhanden' : 'nicht vorhanden'),
      normal('.'),
    ]),
  ]

  // Section 2: Handelsregister
  const section2 = [
    heading('2. Handelsregister-Daten'),
  ]
  if (caseData.hrb_nummer) {
    section2.push(
      para([bold('HRB-Nummer: '), normal(caseData.hrb_nummer)]),
    )
    if (caseData.firma_sitz) {
      section2.push(
        para([bold('Registergericht: '), normal(`Amtsgericht ${caseData.firma_sitz}`)]),
      )
    }
    section2.push(
      para(caseData.hr_validated
        ? 'Die Handelsregisterdaten wurden validiert.'
        : 'Die Handelsregisterdaten wurden noch nicht abschließend validiert und sind der Überprüfung bedürftig.'),
    )
  } else {
    section2.push(para('Handelsregisterdaten liegen noch nicht vor und sind im Rahmen des Verfahrens zu ermitteln.'))
  }

  // Section 3: Steuerliche Situation
  const section3 = [
    heading('3. Steuerliche Situation'),
    para([
      bold('Jahresabschlüsse: '),
      normal(caseData.jahresabschluesse_aktuell
        ? 'Jahresabschlüsse sind aktuell.'
        : `Jahresabschlüsse sind nicht aktuell. Es besteht ein Rückstand von ${rueckstandJahre > 0 ? rueckstandJahre + ' Jahr' + (rueckstandJahre !== 1 ? 'en' : '') : 'unbekannter Dauer'}.`),
    ]),
    para([
      bold('Steuerberater: '),
      normal(caseData.steuerberater ? 'Ein Steuerberater ist beauftragt.' : 'Kein Steuerberater vorhanden.'),
    ]),
    rueckstandJahre > 0
      ? para([
          normal(`Der bestehende Rückstand von ${rueckstandJahre} Jahr${rueckstandJahre !== 1 ? 'en' : ''} erfordert eine Nachholung der Jahresabschlüsse sowie ggf. Offenlegungen im Bundesanzeiger vor Abschluss der Liquidation.`),
        ])
      : emptyLine(),
  ]

  // Section 4: Gesellschafterstruktur
  const gesellschafterAnzahl = Number(caseData.gesellschafter_anzahl) || 1
  const section4 = [
    heading('4. Gesellschafterstruktur'),
    para([bold('Anzahl Gesellschafter: '), normal(String(gesellschafterAnzahl))]),
    para([
      bold('VSOP/ESOP: '),
      normal(caseData.vsop_esop === 'ja' ? 'Vorhanden. Die Behandlung virtueller Anteile im Rahmen der Liquidation ist gesondert zu klären.' : 'Nicht vorhanden.'),
    ]),
    para([
      bold('Institutionelle Investoren: '),
      normal(caseData.investoren ? 'Vorhanden. Deren Zustimmung zum Auflösungsbeschluss und ggf. Liquidationspräferenz sind zu berücksichtigen.' : 'Nicht vorhanden.'),
    ]),
  ]

  // Section 5: §394 FamFG
  const section5 = [
    heading('5. Einschätzung nach § 394 FamFG'),
  ]
  if (isFastTrack) {
    section5.push(
      para([
        bold('Die Voraussetzungen für eine vereinfachte Löschung nach § 394 FamFG sind voraussichtlich erfüllt.'),
      ]),
      para(
        'Da die Gesellschaft vermögensfrei ist, kann das Registergericht die Gesellschaft auf Antrag ohne vollständiges Liquidationsverfahren (d.h. ohne Sperrjahr) von Amts wegen löschen. ' +
        'Dies verkürzt das Verfahren erheblich und reduziert die Kosten.',
      ),
    )
  } else {
    section5.push(
      para(
        'Die Voraussetzungen für eine vereinfachte Löschung nach § 394 FamFG liegen nicht vor, ' +
        'da die Gesellschaft nicht als vermögensfrei gilt. Es ist ein reguläres Liquidationsverfahren mit Sperrjahr durchzuführen.',
      ),
    )
  }

  // Section 6: Empfohlenes Vorgehen
  const section6 = [
    heading('6. Empfohlenes Vorgehen'),
  ]
  if (isFastTrack) {
    section6.push(
      para([bold('Vereinfachtes Verfahren nach § 394 FamFG:')]),
      bullet('Gesellschafterbeschluss über Auflösung der Gesellschaft'),
      bullet('Anmeldung der Auflösung zum Handelsregister'),
      bullet('Antrag auf Löschung nach § 394 FamFG beim Registergericht'),
      bullet('Löschung der Gesellschaft im Handelsregister'),
    )
  } else {
    section6.push(
      para([bold('Reguläres Liquidationsverfahren:')]),
      bullet('Gesellschafterbeschluss über Auflösung (Auflösungsbeschluss)'),
      bullet('Anmeldung der Auflösung und des Liquidators zum Handelsregister'),
      bullet('Gläubigeraufruf im Bundesanzeiger'),
      bullet('Sperrjahr (12 Monate)'),
      bullet('Nachholung offener Jahresabschlüsse und Steuererklärungen'),
      bullet('Schlussverteilung des verbleibenden Vermögens an die Gesellschafter'),
      bullet('Anmeldung der Vollbeendigung und Löschung im Handelsregister'),
    )
  }

  // Section 7: Geschätzte Kosten
  const section7 = [
    heading('7. Geschätzte Kosten'),
    para('Die Kostenabschätzung basiert auf den im Rahmen der Ersteinschätzung erfassten Angaben. Ein verbindliches Festpreisangebot erhalten Sie separat.'),
    emptyLine(),
  ]

  pricing.breakdown.forEach(item => {
    section7.push(
      para([bold(`${item.label}: `), normal(formatEUR(item.amount))]),
    )
  })

  section7.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Gesamtbetrag: ${formatEUR(pricing.total)}`, bold: true, font: 'Calibri', size: 24, color: 'cc5533' }),
      ],
      spacing: { before: 160, after: 160 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
      },
    }),
    para([new TextRun({ text: 'Alle Preise zzgl. gesetzlicher MwSt.', font: 'Calibri', size: 18, italics: true, color: '888888' })]),
  )

  // Section 8: Nächste Schritte
  const section8 = [
    heading('8. Nächste Schritte'),
    bullet('Rückfragen zu dieser Ersteinschätzung klären'),
    bullet('Unterlagen zusammenstellen (Satzung, letzte Jahresabschlüsse, HR-Auszug)'),
    bullet('Verbindliches Kostenangebot von Rise einholen'),
    bullet('Gesellschafterbeschluss herbeiführen'),
    emptyLine(),
    para([
      normal('Wir stehen Ihnen für Rückfragen jederzeit zur Verfügung: '),
      new TextRun({ text: 'hello@risestartup.eu', font: 'Calibri', size: 22, color: 'cc5533' }),
    ]),
  ]

  // Footer note
  const footer = [
    emptyLine(),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Riseq GmbH · Frankfurt · hello@risestartup.eu',
          font: 'Calibri',
          size: 18,
          color: '888888',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'eeeeee', space: 6 },
      },
      spacing: { before: 480 },
    }),
    para([
      new TextRun({
        text: 'Dieses Dokument stellt keine Rechtsberatung dar. Ersteinschätzungen dienen der ersten Orientierung.',
        font: 'Calibri',
        size: 16,
        color: 'aaaaaa',
        italics: true,
      }),
    ]),
  ]

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          ...letterhead(),
          ...addressee,
          ...title,
          ...section1,
          ...section2,
          ...section3,
          ...section4,
          ...section5,
          ...section6,
          ...section7,
          ...section8,
          ...footer,
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
