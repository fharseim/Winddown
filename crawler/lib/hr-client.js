/**
 * HR Client for the standalone crawler service.
 *
 * Key differences from the Vercel version:
 * - CommonJS (require/module.exports) instead of ESM — Node.js server process
 * - Session pooling: reuse warm sessions across requests
 * - Token-bucket rate limiter: max 60 requests/hour to handelsregister.de
 * - Retry with exponential backoff (up to 3 attempts)
 * - User-Agent rotation across 4 realistic browser UAs
 */

const { load } = require('cheerio')

const HR_BASE = 'https://www.handelsregister.de'
const HR_WELCOME_URL = `${HR_BASE}/rp_web/welcome.xhtml`
const HR_SEARCH_URL = `${HR_BASE}/rp_web/erweitertesuche/welcome.xhtml`

// ─── User-Agent rotation ──────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
]

let uaIndex = 0
function nextUserAgent() {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length]
  uaIndex++
  return ua
}

function browserHeaders() {
  return {
    'User-Agent': nextUserAgent(),
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
    Connection: 'keep-alive',
  }
}

// ─── Token-bucket rate limiter (60 req/hour to handelsregister.de) ─────────────

const BUCKET_CAPACITY = 60
const BUCKET_REFILL_PER_MS = BUCKET_CAPACITY / (60 * 60 * 1000) // 1 per minute

let bucketTokens = BUCKET_CAPACITY
let bucketLastRefill = Date.now()

function consumeToken() {
  const now = Date.now()
  const elapsed = now - bucketLastRefill
  bucketTokens = Math.min(BUCKET_CAPACITY, bucketTokens + elapsed * BUCKET_REFILL_PER_MS)
  bucketLastRefill = now

  if (bucketTokens < 1) {
    throw new Error('Rate limit: too many requests to handelsregister.de (60/hour)')
  }
  bucketTokens -= 1
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
 * fetch with rate-limiting + retry (exponential backoff, up to 3 attempts).
 */
async function fetchHR(url, opts, timeoutMs = 25000) {
  const maxAttempts = 3
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    consumeToken()
    try {
      const res = await fetchWithTimeout(url, opts, timeoutMs)
      if (res.status === 429 || res.status === 503) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(`[hr-client] HTTP ${res.status} — retrying in ${delay}ms (attempt ${attempt})`)
        await sleep(delay)
        lastErr = new Error(`HR returned HTTP ${res.status}`)
        continue
      }
      return res
    } catch (err) {
      lastErr = err
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(`[hr-client] fetch error — retrying in ${delay}ms (attempt ${attempt}): ${err.message}`)
        await sleep(delay)
      }
    }
  }
  throw lastErr
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function mergeCookies(res, existing = '') {
  const setCookies = res.headers.getSetCookie?.() ?? []
  if (!setCookies.length) {
    const raw = res.headers.get('set-cookie') || ''
    if (raw) setCookies.push(...raw.split(/,(?=\s*\w+=)/))
  }

  const map = new Map()
  for (const part of existing.split(';')) {
    const t = part.trim()
    if (!t) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    map.set(t.slice(0, i).trim(), t.slice(i + 1).trim())
  }
  for (const cookie of setCookies) {
    const kv = cookie.split(';')[0].trim()
    const i = kv.indexOf('=')
    if (i === -1) continue
    map.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim())
  }

  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

// ─── Session pool ─────────────────────────────────────────────────────────────
// Reuse sessions for up to 10 minutes to avoid repeated GET requests.

const SESSION_TTL = 10 * 60 * 1000
let sessionPool = []

async function getSession() {
  const now = Date.now()
  // Expire stale sessions
  sessionPool = sessionPool.filter(s => now - s.createdAt < SESSION_TTL)

  if (sessionPool.length > 0) {
    const s = sessionPool.pop()
    console.log('[hr-client] reusing pooled session')
    return s
  }

  return createSession()
}

function returnSession(session) {
  if (sessionPool.length < 3) {
    sessionPool.push({ ...session, createdAt: Date.now() })
  }
}

