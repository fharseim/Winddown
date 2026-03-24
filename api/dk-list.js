/**
 * GET /api/dk-list
 *
 * Returns the list of all available documents from the DK (Digitales Kommunikationsarchiv)
 * tree for a registered company. Each entry has { key, label, score }.
 *
 * Query params:
 *   registerArt     – HRB | HRA | PR | GnR
 *   registerNummer  – e.g. 198234
 *   registerGericht – e.g. Frankfurt am Main
 */

// ─── Security ────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://winddown-eosin.vercel.app',
  'https://riseq.eu',
  'https://www.riseq.eu',
]

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true
  return false
}

function checkAuth(req) {
  const expectedToken = process.env.INTERNAL_API_TOKEN
  if (!expectedToken) return true

  const origin = req.headers['origin'] || ''
  const referer = req.headers['referer'] || ''
  const hasAllowedOrigin =
    isAllowedOrigin(origin) ||
    ALLOWED_ORIGINS.some(o => referer.startsWith(o)) ||
    /^https?:\/\/localhost/.test(referer) ||
    /^https?:\/\/127\.0\.0\.1/.test(referer)

  if (!hasAllowedOrigin) return false

  const token = req.headers['x-api-token'] || ''
  return token === expectedToken
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(403).json({ error: 'Forbidden' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { registerArt, registerNummer, registerGericht } = req.query

  if (!registerArt || !registerNummer || !registerGericht) {
    return res.status(400).json({
      error: 'registerArt, registerNummer, registerGericht are required',
    })
  }

  const crawlerUrl = process.env.CRAWLER_URL
  const crawlerSecret = process.env.CRAWLER_SECRET

  if (!crawlerUrl) {
    return res.status(503).json({ error: 'CRAWLER_URL not configured' })
  }

  try {
    const params = new URLSearchParams({ registerArt, registerNummer, registerGericht })
    const target = `${crawlerUrl}/api/dk-list?${params}`

    const upstream = await fetch(target, {
      headers: {
        'x-api-secret': crawlerSecret || '',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(60000), // DK tree expansion can take ~30s
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[dk-list] crawler proxy error:', err.message)
    const isTimeout = err.name === 'AbortError' || err.message.includes('abort')
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'Handelsregister nicht erreichbar — bitte später erneut versuchen.'
        : 'Fehler beim Abruf der DK-Dokumentenliste.',
      detail: err.message,
    })
  }
}
