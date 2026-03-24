/**
 * GET /api/hr-download
 *
 * Query params:
 *   registerArt     – HRB | HRA | PR | GnR
 *   registerNummer  – e.g. 198234
 *   registerGericht – e.g. Frankfurt am Main
 *   docType         – SI | AD | DK
 *   docId           – (DK only) document identifier from the document tree
 */

import { load } from 'cheerio'

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

// ─── Constants ───────────────────────────────────────────────────────────────

const HR_BASE = 'https://www.handelsregister.de'
const HR_SEARCH_URL = `${HR_BASE}/rp_web/erweitertesuche.xhtml`

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'Accept-Encoding': 'identity', // avoid compressed responses
  Connection: 'keep-alive',
}

// ─── In-memory document cache ─────────────────────────────────────────────────
// Key: `${registerArt}:${registerNummer}:${registerGericht}:${docType}:${docId||''}`
// Value: { buffer, contentType, filename, fetchedAt }

const docCache = new Map()
const DOC_CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

function getCachedDoc(key) {
  const entry = docCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > DOC_CACHE_TTL) {
    docCache.delete(key)
    return null
  }
  return entry
}

function setCachedDoc(key, value) {
  docCache.set(key, { ...value, fetchedAt: Date.now() })
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts, timeoutMs = 25000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Merge Set-Cookie headers from a response into an existing cookie string.
 * Returns the merged cookie string.
 */
function mergeCookies(res, existing = '') {
  const setCookies = res.headers.getSetCookie?.() ?? []
  if (!setCookies.length) {
    // Fallback: parse single set-cookie header
    const raw = res.headers.get('set-cookie') || ''
    if (raw) {
      setCookies.push(...raw.split(/,(?=\s*\w+=)/))
    }
  }

  // Build a map from existing cookies
  const map = new Map()
  for (const part of existing.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    map.set(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim())
  }

  // Overwrite with new cookies
  for (const cookie of setCookies) {
    const kv = cookie.split(';')[0].trim()
    const eqIdx = kv.indexOf('=')
    if (eqIdx === -1) continue
    map.set(kv.slice(0, eqIdx).trim(), kv.slice(eqIdx + 1).trim())
  }

  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

// ─── Session management ───────────────────────────────────────────────────────

/**
 * Establishes a session with handelsregister.de.
 * Returns { cookies, viewState, formId }
 */
async function createSession() {
  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    headers: { ...BROWSER_HEADERS },
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`HR session failed: HTTP ${res.status}`)

  const html = await res.text()
  const cookies = mergeCookies(res)
  const $ = load(html)

  const viewState = $('input[name="javax.faces.ViewState"]').val() || ''
  // The main search form id
  const formId = $('form').first().attr('id') || 'form1'

  if (!viewState) {
    console.warn('[hr-download] No ViewState found on search page')
  }

  return { cookies, viewState, formId, html }
}

// ─── Search + document link extraction ───────────────────────────────────────

/**
 * Searches handelsregister.de for a specific company by register data.
 * Returns { cookies, viewState, formId, resultsHtml, rowIndex }
 * where rowIndex is the 0-based index of the matching result row.
 */
async function searchAndFindCompany(registerArt, registerNummer, registerGericht, session) {
  const { cookies: sessionCookies, viewState: sessionViewState, formId } = session

  // Use register number as search keyword — most precise match
  const searchTerm = `${registerArt} ${registerNummer}`

  const formData = new URLSearchParams({
    [formId]: formId,
    [`${formId}:schlagwoerter`]: searchTerm,
    [`${formId}:schlagwortOptionen`]: '2', // exact phrase
    [`${formId}:btnSuche`]: 'Suche',
    'javax.faces.ViewState': sessionViewState,
  })

  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie: sessionCookies,
    },
    body: formData.toString(),
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`HR search failed: HTTP ${res.status}`)

  const html = await res.text()
  const cookies = mergeCookies(res, sessionCookies)
  const $ = load(html)
  const viewState = $('input[name="javax.faces.ViewState"]').val() || sessionViewState

  // Find which row matches our company
  let rowIndex = -1
  $('table tr').each((i, row) => {
    if (i === 0) return // skip header
    const text = $(row).text()
    const normGericht = registerGericht.toLowerCase().replace(/\s+/g, ' ').trim()
    const hasNummer = text.includes(registerNummer)
    const hasArt = text.toUpperCase().includes(registerArt)
    const hasGericht = text.toLowerCase().replace(/\s+/g, ' ').includes(normGericht)
    if (hasNummer && hasArt && (hasGericht || rowIndex === -1)) {
      rowIndex = i - 1 // 0-based excluding header
      return false // break
    }
  })

  return { cookies, viewState, formId, resultsHtml: html, rowIndex }
}

