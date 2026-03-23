import { generateErsteinschaetzung } from '../src/templates/ersteinschaetzung.js'
import { generateKostenangebot } from '../src/templates/kostenangebot.js'
import { generateAufloesungsbeschluss } from '../src/templates/aufloesungsbeschluss.js'

// ─── Auth ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://winddown-eosin.vercel.app',
  'https://riseq.eu',
  'https://www.riseq.eu',
]

function checkAuth(req) {
  const expectedToken = process.env.INTERNAL_API_TOKEN
  if (!expectedToken) return true

  const origin = req.headers['origin'] || ''
  const referer = req.headers['referer'] || ''
  const hasAllowedOrigin =
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGINS.some(o => referer.startsWith(o)) ||
    /^https?:\/\/localhost/.test(origin) ||
    /^https?:\/\/localhost/.test(referer) ||
    /^https?:\/\/127\.0\.0\.1/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1/.test(referer)

  if (!hasAllowedOrigin) return false

  const token = req.headers['x-api-token'] || ''
  return token === expectedToken
}

// ─── DOCX type map ────────────────────────────────────────────────────────────

const GENERATORS = {
  ersteinschaetzung:    { fn: generateErsteinschaetzung,    label: 'ersteinschaetzung' },
  kostenangebot:        { fn: generateKostenangebot,        label: 'kostenangebot' },
  aufloesungsbeschluss: { fn: generateAufloesungsbeschluss, label: 'aufloesungsbeschluss' },
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-token')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!checkAuth(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body = req.body
  // Vercel auto-parses JSON bodies; fall back to manual parse just in case
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { type, caseData } = body || {}

  if (!type || !caseData) {
    return res.status(400).json({ error: 'Missing required fields: type, caseData' })
  }

  const generator = GENERATORS[type]
  if (!generator) {
    return res.status(400).json({
      error: `Unknown document type: "${type}". Valid types: ${Object.keys(GENERATORS).join(', ')}`,
    })
  }

  try {
    const buffer = await generator.fn(caseData)

    // Sanitise firm name for filename
    const firmaSafe = (caseData.firma_name || 'dokument')
      .toLowerCase()
      .replace(/[^a-z0-9äöü]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40)

    const filename = `${generator.label}_${firmaSafe}.docx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[generate-document] error:', err)
    return res.status(500).json({ error: 'Dokument konnte nicht generiert werden.', details: err.message })
  }
}
