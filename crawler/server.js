require('dotenv').config()

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const { searchByName, fetchDocumentList, downloadSI, downloadAD, downloadDK, listDKDocuments } = require('./lib/hr-client')

const app = express()
const PORT = process.env.PORT || 3001

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS_RAW = process.env.ALLOWED_ORIGINS ||
  'https://riseq.eu,https://www.riseq.eu,https://winddown-eosin.vercel.app,http://localhost:5173'

const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(',').map(o => o.trim()).filter(Boolean)

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (e.g. curl, Railway health checks)
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true)
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return cb(null, true)
    cb(new Error(`CORS: origin not allowed: ${origin}`))
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['x-api-secret', 'content-type'],
}))

// ─── Rate limiting (per IP) ────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
})

app.use('/api/', limiter)

// ─── Auth middleware ───────────────────────────────────────────────────────────

const API_SECRET = process.env.API_SECRET

function requireSecret(req, res, next) {
  if (!API_SECRET) {
    // No secret configured — open in dev
    console.warn('[auth] API_SECRET not set — running without auth (dev mode)')
    return next()
  }
  const provided = req.headers['x-api-secret'] || ''
  if (provided !== API_SECRET) {
    return res.status(403).json({ error: 'Forbidden: invalid x-api-secret' })
  }
  next()
}

// ─── In-memory caches ─────────────────────────────────────────────────────────

const searchCache = new Map()  // query → { ts, results }
const docListCache = new Map() // key → { ts, data }
const docBinaryCache = new Map() // key → { ts, buffer, contentType, filename }

const SEARCH_TTL = 60 * 60 * 1000       // 1 hour
const DOC_LIST_TTL = 6 * 60 * 60 * 1000 // 6 hours
const DOC_BINARY_TTL = 6 * 60 * 60 * 1000

function getCached(map, key, ttl) {
  const e = map.get(key)
  if (!e) return null
  if (Date.now() - e.ts > ttl) { map.delete(key); return null }
  return e
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    service: 'hr-crawler',
    timestamp: new Date().toISOString(),
  })
})

// ─── GET /api/search?q=N26+GmbH ───────────────────────────────────────────────

app.get('/api/search', requireSecret, async (req, res) => {
  const { q = '', schlagwortOptionen = '2' } = req.query

  if (!q || q.trim().length < 2) {
    return res.json({ results: [], total: 0, query: q, source: 'handelsregister.de' })
  }

  const cacheKey = `${q.trim().toLowerCase()}:${schlagwortOptionen}`
  const cached = getCached(searchCache, cacheKey, SEARCH_TTL)
  if (cached) {
    console.log(`[search] cache hit for "${q}"`)
    return res.json({ results: cached.results, total: cached.results.length, query: q, source: 'handelsregister.de', cached: true })
  }

  try {
    const results = await searchByName(q.trim(), schlagwortOptionen)
    console.log(`[search] ${results.length} results for "${q}"`)
    searchCache.set(cacheKey, { ts: Date.now(), results })
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ results, total: results.length, query: q, source: 'handelsregister.de' })
  } catch (err) {
    console.error(`[search] error for "${q}":`, err.message)
    const isTimeout = err.name === 'AbortError' || err.message.includes('abort')
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'Handelsregister nicht erreichbar — bitte später erneut versuchen.'
        : 'Fehler bei der Handelsregister-Suche.',
      detail: err.message,
    })
  }
})

// ─── GET /api/documents?registerArt=HRB&registerNummer=198234&registerGericht=Frankfurt ─

app.get('/api/documents', requireSecret, async (req, res) => {
  const { registerArt, registerNummer, registerGericht } = req.query

  if (!registerArt || !registerNummer || !registerGericht) {
    return res.status(400).json({ error: 'registerArt, registerNummer, registerGericht are required' })
  }

  const cacheKey = `${registerArt}:${registerNummer}:${registerGericht}`
  const cached = getCached(docListCache, cacheKey, DOC_LIST_TTL)
  if (cached) {
    console.log(`[documents] cache hit for ${cacheKey}`)
    return res.json({ ...cached.data, cached: true })
  }

  try {
    const result = await fetchDocumentList(registerArt, registerNummer, registerGericht)
    const payload = { found: result.found, registerArt, registerNummer, registerGericht, documents: result.documents }

    if (result.found) docListCache.set(cacheKey, { ts: Date.now(), data: payload })

    res.setHeader('Cache-Control', 'private, max-age=21600')
    return res.json(payload)
  } catch (err) {
    console.error(`[documents] error for ${registerArt} ${registerNummer}:`, err.message)
    const isTimeout = err.name === 'AbortError' || err.message.includes('abort')
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'Handelsregister nicht erreichbar — bitte später erneut versuchen.'
        : 'Fehler beim Abruf der Dokumentenliste.',
      detail: err.message,
    })
  }
})