async function createSession() {
  // Step 1: Welcome page — establishes a valid JSESSIONID
  const res1 = await fetchHR(HR_WELCOME_URL, { headers: browserHeaders() })
  if (!res1.ok) throw new Error(`HR welcome init failed: HTTP ${res1.status}`)
  const html1 = await res1.text()
  let cookies = mergeCookies(res1)
  const $1 = load(html1)
  const naviViewState = $1('form#naviForm input[name="javax.faces.ViewState"]').val() || ''

  // Step 2: Navigate to extended search via naviForm POST (returns a redirect)
  const navBody = new URLSearchParams({
    naviForm: 'naviForm',
    'naviForm:erweiterteSucheLink': 'naviForm:erweiterteSucheLink',
    'javax.faces.ViewState': naviViewState,
  })
  const res2 = await fetchHR(HR_WELCOME_URL, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    body: navBody.toString(),
    redirect: 'manual',
  })
  cookies = mergeCookies(res2, cookies)
  const loc = res2.headers.get('location') || '/rp_web/erweitertesuche/welcome.xhtml'
  const searchUrl = loc.startsWith('http') ? loc : `${HR_BASE}${loc}`

  // Step 3: Load the actual extended search page
  const res3 = await fetchHR(searchUrl, { headers: { ...browserHeaders(), Cookie: cookies } })
  cookies = mergeCookies(res3, cookies)
  const html3 = await res3.text()
  const $3 = load(html3)
  const viewState = $3('form[id="form"] input[name="javax.faces.ViewState"]').val() || ''
  const formId = 'form'

  console.log('[hr-client] created new session, viewState length:', viewState.length, 'formId:', formId)
  return { cookies, viewState, formId, html: html3, searchUrl, createdAt: Date.now() }
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function searchByRegister(registerArt, registerNummer, registerGericht, session) {
  const { cookies: sCookies, viewState: sViewState, formId, searchUrl = HR_SEARCH_URL } = session

  const formData = new URLSearchParams({
    [formId]: formId,
    suchTyp: 'e',
    [`${formId}:schlagwortOptionen`]: '1',
    [`${formId}:registerArt_input`]: registerArt,
    [`${formId}:registerNummer`]: registerNummer,
    [`${formId}:btnSuche`]: 'Suche',
    'javax.faces.ViewState': sViewState,
  })

  const res = await fetchHR(searchUrl, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: searchUrl,
      Cookie: sCookies,
    },
    body: formData.toString(),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HR search failed: HTTP ${res.status}`)

  const html = await res.text()
  const cookies = mergeCookies(res, sCookies)
  const $ = load(html)
  const viewState = $('input[name="javax.faces.ViewState"]').val() || sViewState

  console.log(`[hr-client] searchByRegister ${registerArt} ${registerNummer}: title="${$('title').text().trim()}"`)

  let rowIndex = -1
  $('table tr').each((i, row) => {
    if (i === 0) return
    const text = $(row).text()
    const normGericht = registerGericht.toLowerCase().replace(/\s+/g, ' ').trim()
    if (
      text.includes(registerNummer) &&
      text.toUpperCase().includes(registerArt) &&
      (text.toLowerCase().replace(/\s+/g, ' ').includes(normGericht) || rowIndex === -1)
    ) {
      rowIndex = i - 1
      return false
    }
  })

  return { cookies, viewState, formId, resultsHtml: html, rowIndex }
}

// ─── Company name search (for /api/search) ────────────────────────────────────

async function searchByName(query, schlagwortOptionen = '1') {
  const session = await getSession()
  const { cookies: sCookies, viewState: sViewState, formId, searchUrl = HR_SEARCH_URL } = session

  const formData = new URLSearchParams({
    [formId]: formId,
    suchTyp: 'e',
    [`${formId}:schlagwoerter`]: query,
    [`${formId}:schlagwortOptionen`]: schlagwortOptionen,
    [`${formId}:btnSuche`]: 'Suche',
    'javax.faces.ViewState': sViewState,
  })

  const res = await fetchHR(searchUrl, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: searchUrl,
      Cookie: sCookies,
    },
    body: formData.toString(),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HR search failed: HTTP ${res.status}`)

  const html = await res.text()
  // Don't return this session to pool — ViewState may have advanced
  return parseSearchResults(html, query)
}