/**
 * Finds the JSF component ID of a document link (SI/AD/DK) in a result row.
 * handelsregister.de renders links like:
 *   <a id="form1:ergebnistable:0:lnkSI" ...>SI</a>
 *   or <a id="form1:recordsTable:0:btnAD" ...>AD</a>
 */
function findDocLinkId($, rowIndex, docType, formId) {
  // Try various table/component naming patterns used by handelsregister.de
  const patterns = [
    `${formId}:ergebnistable:${rowIndex}:lnk${docType}`,
    `${formId}:ergebnistable:${rowIndex}:btn${docType}`,
    `${formId}:recordsTable:${rowIndex}:lnk${docType}`,
    `${formId}:recordsTable:${rowIndex}:btn${docType}`,
    `${formId}:j_idt42:${rowIndex}:lnk${docType}`,
    `${formId}:j_idt42:${rowIndex}:btn${docType}`,
  ]

  for (const id of patterns) {
    if ($(`#${CSS.escape(id)}`).length) return id
  }

  // Fallback: find any link whose text matches docType in the correct row
  let found = null
  $('table tr').eq(rowIndex + 1).find('a, button').each((_, el) => {
    const text = $(el).text().trim().toUpperCase()
    if (text === docType) {
      found = $(el).attr('id') || null
      return false
    }
  })

  return found
}

// ─── Document download functions ──────────────────────────────────────────────

/**
 * Simulates clicking a JSF link by POSTing to the search page with the
 * component ID as both key and value (standard JSF command link pattern).
 */
async function clickJSFLink(linkId, formId, viewState, cookies) {
  const formData = new URLSearchParams({
    [formId]: formId,
    [linkId]: linkId,
    'javax.faces.ViewState': viewState,
    'javax.faces.source': linkId,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': linkId,
    'javax.faces.partial.render': `${formId}:ergebnistable`,
    'javax.faces.ajax': 'true',
  })

  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie: cookies,
      'Faces-Request': 'partial/ajax',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: formData.toString(),
    redirect: 'follow',
  })

  return res
}

/**
 * Downloads SI (Strukturierte Inhalte) — returns XML buffer.
 */
async function downloadSI(registerArt, registerNummer, registerGericht) {
  console.log(`[hr-download] SI: ${registerArt} ${registerNummer} @ ${registerGericht}`)

  const session = await createSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchAndFindCompany(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) {
    throw new Error(`Company not found: ${registerArt} ${registerNummer} at ${registerGericht}`)
  }

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'SI', formId)
  if (!linkId) {
    throw new Error(`No SI document link found for row ${rowIndex}`)
  }

  const res = await clickJSFLink(linkId, formId, viewState, cookies)
  const body = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'application/xml'

  // If it's an AJAX response, extract the document URL or content
  if (contentType.includes('xml') && !contentType.includes('xhtml')) {
    return { buffer: Buffer.from(body), contentType: 'application/xml' }
  }

  // Check if the AJAX response contains a redirect/document URL
  const text = Buffer.from(body).toString('utf-8')
  const redirectMatch = text.match(/redirect\s+url="([^"]+)"/) ||
    text.match(/location["']?\s*:\s*["']([^"']+\.xml)/)
  if (redirectMatch) {
    const docUrl = redirectMatch[1].startsWith('http')
      ? redirectMatch[1]
      : `${HR_BASE}${redirectMatch[1]}`
    const docRes = await fetchWithTimeout(docUrl, {
      headers: { ...BROWSER_HEADERS, Cookie: cookies },
    })
    const docBuffer = await docRes.arrayBuffer()
    return { buffer: Buffer.from(docBuffer), contentType: 'application/xml' }
  }

  return { buffer: Buffer.from(body), contentType: 'application/xml' }
}