// ─── GET /api/dk-list?registerArt=HRB&registerNummer=...&registerGericht=... ───

app.get('/api/dk-list', requireSecret, async (req, res) => {
  const { registerArt, registerNummer, registerGericht } = req.query

  if (!registerArt || !registerNummer || !registerGericht) {
    return res.status(400).json({ error: 'registerArt, registerNummer, registerGericht are required' })
  }

  const cacheKey = `dk-list:${registerArt}:${registerNummer}:${registerGericht}`
  const cached = getCached(docListCache, cacheKey, DOC_LIST_TTL)
  if (cached) {
    console.log(`[dk-list] cache hit for ${cacheKey}`)
    return res.json({ ...cached.data, cached: true })
  }

  try {
    const docs = await listDKDocuments(registerArt, registerNummer, registerGericht)
    const payload = { registerArt, registerNummer, registerGericht, documents: docs }
    docListCache.set(cacheKey, { ts: Date.now(), data: payload })
    res.setHeader('Cache-Control', 'private, max-age=21600')
    return res.json(payload)
  } catch (err) {
    console.error(`[dk-list] error for ${registerArt} ${registerNummer}:`, err.message)
    const isTimeout = err.name === 'AbortError' || err.message.includes('abort')
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'Handelsregister nicht erreichbar — bitte später erneut versuchen.'
        : 'Fehler beim Abruf der DK-Dokumentenliste.',
      detail: err.message,
    })
  }
})

// ─── GET /api/download?registerArt=HRB&registerNummer=...&docType=SI ──────────

app.get('/api/download', requireSecret, async (req, res) => {
  const { registerArt, registerNummer, registerGericht, docType, docId = '' } = req.query

  if (!registerArt || !registerNummer || !registerGericht) {
    return res.status(400).json({ error: 'registerArt, registerNummer, registerGericht are required' })
  }
  if (!docType || !['SI', 'AD', 'DK'].includes(docType)) {
    return res.status(400).json({ error: 'docType must be SI, AD, or DK' })
  }

  // For DK, cache key includes docId (leafKey) so each document is cached separately
  const cacheKey = `${registerArt}:${registerNummer}:${registerGericht}:${docType}:${docId}`
  const cached = getCached(docBinaryCache, cacheKey, DOC_BINARY_TTL)
  if (cached) {
    console.log(`[download] cache hit for ${cacheKey}`)
    res.setHeader('Content-Type', cached.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${cached.filename}"`)
    res.setHeader('Cache-Control', 'private, max-age=21600')
    return res.status(200).send(cached.buffer)
  }

  try {
    let result
    if (docType === 'SI') result = await downloadSI(registerArt, registerNummer, registerGericht)
    else if (docType === 'AD') result = await downloadAD(registerArt, registerNummer, registerGericht)
    else result = await downloadDK(registerArt, registerNummer, registerGericht, docId || null)

    const filename = buildFilename(registerArt, registerNummer, registerGericht, docType, result.contentType)
    docBinaryCache.set(cacheKey, { ts: Date.now(), buffer: result.buffer, contentType: result.contentType, filename })

    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', result.buffer.length)
    res.setHeader('Cache-Control', 'private, max-age=21600')
    return res.status(200).send(result.buffer)
  } catch (err) {
    console.error(`[download] error for ${docType} ${registerArt} ${registerNummer}:`, err.message)
    const isTimeout = err.name === 'AbortError' || err.message.includes('abort')
    const isNotFound = err.message.includes('not found') || err.message.includes('nicht gefunden')

    if (isTimeout) return res.status(504).json({ error: 'Handelsregister nicht erreichbar.', detail: err.message })
    if (isNotFound) return res.status(404).json({ error: 'Dokument nicht gefunden.', detail: err.message })
    return res.status(502).json({ error: 'Fehler beim Abrufen des Dokuments.', detail: err.message })
  }
})

function buildFilename(registerArt, registerNummer, registerGericht, docType, contentType) {
  const courtSlug = registerGericht.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
  const ext = contentType.includes('pdf') ? 'pdf' : contentType.includes('zip') ? 'zip' : 'xml'
  return `HR_${registerArt}_${registerNummer}_${courtSlug}_${docType}.${ext}`
}

// ─── 404 catch-all ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ─── Error handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message })
  }
  console.error('[server] unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[hr-crawler] listening on port ${PORT}`)
  console.log(`[hr-crawler] allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
  console.log(`[hr-crawler] auth: ${API_SECRET ? 'enabled' : 'disabled (no API_SECRET set)'}`)
})
