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
const AdmZip = require('adm-zip')

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

async function _downloadAbdruck(registerArt, registerNummer, registerGericht, abdruckType) {
  const session = await getSession()
  const { cookies, viewState, formId, resultsHtml, resultsUrl, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const linkId = findDocLinkId($, rowIndex, abdruckType, formId)
  if (!linkId) throw new Error(`No ${abdruckType} link found`)

  const res = await clickJSFLink(linkId, formId, viewState, cookies, resultsUrl)
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  const rawBuffer = Buffer.from(await res.arrayBuffer())

  // PDF: explicit content-type or magic bytes (%PDF-)
  if (ct.includes('pdf') || rawBuffer.slice(0, 5).toString('ascii') === '%PDF-') {
    console.log(`[hr-client] ${abdruckType}: got PDF (ct="${ct}", size=${rawBuffer.length})`)
    return { buffer: rawBuffer, contentType: 'application/pdf' }
  }

  // ZIP containing PDF (handelsregister sometimes wraps it)
  if (ct.includes('zip') || ct.includes('octet-stream') || rawBuffer.slice(0, 2).toString('ascii') === 'PK') {
    const pdfMagic = Buffer.from('%PDF-')
    const pdfOffset = rawBuffer.indexOf(pdfMagic)
    if (pdfOffset !== -1) {
      const eofMarker = Buffer.from('%%EOF')
      let eofOffset = rawBuffer.lastIndexOf(eofMarker)
      if (eofOffset === -1) eofOffset = rawBuffer.length
      else eofOffset += eofMarker.length
      console.log(`[hr-client] ${abdruckType}: extracted PDF from ZIP via raw scan`)
      return { buffer: rawBuffer.slice(pdfOffset, eofOffset), contentType: 'application/pdf' }
    }
  }

  // HTML response — check for redirect URL to a PDF
  const text = rawBuffer.toString('utf-8')
  const pdfMatch = text.match(/["']([^"']*\.pdf[^"']*)["']/) ||
    text.match(/window\.location\s*=\s*["']([^"']+)["']/) ||
    text.match(/redirect\s+url="([^"]+)"/)
  if (pdfMatch) {
    const url = pdfMatch[1].startsWith('http') ? pdfMatch[1] : `${HR_BASE}${pdfMatch[1]}`
    const pdfRes = await fetchHR(url, { headers: { ...browserHeaders(), Cookie: cookies } })
    if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`)
    return { buffer: Buffer.from(await pdfRes.arrayBuffer()), contentType: 'application/pdf' }
  }

  return { buffer: rawBuffer, contentType: ct || 'application/pdf' }
}

async function downloadAD(registerArt, registerNummer, registerGericht) {
  return _downloadAbdruck(registerArt, registerNummer, registerGericht, 'AD')
}

async function downloadCD(registerArt, registerNummer, registerGericht) {
  return _downloadAbdruck(registerArt, registerNummer, registerGericht, 'CD')
}

// ─── DK shared helpers ────────────────────────────────────────────────────────

// Scores a DK leaf node by its label and parent category label.
// Higher score = more important document type.
function _dkLeafScore($t, el) {
  const label = ($t(el).find('.ui-treenode-label').first().text() || '').toLowerCase()
  const catLabel = ($t(el).closest('li.ui-treenode-parent').find('> .ui-treenode-content .ui-treenode-label, > div .ui-treenode-label').first().text() || '').toLowerCase()
  const combined = label + ' ' + catLabel
  if (combined.includes('gesellschafterliste')) return 4
  if (combined.includes('satzung') || combined.includes('gesellschaftsvertrag')) return 3
  if (combined.includes('musterprotokoll')) return 2
  return 1
}

/**
 * Shared helper: search for the company, navigate to the DK tree page,
 * expand all category nodes, and return the full leaf map.
 *
 * Returns:
 *   { leafMap, currentViewState, currentCookies, dkPageUrl, treeHtml }
 *
 * leafMap is a Map<rowKey, { score, label }> containing ALL document leaves
 * found after expanding every category in the PrimeFaces dynamic tree.
 */
async function _expandDKTree(registerArt, registerNummer, registerGericht) {
  // ── Step 1: search → results page ────────────────────────────────────────────
  const session = await getSession()
  const { cookies, viewState, formId, resultsHtml, resultsUrl, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const dkLinkId = findDocLinkId($, rowIndex, 'DK', formId)
  if (!dkLinkId) throw new Error('No DK link found')

  // ── Step 2: click DK link → navigate to DK tree page ─────────────────────────
  const treeRes = await clickJSFLink(dkLinkId, formId, viewState, cookies, resultsUrl)
  const treeHtml = await treeRes.text()
  const treeCookies = mergeCookies(treeRes, cookies)

  // Capture the final URL after redirect (e.g. /rp_web/documents/welcome.xhtml?cid=N)
  const dkPageUrl = treeRes.url || `${HR_BASE}/rp_web/documents/welcome.xhtml`

  const $tree = load(treeHtml)
  const treeViewState = $tree('input[name="javax.faces.ViewState"]').val() || viewState

  // ── Step 3: expand ALL categories, accumulate leaves ─────────────────────────
  // The PrimeFaces tree is dynamic (lazy-loaded): category nodes are rendered in
  // the initial HTML, but their children are only loaded via AJAX expand requests.
  // PrimeFaces may return delta-only updates — we accumulate across all responses.

  const leafMap = new Map() // rowKey -> { score, label }

  function collectLeaves($t) {
    $t('li.ui-treenode-leaf').each((_, el) => {
      const key = $t(el).attr('data-rowkey') || null
      if (!key || leafMap.has(key)) return
      const score = _dkLeafScore($t, el)
      const label = $t(el).find('.ui-treenode-label').first().text() || key
      leafMap.set(key, { score, label })
    })
  }

  // Seed with whatever is already in the initial tree HTML
  collectLeaves($tree)

  let currentViewState = treeViewState
  let currentCookies = treeCookies

  // Collect category node keys (pattern: N_N_N) — always expand all of them
  const categoryKeys = []
  $tree('li.ui-treenode-parent').each((_, el) => {
    const key = $tree(el).attr('data-rowkey') || ''
    if (/^\d+_\d+_\d+$/.test(key)) categoryKeys.push(key)
  })
  if (categoryKeys.length === 0) {
    categoryKeys.push('0_0_0', '0_0_1', '0_0_2', '0_0_3', '0_0_4')
  }
  console.log(`[hr-client] DK: expanding ${categoryKeys.length} category nodes`)

  for (const catKey of categoryKeys) {
    const expandBody = new URLSearchParams({
      'javax.faces.partial.ajax': 'true',
      'javax.faces.source': 'dk_form:dktree',
      'javax.faces.partial.execute': 'dk_form:dktree',
      'javax.faces.partial.render': 'dk_form:dktree',
      'javax.faces.behavior.event': 'expand',
      'javax.faces.partial.event': 'expand',
      'dk_form:dktree_expandNode': catKey,
      'dk_form': 'dk_form',
      'javax.faces.ViewState': currentViewState,
      'dk_form:dktree_selection': '',
      'dk_form:dktree_scrollState': '0,0',
    })

    const expandRes = await fetchHR(dkPageUrl, {
      method: 'POST',
      headers: {
        ...browserHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Faces-Request': 'partial/ajax',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: dkPageUrl,
        Cookie: currentCookies,
      },
      body: expandBody.toString(),
      redirect: 'follow',
    })

    const expandXml = await expandRes.text()
    currentCookies = mergeCookies(expandRes, currentCookies)

    const vsExpand =
      expandXml.match(/<update[^>]+id="javax\.faces\.ViewState"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/update>/) ||
      expandXml.match(/<update[^>]+id="javax\.faces\.ViewState"[^>]*>([\s\S]*?)<\/update>/)
    if (vsExpand) currentViewState = vsExpand[1].trim()

    const treeUpdateMatch =
      expandXml.match(/<update[^>]+id="dk_form:dktree"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/update>/) ||
      expandXml.match(/<update[^>]+id="dk_form:dktree"[^>]*>([\s\S]*?)<\/update>/)
    if (treeUpdateMatch) {
      const $expanded = load(treeUpdateMatch[1])
      collectLeaves($expanded)
      console.log(`[hr-client] DK: expanded ${catKey}, total leaves so far: ${leafMap.size}`)
    }
  }

  // Log all found leaves
  console.log(`[hr-client] DK: all leaves found (${leafMap.size}):`)
  for (const [key, { score, label }] of leafMap) {
    console.log(`[hr-client]   ${key} score=${score} "${label}"`)
  }

  return { leafMap, currentViewState, currentCookies, dkPageUrl, treeHtml }
}

/**
 * Returns all available DK document leaves as an array:
 * [{ key, label, score }, ...]  — sorted by score descending, then label.
 */
async function listDKDocuments(registerArt, registerNummer, registerGericht) {
  const { leafMap } = await _expandDKTree(registerArt, registerNummer, registerGericht)

  const docs = []
  for (const [key, { score, label }] of leafMap) {
    docs.push({ key, label, score })
  }
  // Sort: highest score first, then alphabetically by label
  docs.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'de'))
  return docs
}

/**
 * Downloads a specific DK document.
 *
 * @param {string} registerArt
 * @param {string} registerNummer
 * @param {string} registerGericht
 * @param {string|null} leafKey  — rowKey from the DK tree (e.g. "0_0_1_0").
 *   If null/empty, automatically selects the highest-scoring document.
 */
async function downloadDK(registerArt, registerNummer, registerGericht, leafKey = null) {
  const { leafMap, currentViewState, currentCookies, dkPageUrl, treeHtml } =
    await _expandDKTree(registerArt, registerNummer, registerGericht)

  // Resolve which leaf to download
  let chosenKey = leafKey && leafKey.trim() ? leafKey.trim() : null
  let chosenLabel = ''

  if (chosenKey) {
    // Validate the requested key exists in the tree
    if (!leafMap.has(chosenKey)) {
      console.warn(`[hr-client] DK: requested leafKey "${chosenKey}" not found in tree, falling back to best leaf`)
      chosenKey = null
    } else {
      chosenLabel = leafMap.get(chosenKey).label
    }
  }

  if (!chosenKey) {
    // Auto-select highest-scoring leaf
    let bestScore = 0
    for (const [key, { score, label }] of leafMap) {
      if (score > bestScore) { bestScore = score; chosenKey = key; chosenLabel = label }
    }
  }

  if (!chosenKey) throw new Error('No downloadable document found in DK tree after expanding categories')
  console.log(`[hr-client] DK leaf node key: ${chosenKey} ("${chosenLabel}")`)

  const $tree = load(treeHtml)

  // ── Step 4: PrimeFaces AJAX POST — select the leaf node ──────────────────────
  const ajaxBody = new URLSearchParams({
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'dk_form:dktree',
    'javax.faces.partial.execute': 'dk_form:dktree',
    'javax.faces.partial.render': 'dk_form:detailsNodePanelGrid dk_form:dktree dk_formInfobox',
    'javax.faces.behavior.event': 'select',
    'javax.faces.partial.event': 'select',
    'dk_form:dktree_instantSelection': chosenKey,
    'dk_form': 'dk_form',
    'javax.faces.ViewState': currentViewState,
    'dk_form:dktree_selection': chosenKey,
    'dk_form:dktree_scrollState': '0,0',
    'dk_form:radio_dkbuttons': 'true',
  })

  const ajaxRes = await fetchHR(dkPageUrl, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Faces-Request': 'partial/ajax',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: dkPageUrl,
      Cookie: currentCookies,
    },
    body: ajaxBody.toString(),
    redirect: 'follow',
  })

  const ajaxText = await ajaxRes.text()
  const ajaxCookies = mergeCookies(ajaxRes, currentCookies)

  // ── Step 5: extract updated ViewState from PrimeFaces AJAX XML response ───────
  let updatedViewState = currentViewState
  const vsMatch =
    ajaxText.match(/<update[^>]+id="javax\.faces\.ViewState"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/update>/) ||
    ajaxText.match(/<update[^>]+id="javax\.faces\.ViewState"[^>]*>([\s\S]*?)<\/update>/)
  if (vsMatch) {
    updatedViewState = vsMatch[1].trim()
    console.log('[hr-client] updated ViewState from AJAX response')
  }

  // ── Step 6: find the Download submit button ID ────────────────────────────────
  let downloadBtnId = null
  const btnPattern = /id="(dk_form:j_idt\d+)"[^>]*type="submit"/
  const btnMatchHtml = treeHtml.match(btnPattern) || ajaxText.match(btnPattern)
  if (btnMatchHtml) downloadBtnId = btnMatchHtml[1]

  if (!downloadBtnId) {
    $tree('form#dk_form button[type="submit"]').each((_, el) => {
      if (!downloadBtnId) downloadBtnId = $tree(el).attr('id') || null
    })
  }

  if (!downloadBtnId) throw new Error('Could not locate DK Download button in page HTML')
  console.log(`[hr-client] DK download button: ${downloadBtnId}`)

  // ── Step 7: submit the download form (regular form POST, not AJAX) ────────────
  const dlBody = new URLSearchParams({
    'dk_form': 'dk_form',
    'javax.faces.ViewState': updatedViewState,
    'dk_form:dktree_selection': chosenKey,
    'dk_form:dktree_scrollState': '0,0',
    'dk_form:radio_dkbuttons': 'true',
    [downloadBtnId]: '',
  })

  const dlRes = await fetchHR(dkPageUrl, {
    method: 'POST',
    headers: {
      ...browserHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: dkPageUrl,
      Cookie: ajaxCookies,
    },
    body: dlBody.toString(),
    redirect: 'follow',
  })

  const ct = (dlRes.headers.get('content-type') || 'application/pdf').toLowerCase()
  const rawBuffer = Buffer.from(await dlRes.arrayBuffer())

  if (ct.includes('pdf')) {
    return { buffer: rawBuffer, contentType: 'application/pdf' }
  }

  // Handelsregister returns a ZIP containing the PDF — extract it
  if (ct.includes('zip') || ct.includes('octet-stream') || rawBuffer.slice(0, 2).toString() === 'PK') {
    // Try adm-zip first (reads central directory)
    try {
      const zip = new AdmZip(rawBuffer)
      const entries = zip.getEntries()
      const pdfEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.pdf'))
      if (pdfEntry) {
        const data = pdfEntry.getData()
        if (data && data.length > 0) {
          console.log(`[hr-client] DK: extracted PDF from ZIP: ${pdfEntry.entryName}`)
          return { buffer: data, contentType: 'application/pdf' }
        }
      }
    } catch (zipErr) {
      console.warn(`[hr-client] DK: adm-zip failed (${zipErr.message}), trying raw scan`)
    }

    // Fallback: scan raw buffer for PDF magic bytes (%PDF-)
    const pdfMagic = Buffer.from('%PDF-')
    const pdfOffset = rawBuffer.indexOf(pdfMagic)
    if (pdfOffset !== -1) {
      const eofMarker = Buffer.from('%%EOF')
      let eofOffset = rawBuffer.lastIndexOf(eofMarker)
      if (eofOffset === -1) eofOffset = rawBuffer.length
      else eofOffset += eofMarker.length
      const pdfBuffer = rawBuffer.slice(pdfOffset, eofOffset)
      console.log(`[hr-client] DK: extracted PDF via raw scan (offset ${pdfOffset}, size ${pdfBuffer.length})`)
      return { buffer: pdfBuffer, contentType: 'application/pdf' }
    }

    console.warn('[hr-client] DK: could not extract PDF from ZIP, returning raw buffer')
    return { buffer: rawBuffer, contentType: 'application/zip' }
  }

  const snippet = rawBuffer.toString('utf-8').substring(0, 300)
  throw new Error(`DK download returned unexpected content-type "${ct}". Body: ${snippet}`)
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
  listDKDocuments,
  HR_BASE,
  HR_SEARCH_URL,
}