function parseSearchResults(html, query) {
  const $ = load(html)
  const companies = []

  const table = $('table[id*="ergebnis"], table[id*="result"], #ergebnisse table, .ergebnisTabelle').first()

  if (table.length) {
    table.find('tr').each((i, row) => {
      if (i === 0) return
      const cells = $(row).find('td')
      if (cells.length < 4) return

      const firma_name = $(cells[0]).text().trim()
      if (!firma_name) return

      const ort = $(cells[1]).text().trim()
      const gericht = $(cells[2]).text().trim()
      const regText = $(cells[3]).text().trim()
      const regNummer = $(cells[4])?.text?.().trim() || ''
      const statusText = $(cells[5])?.text?.().trim() || ''

      let register_art = ''
      let register_nummer = regNummer || regText

      const regMatch = regText.match(/^(HRB|HRA|PR|GnR|VR)\s*(.*)/)
      if (regMatch) {
        register_art = regMatch[1]
        register_nummer = regMatch[2] || regNummer
      } else if (['HRB', 'HRA', 'PR', 'GnR', 'VR'].includes(regText)) {
        register_art = regText
        register_nummer = regNummer
      }

      if (!isInScope(firma_name, register_art)) return

      const status = /aktiv|active|eingetragen/i.test(statusText) ? 'aktiv' : statusText ? 'gelöscht' : 'aktiv'

      companies.push({
        id: `hr_${register_art}_${register_nummer}_${gericht}`.replace(/\s+/g, '_'),
        firma_name,
        rechtsform: inferRechtsform(firma_name),
        register_art,
        register_nummer,
        register_gericht: gericht,
        sitz: ort,
        status,
        source: 'handelsregister.de',
      })
    })
  }

  // Fallback: scan all tables
  if (companies.length === 0) {
    $('table').each((_, tbl) => {
      const rows = $(tbl).find('tr')
      if (rows.length < 2) return
      const headerText = $(rows[0]).text().toLowerCase()
      if (!headerText.includes('firma') && !headerText.includes('name') && !headerText.includes('register')) return

      rows.each((i, row) => {
        if (i === 0) return
        const cells = $(row).find('td')
        if (cells.length < 3) return
        const firma_name = $(cells[0]).text().trim()
        if (!firma_name || firma_name.length < 2) return

        const allText = $(row).text()
        const regMatch = allText.match(/\b(HRB|HRA|PR|GnR|VR)\s+(\S+)/i)
        const register_art = regMatch ? regMatch[1].toUpperCase() : ''
        const register_nummer = regMatch ? regMatch[2] : ''

        const gerichtMatch = allText.match(/AG\s+\w+/i)
        const register_gericht = gerichtMatch ? gerichtMatch[0] : ''

        if (!isInScope(firma_name, register_art)) return

        companies.push({
          id: `hr_${register_art}_${register_nummer}`.replace(/\s+/g, '_'),
          firma_name,
          rechtsform: inferRechtsform(firma_name),
          register_art,
          register_nummer,
          register_gericht,
          sitz: '',
          status: 'aktiv',
          source: 'handelsregister.de',
        })
      })

      if (companies.length > 0) return false
    })
  }

  return companies.slice(0, 10)
}

// ─── Document list ─────────────────────────────────────────────────────────────

function parseDocumentLinks($, rowIndex, formId) {
  const docs = []
  const row = $('table tr').eq(rowIndex + 1)

  row.find('a, button').each((_, el) => {
    const text = $(el).text().trim().toUpperCase()
    const id = $(el).attr('id') || ''
    if (['SI', 'AD', 'CD', 'DK'].includes(text)) {
      docs.push({ type: text, linkId: id, label: labelForDocType(text) })
    }
  })

  return docs
}

function labelForDocType(type) {
  return {
    SI: 'Strukturierte Inhalte (XML)',
    AD: 'Aktueller Abdruck (PDF)',
    CD: 'Chronologischer Abdruck (PDF)',
    DK: 'Dokumentenliste',
  }[type] || type
}

async function fetchDocumentList(registerArt, registerNummer, registerGericht) {
  const session = await getSession()
  const result = await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (result.rowIndex === -1) {
    return { found: false, documents: [] }
  }

  const $ = load(result.resultsHtml)
  const documents = parseDocumentLinks($, result.rowIndex, result.formId)

  return {
    found: true,
    documents,
    rowIndex: result.rowIndex,
    _session: {
      cookies: result.cookies,
      viewState: result.viewState,
      formId: result.formId,
    },
  }
}

// ─── JSF link helpers ─────────────────────────────────────────────────────────