/**
 * Downloads AD (Aktueller Abdruck) — returns PDF buffer.
 */
async function downloadAD(registerArt, registerNummer, registerGericht) {
  console.log(`[hr-download] AD: ${registerArt} ${registerNummer} @ ${registerGericht}`)

  const session = await createSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchAndFindCompany(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) {
    throw new Error(`Company not found: ${registerArt} ${registerNummer} at ${registerGericht}`)
  }

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'AD', formId)
  if (!linkId) {
    throw new Error(`No AD document link found for row ${rowIndex}`)
  }

  // AD documents typically redirect to a PDF URL or return a PDF directly
  const res = await clickJSFLink(linkId, formId, viewState, cookies)
  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('pdf')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, contentType: 'application/pdf' }
  }

  // The JSF response might contain an inline script redirect to the PDF
  const text = await res.text()
  const pdfUrlMatch = text.match(/["']([^"']*\.pdf[^"']*)["']/) ||
    text.match(/window\.location\s*=\s*["']([^"']+)["']/) ||
    text.match(/redirect\s+url="([^"]+\.pdf[^"]*)"/)

  if (pdfUrlMatch) {
    const pdfUrl = pdfUrlMatch[1].startsWith('http')
      ? pdfUrlMatch[1]
      : `${HR_BASE}${pdfUrlMatch[1]}`
    const pdfRes = await fetchWithTimeout(pdfUrl, {
      headers: { ...BROWSER_HEADERS, Cookie: cookies },
    })
    if (!pdfRes.ok) throw new Error(`PDF download failed: HTTP ${pdfRes.status}`)
    const buffer = Buffer.from(await pdfRes.arrayBuffer())
    return { buffer, contentType: 'application/pdf' }
  }

  // Return whatever we got
  const buffer = Buffer.from(text, 'utf-8')
  return { buffer, contentType: contentType || 'application/pdf' }
}

/**
 * Downloads CD (Chronologischer Abdruck) — returns PDF buffer.
 */
async function downloadCD(registerArt, registerNummer, registerGericht) {
  console.log(`[hr-download] CD: ${registerArt} ${registerNummer} @ ${registerGericht}`)

  const session = await createSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchAndFindCompany(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) {
    throw new Error(`Company not found: ${registerArt} ${registerNummer} at ${registerGericht}`)
  }

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'CD', formId)
  if (!linkId) {
    throw new Error(`No CD document link found for row ${rowIndex}`)
  }

  const res = await clickJSFLink(linkId, formId, viewState, cookies)
  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('pdf')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, contentType: 'application/pdf' }
  }

  const text = await res.text()
  const pdfUrlMatch = text.match(/["']([^"']*\.pdf[^"']*)["']/) ||
    text.match(/window\.location\s*=\s*["']([^"']+)["']/) ||
    text.match(/redirect\s+url="([^"]+\.pdf[^"]*)"/)

  if (pdfUrlMatch) {
    const pdfUrl = pdfUrlMatch[1].startsWith('http')
      ? pdfUrlMatch[1]
      : `${HR_BASE}${pdfUrlMatch[1]}`
    const pdfRes = await fetchWithTimeout(pdfUrl, {
      headers: { ...BROWSER_HEADERS, Cookie: cookies },
    })
    if (!pdfRes.ok) throw new Error(`PDF download failed: HTTP ${pdfRes.status}`)
    const buffer = Buffer.from(await pdfRes.arrayBuffer())
    return { buffer, contentType: 'application/pdf' }
  }

  const buffer = Buffer.from(text, 'utf-8')
  return { buffer, contentType: contentType || 'application/pdf' }
}

