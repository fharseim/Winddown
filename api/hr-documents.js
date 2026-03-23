/**
 * GET /api/hr-documents
 *
 * Returns the list of available document types for a registered company.
 *
 * Query params:
 *   registerArt     – HRB | HRA | PR | GnR
 *   registerNummer  – e.g. 198234
 *   registerGericht – e.g. Frankfurt am Main
 */

import { load } from 'cheerio'
import { fetchDocumentList } from './lib/hr-client.js'

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

// ─── In-memory cache ──────────────────────────────────────────────────────────

const cache = new Map()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { ts: Date.now(), data })
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

  const cacheKey = `${registerArt}:${registerNummer}:${registerGericht}`
  const cached = getCached(cacheKey)
  if (cached) {
    console.log(`[hr-documents] cache hit for ${cacheKey}`)
    return res.status(200).json({ ...cached, cached: true })
  }

  try {
    const result = await fetchDocumentList(registerArt, registerNummer, registerGericht)

    const payload = {
      found: result.found,
      registerArt,
      registerNummer,
      registerGericht,
      documents: result.documents,
    }

    if (result.found) setCached(cacheKey, payload)

    res.setHeader('Cache-Control', 'private, max-age=21600')
    return res.status(200).json(payload)
  } catch (err) {
    console.error(`[hr-documents] Error for ${cacheKey}:`, err.message)

    const isTimeout = err.name === 'AbortError' || err.message.includes('abort')

    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'Handelsregister nicht erreichbar — bitte später erneut versuchen.'
        : 'Fehler beim Abruf der Dokumentenliste.',
      detail: err.message,
    })
  }
}
