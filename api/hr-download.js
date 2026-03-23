import { load } from 'cheerio'
import {
  HR_BASE,
  HR_SEARCH_URL,
  BROWSER_HEADERS,
  fetchWithTimeout,
  getHrSession,
} from './lib/hr-client.js'

// ─── Security ─────────────────────────────────────────────────────────────────

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

// ─── Document type config ─────────────────────────────────────────────────────

// SI = Strukturierte Inhaltsdaten (XML)
// AD = Aktueller Abdruck (PDF)
// CD = Chronologischer Abdruck (PDF)
const DOC_TYPES = {
  SI: { label: 'Strukturdaten', ext: 'xml', contentType: 'application/xml' },
  AD: { label: 'Aktueller Abdruck', ext: 'pdf', contentType: 'application/pdf' },
  CD: { label: 'Chronologischer Abdruck', ext: 'pdf', contentType: 'application/pdf' },
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry
}

function setCached(key, data) {
  cache.set(key, { ts: Date.now(), ...data })
}

// ─── Handelsregister document download ───────────────────────────────────────

async function downloadFromHR(registerArt, registerNummer, registerGericht, docType) {
  // Step 1: Get session (cookies + ViewState)
  let cookies, viewState
  try {
    ;({ cookies, viewState } = await getHrSession())
  } catch (err) {
    throw new Error(`Session fehlgeschlagen: ${err.message}`)
  }

  // Step 2: POST extended search by register number
  const formData = new URLSearchParams({
    'form1': 'form1',
    'form1:registerArt': registerArt,
    'form1:registerNummer': registerNummer,
    'form1:registergericht': registerGericht,
    'form1:btnSuche': 'Suche',
    'javax.faces.ViewState': viewState,
  })

  let searchHtml = ''
  try {
    const postRes = await fetchWithTimeout(HR_SEARCH_URL, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: HR_SEARCH_URL,
        Cookie: cookies,
      },
      body: formData.toString(),
      redirect: 'follow',
    })
    if (!postRes.ok) throw new Error(`Suche HTTP ${postRes.status}`)
    searchHtml = await postRes.text()

    // Update cookies from search response
    const sc = postRes.headers.getSetCookie?.() ?? []
    if (sc.length) {
      cookies = sc.map(c => c.split(';')[0]).join('; ')
    }
  } catch (err) {
    throw new Error(`Suche fehlgeschlagen: ${err.message}`)
  }

  // Step 3: Find the document download link in results
  const docUrl = findDocumentLink(searchHtml, docType)
  if (!docUrl) {
    throw new Error(`Kein ${docType}-Dokument in den Suchergebnissen gefunden`)
  }

  // Step 4: Download the document
  const fullUrl = docUrl.startsWith('http') ? docUrl : `${HR_BASE}${docUrl}`
  let docBuffer, contentType
  try {
    const docRes = await fetchWithTimeout(fullUrl, {
      headers: {
        ...BROWSER_HEADERS,
        Referer: HR_SEARCH_URL,
        Cookie: cookies,
        Accept: docType === 'SI'
          ? 'application/xml,text/xml,*/*'
          : 'application/pdf,*/*',
      },
      redirect: 'follow',
    }, 30000)
    if (!docRes.ok) throw new Error(`Download HTTP ${docRes.status}`)

    contentType = docRes.headers.get('content-type') || DOC_TYPES[docType]?.contentType || 'application/octet-stream'
    const arrayBuffer = await docRes.arrayBuffer()
    docBuffer = Buffer.from(arrayBuffer)
  } catch (err) {
    throw new Error(`Download fehlgeschlagen: ${err.message}`)
  }

  return { buffer: docBuffer, contentType }
}

function findDocumentLink(html, docType) {
  const $ = load(html)

  // handelsregister.de document links are typically in forms or anchor tags
  // They contain the docType code (SI, AD, CD) as a parameter or in onclick
  let found = null

  // Try <a> tags with href containing document download paths
  $('a[href*="document"], a[href*="dokument"], a[href*=".pdf"], a[href*=".xml"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().toUpperCase()
    if (href.toLowerCase().includes(docType.toLowerCase()) || text.includes(docType)) {
      found = href
      return false
    }
  })
  if (found) return found

  // Try forms with hidden inputs containing docType
  $('form').each((_, form) => {
    const action = $(form).attr('action') || ''
    const hidden = $(form).find(`input[value="${docType}"]`)
    if (hidden.length > 0) {
      found = action
      return false
    }
  })
  if (found) return found

  // Try onclick handlers that contain document type codes
  $('[onclick]').each((_, el) => {
    const onclick = $(el).attr('onclick') || ''
    if (onclick.includes(docType)) {
      const urlMatch = onclick.match(/['"]([^'"]*document[^'"]*)['"]/i)
      if (urlMatch) {
        found = urlMatch[1]
        return false
      }
    }
  })

  return found
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { registerArt, registerNummer, registerGericht, docType = 'AD' } = req.query

  if (!registerArt || !registerNummer) {
    return res.status(400).json({ error: 'registerArt und registerNummer sind erforderlich' })
  }

  if (!DOC_TYPES[docType]) {
    return res.status(400).json({ error: `Ungültiger docType. Erlaubt: ${Object.keys(DOC_TYPES).join(', ')}` })
  }

  const cacheKey = `${registerArt}:${registerNummer}:${registerGericht}:${docType}`
  const cached = getCached(cacheKey)
  if (cached) {
    console.log(`[hr-download] cache hit for ${cacheKey}`)
    res.setHeader('Content-Type', cached.contentType)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('X-HR-Cached', 'true')
    return res.status(200).send(cached.buffer)
  }

  try {
    const { buffer, contentType } = await downloadFromHR(
      registerArt,
      registerNummer,
      registerGericht || '',
      docType,
    )

    setCached(cacheKey, { buffer, contentType })

    const docInfo = DOC_TYPES[docType]
    const filename = `HR_${registerArt}_${registerNummer}_${docType}.${docInfo.ext}`
      .replace(/\s+/g, '_')

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    return res.status(200).send(buffer)
  } catch (err) {
    console.warn(`[hr-download] failed for ${cacheKey}: ${err.message}`)

    // Graceful fallback: return JSON error so client can show a message
    return res.status(502).json({
      error: 'Handelsregister nicht erreichbar',
      detail: err.message,
      registerArt,
      registerNummer,
      registerGericht,
      docType,
    })
  }
}
