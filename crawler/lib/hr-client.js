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
const HR_SEARCH_URL = `${HR_BASE}/rp_web/normalesuche/welcome.xhtml`
const HR_RESULTS_URL = `${HR_BASE}/rp_web/sucheErgebnisse/welcome.xhtml`

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
  // Step 1: GET welcome page to establish JSESSIONID and naviForm ViewState
  const welcomeRes = await fetchHR(HR_WELCOME_URL, {
    headers: browserHeaders(),
    redirect: 'follow',
  })
  if (!welcomeRes.ok) throw new Error(`HR welcome page failed: HTTP ${welcomeRes.status}`)

  const welcomeHtml = await welcomeRes.text()
  let cookies = mergeCookies(welcomeRes)
  const $w = load(welcomeHtml)

  const naviVS =
    $w('#naviForm input[name="javax.faces.ViewState"]').val() ||
    $w('input[name="javax.faces.ViewState"]').first().val() ||
    ''
  const naviAction = $w('#naviForm').attr('action') || '/rp_web/welcome.xhtml'
  const postUrl = naviAction.startsWith('http') ? naviAction : `${HR_BASE}${naviAction}`

  // Step 2: POST naviForm to navigate to Erweiterte Suche, handle redirect manually
  const navRes = await fetchHR(postUrl, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_WELCOME_URL,
      Cookie: cookies,
    },
    body: new URLSearchParams({
      naviForm: 'naviForm',
      'naviForm:normaleSucheLink': 'naviForm:normaleSucheLink',
      target: 'normaleSucheLink',
      'javax.faces.ViewState': naviVS,
    }).toString(),
    redirect: 'manual',
  })
  cookies = mergeCookies(navRes, cookies)

  // Step 3: GET the search page WITH cookies (manual redirect follow)
  const location = navRes.headers.get('location')
  const searchPageUrl = location
    ? location.startsWith('http') ? location : `${HR_BASE}${location}`
    : HR_SEARCH_URL
  const searchPageRes = await fetchHR(searchPageUrl, {
    headers: { ...browserHeaders(), Cookie: cookies },
    redirect: 'follow',
  })
  if (!searchPageRes.ok) throw new Error(`HR search page failed: HTTP ${searchPageRes.status}`)

  cookies = mergeCookies(searchPageRes, cookies)
  const html = await searchPageRes.text()
  const $ = load(html)

  const searchForm = $('#form').length
    ? $('#form')
    : $('form').filter((_, el) => $(el).find('[name*="schlagwoerter"]').length > 0).first()
  const formId = searchForm.attr('id') || 'form'
  const viewState =
    searchForm.find('input[name="javax.faces.ViewState"]').val() ||
    $('input[name="javax.faces.ViewState"]').val() ||
    ''

  console.log('[hr-client] created new session via welcome page, formId:', formId, 'viewState length:', viewState.length)
  return { cookies, viewState, formId, html, createdAt: Date.now() }
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function searchByRegister(registerArt, registerNummer, registerGericht, session) {
  const { cookies: sCookies, viewState: sViewState, formId } = session

  // Strip "Amtsgericht " prefix for the court search field
  const gerichtShort = registerGericht.replace(/^Amtsgericht\s*/i, '').trim()

  const formData = new URLSearchParams({
    [formId]: formId,
    [`${formId}:schlagwoerter`]: '',
    [`${formId}:schlagwortOptionen`]: '1',
    [`${formId}:registerArt_input`]: registerArt,
    [`${formId}:registerNummer`]: registerNummer,
    [`${formId}:registerGericht_input`]: gerichtShort,
    [`${formId}:ergebnisseProSeite_input`]: '10',
    [`${formId}:btnSuche`]: `${formId}:btnSuche`,
    'javax.faces.ViewState': sViewState,
    suchTyp: 'n',
  })

  const res = await fetchHR(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie: sCookies,
    },
    body: formData.toString(),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HR search failed: HTTP ${res.status}`)

  const html = await res.text()
  const cookies = mergeCookies(res, sCookies)
  const $ = load(html)

  // Extract ergebnissForm viewState and action URL for document downloads
  const ergebnissForm = $('#ergebnissForm')
  const resultsViewState =
    ergebnissForm.find('input[name="javax.faces.ViewState"]').val() ||
    $('input[name="javax.faces.ViewState"]').first().val() ||
    sViewState
  const resultsFormAction = ergebnissForm.attr('action') || '/rp_web/sucheErgebnisse/welcome.xhtml'
  const resultsUrl = resultsFormAction.startsWith('http')
    ? resultsFormAction
    : `${HR_BASE}${resultsFormAction}`

  // Find the matching row by data-ri index
  let rowIndex = -1
  $('tr[data-ri]').each((_, row) => {
    const ri = parseInt($(row).attr('data-ri') || '-1', 10)
    const text = $(row).text()
    const normGericht = registerGericht.toLowerCase().replace(/\s+/g, ' ').trim()
    if (
      text.includes(registerNummer) &&
      text.toUpperCase().includes(registerArt) &&
      (text.toLowerCase().replace(/\s+/g, ' ').includes(normGericht) || rowIndex === -1)
    ) {
      rowIndex = ri
      return false
    }
  })

  return {
    cookies,
    viewState: resultsViewState,
    formId: 'ergebnissForm',
    resultsUrl,
    resultsHtml: html,
    rowIndex,
  }
}

// ─── Company name search (for /api/search) ────────────────────────────────────

async function searchByName(query, schlagwortOptionen = '2') {
  const session = await getSession()
  const { cookies: sCookies, viewState: sViewState, formId } = session

  const formData = new URLSearchParams({
    [formId]: formId,
    [`${formId}:schlagwoerter`]: query,
    [`${formId}:schlagwortOptionen`]: '1',
    [`${formId}:ergebnisseProSeite_input`]: '25',
    [`${formId}:btnSuche`]: `${formId}:btnSuche`,
    'javax.faces.ViewState': sViewState,
    suchTyp: 'n',
  })

  const res = await fetchHR(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
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

  // Results are in a PrimeFaces datatable: each result is a <tr data-ri="N"> row.
  // Inside each row is a nested table with:
  //   row 0: one td containing "<Land> <bold-span: Gericht Registerart Registernummer>"
  //   row 1: td[0]=company name, td[1]=Sitz, td[2]=Status, td[3]=doc buttons
  $('tr[data-ri]').each((_, row) => {
    const nestedTable = $(row).find('table').first()
    if (!nestedTable.length) return

    const nestedRows = nestedTable.find('tr')
    if (nestedRows.length < 2) return

    // Row 0: gericht/registerart/registernummer are in a bold span
    const headerSpan = $(nestedRows[0]).find('span.fontWeightBold').first()
    const headerText = headerSpan.length
      ? headerSpan.text().trim()
      : $(nestedRows[0]).find('td').first().text().trim()

    // Parse "Amtsgericht Berlin (Charlottenburg) HRB 271697"
    const regMatch = headerText.match(/\b(HRB|HRA|GnR|VR|PR)\s+(\S+)/)
    if (!regMatch) return
    const register_art = regMatch[1]
    const register_nummer = regMatch[2]
    const register_gericht = headerText.slice(0, regMatch.index).trim()

    // Row 1: company data
    const dataCells = $(nestedRows[1]).find('td')
    if (dataCells.length < 2) return

    const firma_name = $(dataCells[0]).text().trim()
    if (!firma_name) return

    const sitz = $(dataCells[1]).text().trim()
    const statusText = dataCells.length >= 3 ? $(dataCells[2]).text().trim() : ''
    const status = /aktuell|eingetragen/i.test(statusText) ? 'aktiv' : 'gelöscht'

    if (!isInScope(firma_name, register_art)) return

    companies.push({
      id: `hr_${register_art}_${register_nummer}_${register_gericht}`.replace(/\s+/g, '_'),
      firma_name,
      rechtsform: inferRechtsform(firma_name),
      register_art,
      register_nummer,
      register_gericht,
      sitz,
      status,
      source: 'handelsregister.de',
    })
  })

  return companies.slice(0, 10)
}

// ─── Document list ─────────────────────────────────────────────────────────────

function parseDocumentLinks($, rowIndex, formId) {
  const docs = []
  const row = $(`tr[data-ri="${rowIndex}"]`)

  row.find('a[id], button[id]').each((_, el) => {
    const text = $(el).text().trim().toUpperCase()
    const id = $(el).attr('id') || ''
    if (['SI', 'AD', 'CD', 'DK', 'HD'].includes(text)) {
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
  // Search the data-ri row directly for a link/button matching the doc type
  let found = null
  $(`tr[data-ri="${rowIndex}"]`).find('a[id], button[id]').each((_, el) => {
    if ($(el).text().trim().toUpperCase() === docType) {
      found = $(el).attr('id') || null
      return false
    }
  })
  return found
}

async function clickJSFLink(linkId, formId, viewState, cookies, resultsUrl = '') {
  // Download buttons are standard PrimeFaces form POSTs — NOT AJAX.
  // Pattern verified live: PrimeFaces.addSubmitParam(formId, {linkId: linkId}).submit(formId)
  // No javax.faces.ajax, no Faces-Request header.
  const postUrl = resultsUrl || HR_RESULTS_URL

  const formData = new URLSearchParams({
    [formId]: formId,
    [linkId]: linkId,
    'javax.faces.ViewState': viewState,
  })

  // DK/UT/VÖ buttons (fade1_ suffix) also need property params.
  // Detect by suffix and inject accordingly.
  const docTypeMap = {
    'Global.Dokumentart.DK': 'DK',
    'Global.Dokumentart.UT': 'UT',
    'Global.Dokumentart.VÖ': 'VÖ',
  }
  if (linkId.includes('fade1_')) {
    // Extract doc type from the link index position
    const idxMatch = linkId.match(/:j_idt\d+:(\d+):fade1_/)
    const idx = idxMatch ? parseInt(idxMatch[1]) : -1
    const propByIdx = { 3: 'Global.Dokumentart.DK', 4: 'Global.Dokumentart.UT', 5: 'Global.Dokumentart.VÖ' }
    if (propByIdx[idx]) {
      formData.set('property', propByIdx[idx])
      formData.set('property2', '')
    }
  }

  return fetchHR(postUrl, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: postUrl,
      Cookie: cookies,
    },
    body: formData.toString(),
    redirect: 'follow',
  })
}

// ─── Document downloads ────────────────────────────────────────────────────────

async function downloadSI(registerArt, registerNummer, registerGericht) {
  const session = await getSession()
  const { cookies, viewState, formId, resultsHtml, resultsUrl, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'SI', formId)
  if (!linkId) throw new Error('No SI link found')

  const res = await clickJSFLink(linkId, formId, viewState, cookies, resultsUrl)
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
  const { cookies, viewState, formId, resultsHtml, resultsUrl, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, 'AD', formId)
  if (!linkId) throw new Error('No AD link found')

  const res = await clickJSFLink(linkId, formId, viewState, cookies, resultsUrl)
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
  const { cookies, viewState, formId, resultsHtml, resultsUrl, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const dkLinkId = findDocLinkId($, rowIndex, 'DK', formId)
  if (!dkLinkId) throw new Error('No DK link found')

  const treeRes = await clickJSFLink(dkLinkId, formId, viewState, cookies, resultsUrl)
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

  const dlRes = await fetchHR(resultsUrl || HR_RESULTS_URL, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: resultsUrl || HR_RESULTS_URL,
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
  downloadDK,
  HR_BASE,
  HR_SEARCH_URL,
}