function findDocLinkId($, rowIndex, docType, formId) {
  const patterns = [
    `${formId}:ergebnistable:${rowIndex}:lnk${docType}`,
    `${formId}:ergebnistable:${rowIndex}:btn${docType}`,
    `${formId}:recordsTable:${rowIndex}:lnk${docType}`,
    `${formId}:recordsTable:${rowIndex}:btn${docType}`,
    `${formId}:j_idt42:${rowIndex}:lnk${docType}`,
    `${formId}:j_idt42:${rowIndex}:btn${docType}`,
    `${formId}:j_idt44:${rowIndex}:lnk${docType}`,
  ]

  for (const id of patterns) {
    // CSS.escape is available in browser; in Node use a simple colon-safe approach
    const escaped = id.replace(/:/g, '\\:')
    if ($(`#${escaped}`).length) return id
  }

  let found = null
  $('table tr').eq(rowIndex + 1).find('a, button').each((_, el) => {
    if ($(el).text().trim().toUpperCase() === docType) {
      found = $(el).attr('id') || null
      return false
    }
  })
  return found
}

async function clickJSFLink(linkId, formId, viewState, cookies, ajaxRender = '') {
  const formData = new URLSearchParams({
    [formId]: formId,
    [linkId]: linkId,
    'javax.faces.ViewState': viewState,
    'javax.faces.source': linkId,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': linkId,
    'javax.faces.ajax': 'true',
  })
  if (ajaxRender) formData.set('javax.faces.partial.render', ajaxRender)

  return fetchHR(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie: cookies,
      'Faces-Request': 'partial/ajax',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: formData.toString(),
    redirect: 'follow',
  })
}

// ─── Document downloads ────────────────────────────────────────────────────────

async function downloadSI(registerArt, registerNummer, registerGericht) {
  const session = await getSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'SI', formId)
  if (!linkId) throw new Error('No SI link found')

  const res = await clickJSFLink(linkId, formId, viewState, cookies)
  const body = await res.arrayBuffer()
  const ct = res.headers.get('content-type') || ''

  if (ct.includes('xml') && !ct.includes('xhtml')) {
    return { buffer: Buffer.from(body), contentType: 'application/xml' }
  }

  const text = Buffer.from(body).toString('utf-8')
  const redir = text.match(/redirect\s+url="([^"]+)"/) ||
    text.match(/location\s*[=:]\s*["']([^"']+)["']/)
  if (redir) {
    const url = redir[1].startsWith('http') ? redir[1] : `${HR_BASE}${redir[1]}`
    const docRes = await fetchHR(url, { headers: { ...browserHeaders(), Cookie: cookies } })
    return { buffer: Buffer.from(await docRes.arrayBuffer()), contentType: 'application/xml' }
  }

  return { buffer: Buffer.from(body), contentType: 'application/xml' }
}

async function downloadAD(registerArt, registerNummer, registerGericht) {
  const session = await getSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'AD', formId)
  if (!linkId) throw new Error('No AD link found')

  const res = await clickJSFLink(linkId, formId, viewState, cookies)
  const ct = res.headers.get('content-type') || ''

  if (ct.includes('pdf')) {
    return { buffer: Buffer.from(await res.arrayBuffer()), contentType: 'application/pdf' }
  }

  const text = await res.text()
  const pdfMatch = text.match(/["']([^"']*\.pdf[^"']*)["']/) ||
    text.match(/window\.location\s*=\s*["']([^"']+)["']/) ||
    text.match(/redirect\s+url="([^"]+)"/)
  if (pdfMatch) {
    const url = pdfMatch[1].startsWith('http') ? pdfMatch[1] : `${HR_BASE}${pdfMatch[1]}`
    const pdfRes = await fetchHR(url, { headers: { ...browserHeaders(), Cookie: cookies } })
    if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`)
    return { buffer: Buffer.from(await pdfRes.arrayBuffer()), contentType: 'application/pdf' }
  }

  return { buffer: Buffer.from(text, 'utf-8'), contentType: ct || 'application/pdf' }
}

async function downloadCD(registerArt, registerNummer, registerGericht) {
  const session = await getSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'CD', formId)
  if (!linkId) throw new Error('No CD link found')

  const res = await clickJSFLink(linkId, formId, viewState, cookies)
  const ct = res.headers.get('content-type') || ''

  if (ct.includes('pdf')) {
    return { buffer: Buffer.from(await res.arrayBuffer()), contentType: 'application/pdf' }
  }

  const text = await res.text()
  const pdfMatch = text.match(/["']([^"']*\.pdf[^"']*)["']/) ||
    text.match(/window\.location\s*=\s*["']([^"']+)["']/) ||
    text.match(/redirect\s+url="([^"]+)"/)
  if (pdfMatch) {
    const url = pdfMatch[1].startsWith('http') ? pdfMatch[1] : `${HR_BASE}${pdfMatch[1]}`
    const pdfRes = await fetchHR(url, { headers: { ...browserHeaders(), Cookie: cookies } })
    if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`)
    return { buffer: Buffer.from(await pdfRes.arrayBuffer()), contentType: 'application/pdf' }
  }

  return { buffer: Buffer.from(text, 'utf-8'), contentType: ct || 'application/pdf' }
}

