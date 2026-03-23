import {
  Document,
  Paragraph,
  TextRun,
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
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function run(text, opts = {}) {
  return new TextRun({ text, font: 'Calibri', size: 22, ...opts })
}

function bold(text, opts = {}) {
  return run(text, { bold: true, ...opts })
}

function para(runs, options = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [run(runs)],
    spacing: { after: 160 },
    ...options,
  })
}

function heading(text) {
  return new Paragraph({
    children: [run(text, { bold: true, size: 24, color: '1a1a1a' })],
    spacing: { before: 320, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
    },
  })
}

function emptyLine() {
  return new Paragraph({ children: [], spacing: { after: 80 } })
}

function letterhead() {
  return [
    new Paragraph({
      children: [run('RISE', { bold: true, size: 36, color: 'cc5533' })],
      spacing: { after: 40 },
    }),
    para([run('Riseq GmbH · Frankfurt', { size: 18, color: '888888' })]),
    para([run('hello@risestartup.eu', { size: 18, color: '888888' })]),
    new Paragraph({
      children: [],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'cc5533', space: 4 },
      },
      spacing: { after: 120 },
    }),
    para([run('Rise begleitet Sie durch den gesamten Abwicklungsprozess — von der ersten Analyse bis zur Löschung im Handelsregister.', { size: 20, color: '888888', italics: true })], { spacing: { after: 240 } }),
  ]
}

