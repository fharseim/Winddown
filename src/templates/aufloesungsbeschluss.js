import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Packer,
} from 'docx'

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

function centered(runs, options = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [run(runs)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    ...options,
  })
}

function para(runs, options = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [run(runs)],
    spacing: { after: 160 },
    ...options,
  })
}

function justified(runs, options = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [run(runs)],
    alignment: AlignmentType.BOTH,
    spacing: { after: 160 },
    ...options,
  })
}

function emptyLine() {
  return new Paragraph({ children: [], spacing: { after: 160 } })
}

function divider() {
  return new Paragraph({
    children: [],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
    },
    spacing: { before: 160, after: 240 },
  })
}

function numberPara(number, text, subText = '') {
  return [
    new Paragraph({
      children: [bold(`${number}. `, { size: 22 }), bold(text, { size: 22 })],
      spacing: { before: 240, after: 80 },
    }),
    ...(subText ? [justified(subText)] : []),
  ]
}

function signatureLine(name) {
  return [
    emptyLine(),
    emptyLine(),
    new Paragraph({
      children: [],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 4 },
      },
      spacing: { after: 60 },
    }),
    para([run(name, { size: 20, color: '555555' })]),
  ]
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateAufloesungsbeschluss(caseData) {
  const date = germanDate()
  const gesellschafterAnzahl = Math.max(1, Number(caseData.gesellschafter_anzahl) || 1)
  const firmaName = caseData.firma_name || '[Firmenname]'
  const rechtsform = caseData.firma_rechtsform || 'GmbH'
  const firmaSitz = caseData.firma_sitz || '[Sitz]'
  const hrbNummer = caseData.hrb_nummer || '[HRB-Nummer]'

  // Registergericht ableiten
  const registergericht = firmaSitz
    ? `Amtsgericht ${firmaSitz}`
    : '[Registergericht]'

  // ─── Header ─────────────────────────────────────────────────────────────────
  const header = [
    centered(
      [bold(`Gesellschafterbeschluss`, { size: 32, color: '1a1a1a' })],
      { spacing: { before: 0, after: 80 } },
    ),
    centered(
      [bold(`über die Auflösung der ${firmaName}`, { size: 28, color: '1a1a1a' })],
      { spacing: { after: 40 } },
    ),
    emptyLine(),
    divider(),
  ]

  // ─── Präambel ────────────────────────────────────────────────────────────────
  const preamble = [
    new Paragraph({
      children: [bold('I. Gesellschaft', { size: 24 })],
      spacing: { before: 0, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
      },
    }),
    para([bold('Firma: '), run(firmaName)]),
    para([bold('Rechtsform: '), run(rechtsform)]),
    para([bold('Sitz: '), run(firmaSitz)]),
    para([bold('Handelsregisternummer: '), run(hrbNummer)]),
    para([bold('Registergericht: '), run(registergericht)]),
    emptyLine(),
    new Paragraph({
      children: [bold('II. Versammlung', { size: 24 })],
      spacing: { before: 0, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
      },
    }),
    justified([
      run('Die Gesellschafter der '),
      bold(firmaName),
      run(', '),
      run(rechtsform),
      run(', Sitz '),
      run(firmaSitz),
      run(`, eingetragen im Handelsregister des ${registergericht} unter ${hrbNummer}, haben `),
      bold(`am ${date}`),
      run(' im Wege der schriftlichen Beschlussfassung (§ 48 Abs. 2 GmbHG) folgende Beschlüsse gefasst:'),
    ]),
    emptyLine(),
  ]

  // ─── Beschlusspunkte ─────────────────────────────────────────────────────────
  const beschluesse = [
    new Paragraph({
      children: [bold('III. Beschlüsse', { size: 24 })],
      spacing: { before: 0, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
      },
    }),

    ...numberPara(
      1,
      'Auflösung der Gesellschaft',
      `Die Gesellschafter beschließen die Auflösung der ${firmaName} mit sofortiger Wirkung gemäß § 60 Abs. 1 Nr. 2 GmbHG. ` +
      'Die Gesellschaft befindet sich ab dem heutigen Tag in Liquidation.',
    ),

    ...numberPara(
      2,
      'Bestellung des Liquidators',
      '[Name des Liquidators], wohnhaft [Adresse], wird hiermit zum Liquidator der Gesellschaft bestellt. ' +
      'Der Liquidator ist befugt, die Gesellschaft allein zu vertreten und alle zur Abwicklung erforderlichen Handlungen vorzunehmen.',
    ),

    ...numberPara(
      3,
      'Anmeldung zum Handelsregister',
      `Der Liquidator wird angewiesen, die Auflösung der Gesellschaft sowie seine Bestellung als Liquidator unverzüglich ` +
      `beim ${registergericht} zur Eintragung in das Handelsregister anzumelden.`,
    ),

    ...numberPara(
      4,
      'Gläubigeraufruf im Bundesanzeiger',
      'Der Liquidator wird beauftragt, unverzüglich nach der Eintragung der Auflösung im Handelsregister ' +
      'einen Gläubigeraufruf gemäß § 65 Abs. 2 GmbHG im Bundesanzeiger zu veröffentlichen.',
    ),

    emptyLine(),

    // Abstimmungsergebnis
    new Paragraph({
      children: [bold('IV. Abstimmungsergebnis', { size: 24 })],
      spacing: { before: 0, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
      },
    }),
    para([
      run('Die vorstehenden Beschlüsse wurden '),
      bold('einstimmig'),
      run(' gefasst. Alle stimmberechtigten Gesellschafter haben zugestimmt.'),
    ]),
    para([bold('Ja-Stimmen: '), run('[__________]')]),
    para([bold('Nein-Stimmen: '), run('0')]),
    para([bold('Enthaltungen: '), run('0')]),
    emptyLine(),
  ]

  // ─── Unterschriften ──────────────────────────────────────────────────────────
  const signaturesHeader = [
    new Paragraph({
      children: [bold('V. Unterschriften', { size: 24 })],
      spacing: { before: 0, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc', space: 4 },
      },
    }),
    para([
      run(`${firmaSitz}, den ${date}`),
    ]),
    emptyLine(),
  ]

  // Erzeuge Unterschriftszeilen je Gesellschafter
  const signatures = []
  for (let i = 1; i <= gesellschafterAnzahl; i++) {
    signatures.push(
      ...signatureLine(`Gesellschafter ${i} – [Name, Funktion]`),
    )
    if (i < gesellschafterAnzahl) {
      signatures.push(emptyLine())
    }
  }

  // ─── Footer ──────────────────────────────────────────────────────────────────
  const footer = [
    emptyLine(),
    emptyLine(),
    new Paragraph({
      children: [
        run('Erstellt von Riseq GmbH · Frankfurt · hello@risestartup.eu', {
          size: 18,
          color: '999999',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'eeeeee', space: 6 },
      },
      spacing: { before: 480, after: 80 },
    }),
    centered(
      [run('Dieses Dokument ist rechtlich zu prüfen und ggf. durch einen Rechtsanwalt anzupassen.', {
        size: 16,
        color: 'aaaaaa',
        italics: true,
      })],
    ),
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
          ...header,
          ...preamble,
          ...beschluesse,
          ...signaturesHeader,
          ...signatures,
          ...footer,
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