async function downloadDK(registerArt, registerNummer, registerGericht, docId) {
  const session = await getSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const dkLinkId = findDocLinkId($, rowIndex, 'DK', formId)
  if (!dkLinkId) throw new Error('No DK link found')

  const treeRes = await clickJSFLink(dkLinkId, formId, viewState, cookies)
  const treeHtml = await treeRes.text()
  const treeCookies = mergeCookies(treeRes, cookies)
  const $tree = load(treeHtml)
  const treeViewState = $tree('input[name="javax.faces.ViewState"]').val() || viewState

  let docLinkId = null
  $tree('*').each((_, el) => {
    const text = $tree(el).text()
    if (text.toLowerCase().includes(docId.toLowerCase())) {
      const nearby = $tree(el).closest('tr, li').find('a[id], button[id]').filter((__, btn) => {
        const t = $tree(btn).text().trim().toLowerCase()
        return t.includes('download') || t.includes('herunterlad') || t.includes('laden')
      })
      if (nearby.length) {
        docLinkId = nearby.first().attr('id')
        return false
      }
    }
  })

  if (!docLinkId) throw new Error(`Document "${docId}" not found in DK tree`)

  const dlFormData = new URLSearchParams({
    [formId]: formId,
    [docLinkId]: docLinkId,
    'javax.faces.ViewState': treeViewState,
  })

  const dlRes = await fetchHR(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie: treeCookies,
    },
    body: dlFormData.toString(),
    redirect: 'follow',
  })

  const ct = dlRes.headers.get('content-type') || 'application/pdf'
  return { buffer: Buffer.from(await dlRes.arrayBuffer()), contentType: ct }
}

// ─── Scope / rechtsform helpers ────────────────────────────────────────────────

function isInScope(name, registerArt) {
  if (!name) return false
  const lower = name.toLowerCase()
  if (/\bag\b/.test(lower)) return false
  if (/\bse\b/.test(lower) && !/\bgmbh\b/.test(lower)) return false
  if (/\bkgaa\b/.test(lower)) return false
  if (/kommanditgesellschaft auf aktien/.test(lower)) return false
  if (/\bgmbh\b/.test(lower)) return true
  if (/\bug\b/.test(lower)) return true
  if (/\bkg\b/.test(lower)) return true
  if (/\bohg\b/.test(lower)) return true
  if (/\bpartg\b/.test(lower)) return true
  if (/\beg\b/.test(lower) && !/\bvere/.test(lower)) return true
  if (registerArt === 'HRA') return true
  if (registerArt === 'PR') return true
  if (registerArt === 'GnR') return true
  return false
}

function inferRechtsform(name) {
  const lower = name.toLowerCase()
  if (/ug\s*\(haftungsbeschränkt\)/.test(lower)) return 'UG (haftungsbeschränkt)'
  if (/\bug\b/.test(lower)) return 'UG (haftungsbeschränkt)'
  if (/gmbh\s*&\s*co\.?\s*kg/.test(lower)) return 'GmbH & Co. KG'
  if (/\bgmbh\b/.test(lower)) return 'GmbH'
  if (/\bohg\b/.test(lower)) return 'OHG'
  if (/partgmbb|partg\s+mbb/.test(lower)) return 'PartG mbB'
  if (/\bpartg\b/.test(lower)) return 'PartG'
  if (/\bkg\b/.test(lower)) return 'KG'
  if (/\beg\b/.test(lower)) return 'eG'
  return 'GmbH'
}

module.exports = {
  searchByName,
  fetchDocumentList,
  downloadSI,
  downloadAD,
  downloadCD,
  downloadDK,
  HR_BASE,
  HR_SEARCH_URL,
}