function tableRow(label, value, isTotal = false) {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [run(label, { bold: isTotal, size: isTotal ? 24 : 22 })],
            spacing: { after: 0 },
          }),
        ],
        width: { size: 75, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'eeeeee' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'eeeeee' },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        margins: { top: 80, bottom: 80, left: 0, right: 0 },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [run(value, { bold: isTotal, size: isTotal ? 24 : 22, color: isTotal ? 'cc5533' : '1a1a1a' })],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 0 },
          }),
        ],
        width: { size: 25, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'eeeeee' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'eeeeee' },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        margins: { top: 80, bottom: 80, left: 0, right: 0 },
      }),
    ],
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateKostenangebot(caseData) {
  const pricing = calculatePricing(caseData)
  const date = germanDate()
  const expiryDate = germanDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

  const isFastTrack = caseData.vermoegensfrei === 'ja'

  // Addressee
  const addressee = [
    para([bold(caseData.contact_name || '—')]),
    para(caseData.firma_name || '—'),
    emptyLine(),
    para([run(`Frankfurt, ${date}`, { size: 20, italics: true })]),
    emptyLine(),
  ]

  // Title
  const title = [
    new Paragraph({
      children: [run('Kostenangebot', { bold: true, size: 40, color: '1a1a1a' })],
      spacing: { before: 160, after: 80 },
    }),
    para([run(`Betreff: ${caseData.firma_name || 'Ihr Unternehmen'} – Liquidation und Auflösung`, { size: 22, italics: true, color: '666666' })]),
    emptyLine(),
  ]

  // Section 1: Bezugnahme
  const section1 = [
    heading('1. Bezugnahme auf Ersteinschätzung'),
    para([
      run('Im Anschluss an unsere Ersteinschätzung für '),
      bold(caseData.firma_name || 'Ihre Gesellschaft'),
      run(` (${caseData.firma_rechtsform || 'GmbH'}, Sitz: ${caseData.firma_sitz || 'Deutschland'}) unterbreiten wir Ihnen nachfolgendes Kostenangebot für die vollständige Begleitung der Liquidation.`),
    ]),
    isFastTrack
      ? para('Aufgrund der Vermögensfreiheit der Gesellschaft empfehlen wir das vereinfachte Verfahren nach § 394 FamFG, das erheblich schneller und kostengünstiger ist als ein reguläres Liquidationsverfahren.')
      : para('Die Gesellschaft durchläuft ein reguläres Liquidationsverfahren, das ein Sperrjahr von 12 Monaten umfasst.'),
  ]

  // Section 2: Leistungsumfang
  const leistungen = isFastTrack
    ? [
        'Vorbereitung des Gesellschafterbeschlusses über die Auflösung',
        'Anmeldung der Auflösung zum Handelsregister',
        'Koordination des Antrags nach § 394 FamFG',
        'Begleitung bis zur Löschung im Handelsregister',
        'Laufende Kommunikation mit Behörden und Registergericht',
        'Einzel-Ansprechpartner für alle Rückfragen',
      ]
    : [
        'Vorbereitung und Durchführung des Gesellschafterbeschlusses über die Auflösung',
        'Anmeldung der Auflösung und des Liquidators zum Handelsregister',
        'Gläubigeraufruf im Bundesanzeiger',
        'Begleitung des Sperrjahres (12 Monate)',
        ...(Number(caseData.rueckstand_jahre) > 0 ? [`Altjahre-Cleanup: Koordination und Nachholung von ${caseData.rueckstand_jahre} offenen Jahresabschlüssen`] : []),
        'Koordination Schlussverteilung an Gesellschafter',
        'Anmeldung der Vollbeendigung und Löschung im Handelsregister',
        'Laufende Kommunikation mit Behörden, Registergericht und Finanzamt',
        'Einzel-Ansprechpartner für alle Rückfragen',
      ]

  const section2 = [
    heading('2. Leistungsumfang'),
    para('Rise übernimmt vollständig:'),
    ...leistungen.map(l =>
      new Paragraph({
        children: [run(l)],
        bullet: { level: 0 },
        spacing: { after: 80 },
      }),
    ),
  ]

  // Section 3: Kostenaufstellung
  const tableRows = [
    ...pricing.breakdown.map(item => tableRow(item.label, formatEUR(item.amount))),
    tableRow('Gesamtbetrag (netto)', formatEUR(pricing.total), true),
    tableRow('zzgl. 19 % MwSt.', formatEUR(Math.round(pricing.total * 0.19)), false),
    tableRow('Gesamtbetrag (brutto)', formatEUR(Math.round(pricing.total * 1.19)), true),
  ]

  const section3 = [
    heading('3. Kostenaufstellung'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideH: { style: BorderStyle.NONE },
        insideV: { style: BorderStyle.NONE },
      },
      rows: tableRows,
    }),
    emptyLine(),
  ]

  // Section 4: Zahlungsbedingungen
  const section4 = [
    heading('4. Zahlungsbedingungen'),
    para('Die Vergütung wird wie folgt fällig:'),
    new Paragraph({
      children: [run('50 % bei Beauftragung (Anzahlung)')],
      bullet: { level: 0 },
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [run('50 % nach Anmeldung der Auflösung zum Handelsregister')],
      bullet: { level: 0 },
      spacing: { after: 80 },
    }),
    para('Zahlungsziel: 14 Tage nach Rechnungsstellung.'),
  ]

  // Section 5: Gültigkeit
  const section5 = [
    heading('5. Gültigkeit'),
    para([
      run('Dieses Angebot ist gültig bis zum '),
      bold(expiryDate),
      run('. Nach Ablauf dieser Frist behalten wir uns eine Anpassung der Konditionen vor.'),
    ]),
    emptyLine(),
    para('Wir freuen uns auf eine erfolgreiche Zusammenarbeit und stehen für Rückfragen jederzeit zur Verfügung.'),
    emptyLine(),
    para('Mit freundlichen Grüßen'),
    emptyLine(),
    emptyLine(),
    para([bold('Riseq GmbH')]),
    para('Frankfurt'),
    para([run('hello@risestartup.eu', { color: 'cc5533' })]),
  ]

  // Signature line
  const signatureLine = [
    emptyLine(),
    new Paragraph({
      children: [],
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
      },
      spacing: { before: 480, after: 80 },
    }),
    para([
      run('Riseq GmbH · Frankfurt · hello@risestartup.eu', {
        size: 18,
        color: '888888',
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
          ...signatureLine,
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