/**
 * Downloads a DK document from the document tree.
 * docId identifies the specific document (e.g. "Gesellschafterliste", "Satzung",
 * or an opaque ID from the DK tree).
 */
async function downloadDK(registerArt, registerNummer, registerGericht, docId) {
  console.log(`[hr-download] DK[${docId}]: ${registerArt} ${registerNummer} @ ${registerGericht}`)

  const session = await createSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchAndFindCompany(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) {
    throw new Error(`Company not found: ${registerArt} ${registerNummer} at ${registerGericht}`)
  }

  const $ = load(resultsHtml)

  // Step 1: click the DK link to open the document tree
  const dkLinkId = findDocLinkId($, rowIndex, 'DK', formId)
  if (!dkLinkId) {
    throw new Error(`No DK document tree link found for row ${rowIndex}`)
  }

  const treeRes = await clickJSFLink(dkLinkId, formId, viewState, cookies)
  const treeHtml = await treeRes.text()
  const treeCookies = mergeCookies(treeRes, cookies)

  const $tree = load(treeHtml)
  const treeViewState = $tree('input[name="javax.faces.ViewState"]').val() || viewState

  // Step 2: find the specific document in the tree by docId
  // The tree renders items like:
  //   <span class="ui-treenode-label">Gesellschafterliste 2023-01-15</span>
  //   <a id="...btnDownload">Herunterladen</a>
  let docLinkId = null

  // Direct search by docId in tree nodes
  $tree('[id*="treeTable"], [id*="documentTree"], [class*="tree"]').find('a, button').each((_, el) => {
    const text = $tree(el).text().trim()
    const id = $tree(el).attr('id') || ''
    if (
      text.toLowerCase().includes(docId.toLowerCase()) ||
      id.toLowerCase().includes(docId.toLowerCase())
    ) {
      docLinkId = id
      return false
    }
  })

  // Fallback: find any download link near matching text
  if (!docLinkId) {
    $tree('*').each((_, el) => {
      const text = $tree(el).text()
      if (text.toLowerCase().includes(docId.toLowerCase())) {
        const nearby = $tree(el).closest('tr, li').find('a[id*="download"], button[id*="download"], a[id*="Herunterlad"]')
        if (nearby.length) {
          docLinkId = nearby.first().attr('id') || null
          return false
        }
      }
    })
  }

  if (!docLinkId) {
    throw new Error(`Document "${docId}" not found in DK tree`)
  }

  // Step 3: click the download link
  const downloadFormData = new URLSearchParams({
    [formId]: formId,
    [docLinkId]: docLinkId,
    'javax.faces.ViewState': treeViewState,
  })

  const downloadRes = await fetchWithTimeout(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie: treeCookies,
    },
    body: downloadFormData.toString(),
    redirect: 'follow',
  })

  const contentType = downloadRes.headers.get('content-type') || 'application/pdf'
  const buffer = Buffer.from(await downloadRes.arrayBuffer())
  return { buffer, contentType }
}

// ─── Filename helpers ──────────────────────────────────────────────────────────

function buildFilename(registerArt, registerNummer, registerGericht, docType, docId, contentType) {
  const courtSlug = registerGericht.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
  const ext = contentType.includes('pdf') ? 'pdf' : 'xml'
  if (docType === 'DK' && docId) {
    const docSlug = docId.replace(/[^a-zA-Z0-9_-]/g, '_')
    return `HR_${registerArt}_${registerNummer}_${courtSlug}_${docSlug}.${ext}`
  }
  return `HR_${registerArt}_${registerNummer}_${courtSlug}_${docType}.${ext}`
}

// ─── Railway crawler proxy ────────────────────────────────────────────────────

