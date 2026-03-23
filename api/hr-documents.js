/**
 * GET /api/hr-documents?registerArt=HRB&registerNummer=198234&registerGericht=Frankfurt+am+Main
 *
 * Returns the list of documents available in the Handelsregister for a
 * specific company identified by its register entry.
 *
 * Phase B — document listing.  Phase C will add the actual download proxy.
 */

import {
  getSession,
  searchByRegister,
  getDocumentTree,
  submitJsfAction,
  parseDocumentLinks,
  parseDocumentTree,
  DOC_TYPE_LABELS,
} from './lib/hr-client.js'

// ─── Security (same as hr-search.js) ─────────────────────────────────────────

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

  const origin  = req.headers['origin']  || ''
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

// ─── In-memory cache (24 h per company) ──────────────────────────────────────

const cache    = new Map()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function cacheKey(registerArt, registerNummer, registerGericht) {
  return `${registerArt}|${registerNummer}|${registerGericht}`.toLowerCase().replace(/\s+/g, '_')
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { ts: Date.now(), data })
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function fetchDocuments(registerArt, registerNummer, registerGericht) {
  // 1. Bootstrap session
  const session = await getSession()

  // 2. Search for the company by register number
  const resultsHtml = await searchByRegister(registerArt, registerNummer, registerGericht, session)

  // 3. Parse the results page for doc-type links belonging to this company
  const { matched, availableTypes, docLinks } = parseDocumentLinks(
    resultsHtml,
    registerArt,
    registerNummer,
    registerGericht,
  )

  console.log(`[hr-documents] matched=${matched} types=[${availableTypes.join(',')}] for ${registerArt} ${registerNummer}`)

  // 4. Fetch DK document tree if available
  let dokumente = []

  const dkLink = docLinks.find(l => l.type === 'DK')
  if (dkLink) {
    try {
      let treeHtml

      if (dkLink.href) {
        // Direct href (relative or absolute)
        treeHtml = await getDocumentTree(dkLink.href, session)
      } else if (dkLink.jsfId) {
        // JSF commandLink — re-POST with the button id
        treeHtml = await submitJsfAction(dkLink.jsfId, session)
      }

      if (treeHtml) {
        dokumente = parseDocumentTree(treeHtml)
        console.log(`[hr-documents] parsed ${dokumente.length} documents from DK tree`)
      }
    } catch (err) {
      console.warn(`[hr-documents] could not fetch DK tree: ${err.message}`)
      // Non-fatal — we still return available_types
    }
  }

  return { matched, availableTypes, docLinks, dokumente }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    registerArt    = '',
    registerNummer = '',
    registerGericht = '',
  } = req.query

  if (!registerArt || !registerNummer) {
    return res.status(400).json({
      error: 'registerArt und registerNummer sind erforderlich',
      documents: { available_types: [], dokumente: [] },
    })
  }

  const key    = cacheKey(registerArt, registerNummer, registerGericht)
  const cached = getCached(key)
  if (cached) {
    console.log(`[hr-documents] cache hit for ${registerArt} ${registerNummer}`)
    return res.status(200).json({ ...cached, cached: true })
  }

  const company = {
    registerArt:     registerArt.trim(),
    registerNummer:  registerNummer.trim(),
    registerGericht: registerGericht.trim(),
  }

  try {
    const { matched, availableTypes, dokumente } = await fetchDocuments(
      company.registerArt,
      company.registerNummer,
      company.registerGericht,
    )

    const response = {
      company,
      documents: {
        available_types: availableTypes,
        available_labels: Object.fromEntries(
          availableTypes.map(t => [t, DOC_TYPE_LABELS[t] || t])
        ),
        dokumente,
      },
      matched,
      source: 'handelsregister.de',
      cached: false,
    }

    setCached(key, response)
    return res.status(200).json(response)

  } catch (err) {
    console.error(`[hr-documents] failed for ${registerArt} ${registerNummer}: ${err.message}`)
    return res.status(200).json({
      company,
      documents: { available_types: [], dokumente: [] },
      matched: false,
      source: 'handelsregister.de',
      error: err.message,
    })
  }
}