async function proxyToCrawler(req, res) {
  const crawlerUrl = process.env.CRAWLER_URL
  const crawlerSecret = process.env.CRAWLER_SECRET

  const params = new URLSearchParams(req.query)
  const target = `${crawlerUrl}/api/download?${params}`

  const upstream = await fetch(target, {
    headers: {
      'x-api-secret': crawlerSecret || '',
    },
    signal: AbortSignal.timeout(60000),
  })

  if (!upstream.ok) {
    const ct = upstream.headers.get('content-type') || ''
    if (ct.includes('json')) {
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }
    return res.status(upstream.status).json({ error: 'Crawler error', detail: `HTTP ${upstream.status}` })
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  const contentDisposition = upstream.headers.get('content-disposition') || ''
  res.setHeader('Content-Type', contentType)
  if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition)
  res.setHeader('Cache-Control', 'private, max-age=21600')

  const buffer = Buffer.from(await upstream.arrayBuffer())
  return res.status(200).send(buffer)
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { registerArt, registerNummer, registerGericht, docType, docId = '' } = req.query

  // Validate required params
  if (!registerArt || !registerNummer || !registerGericht) {
    return res.status(400).json({ error: 'registerArt, registerNummer, registerGericht are required' })
  }
  if (!docType || !['SI', 'AD', 'CD', 'DK'].includes(docType)) {
    return res.status(400).json({ error: 'docType must be SI, AD, CD, or DK' })
  }
  if (docType === 'DK' && !docId) {
    return res.status(400).json({ error: 'docId is required for docType=DK' })
  }

  // ── Proxy to Railway crawler if configured ──
  if (process.env.CRAWLER_URL) {
    try {
      return await proxyToCrawler(req, res)
    } catch (err) {
      console.error('[hr-download] crawler proxy error:', err.message)
      return res.status(502).json({ error: 'Fehler beim Abrufen des Dokuments.', detail: err.message })
    }
  }

  const cacheKey = `${registerArt}:${registerNummer}:${registerGericht}:${docType}:${docId}`
  const cached = getCachedDoc(cacheKey)
  if (cached) {
    console.log(`[hr-download] cache hit for ${cacheKey}`)
    const etag = `"${registerArt}-${registerNummer}-${docType}-${cached.fetchedAt}"`
    res.setHeader('Content-Type', cached.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${cached.filename}"`)
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', 'private, max-age=21600') // 6 hours
    return res.status(200).send(cached.buffer)
  }

  try {
    let result
    if (docType === 'SI') {
      result = await downloadSI(registerArt, registerNummer, registerGericht)
    } else if (docType === 'AD') {
      result = await downloadAD(registerArt, registerNummer, registerGericht)
    } else if (docType === 'CD') {
      result = await downloadCD(registerArt, registerNummer, registerGericht)
    } else {
      result = await downloadDK(registerArt, registerNummer, registerGericht, docId)
    }

    const filename = buildFilename(registerArt, registerNummer, registerGericht, docType, docId, result.contentType)
    setCachedDoc(cacheKey, { buffer: result.buffer, contentType: result.contentType, filename })

    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', result.buffer.length)
    res.setHeader('Cache-Control', 'private, max-age=21600')
    return res.status(200).send(result.buffer)
  } catch (err) {
    console.error(`[hr-download] Error downloading ${docType} for ${registerArt} ${registerNummer}:`, err.message)

    const isTimeout = err.name === 'AbortError' || err.message.includes('abort')
    const isNotFound = err.message.includes('not found') || err.message.includes('nicht gefunden')

    if (isTimeout) {
      return res.status(504).json({
        error: 'Handelsregister nicht erreichbar — bitte später erneut versuchen.',
        detail: err.message,
      })
    }
    if (isNotFound) {
      return res.status(404).json({
        error: 'Dokument nicht gefunden.',
        detail: err.message,
      })
    }

    return res.status(502).json({
      error: 'Fehler beim Abrufen des Dokuments vom Handelsregister.',
      detail: err.message,
    })
  }
}
