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

// ─── Court code mapping ───────────────────────────────────────────────────────
const COURT_NAME_TO_CODE = {
  "Aachen":"R3101","Altenburg":"Y1201","Amberg":"D3101","Ansbach":"D3201",
  "Apolda":"Y1101","Arnsberg":"R1901","Arnstadt":"Y1102",
  "Arnstadt Zweigstelle Ilmenau":"Y1303","Aschaffenburg":"D4102",
  "Augsburg":"D2102","Aurich":"P3101","Bad Hersfeld":"M1305",
  "Bad Homburg v.d.H.":"M1202","Bad Kreuznach":"T2101",
  "Bad Oeynhausen":"R2108","Bad Salzungen":"Y1301","Bamberg":"D4201",
  "Bayreuth":"D4301","Berlin (Charlottenburg)":"F1103","Bielefeld":"R2101",
  "Bochum":"R2201","Bonn":"R3201","Braunschweig":"P1103",
  "Bremen":"H1101","Chemnitz":"U1206","Coburg":"D4401",
  "Coesfeld":"R2707","Cottbus":"G1103","Darmstadt":"M1103",
  "Deggendorf":"D2201","Dortmund":"R2402","Dresden":"U1104",
  "Duisburg":"R1202","Düren":"R3103","Düsseldorf":"R1101",
  "Eisenach":"Y1105","Erfurt":"Y1106","Eschwege":"M1602",
  "Essen":"R2503","Flensburg":"X1112","Frankfurt am Main":"M1201",
  "Frankfurt/Oder":"G1207","Freiburg":"B1204","Friedberg":"M1405",
  "Fritzlar":"M1603","Fulda":"M1301","Fürth":"D3304",
  "Gelsenkirchen":"R2507","Gera":"Y1203","Gießen":"M1406",
  "Gotha":"Y1108","Göttingen":"P2204","Greiz":"Y1205",
  "Gütersloh":"R2103","Hagen":"R2602","Hamburg":"K1101",
  "Hamm":"R2404","Hanau":"M1502","Hannover":"P2305",
  "Heilbad Heiligenstadt":"Y1109","Hildburghausen":"Y1302",
  "Hildesheim":"P2408","Hof":"D4501","Homburg":"V1102",
  "Ingolstadt":"D5701","Iserlohn":"R2604","Jena":"Y1206",
  "Kaiserslautern":"T3201","Kassel":"M1607","Kempten (Allgäu)":"D2304",
  "Kiel":"X1517","Kleve":"R1304","Koblenz":"T2210",
  "Köln":"R3306","Königstein":"M1203","Korbach":"M1608",
  "Krefeld":"R1402","Landau":"T3304","Landshut":"D2404",
  "Langenfeld":"R1105","Lebach":"V1103","Leipzig":"U1308",
  "Lemgo":"R2307","Limburg":"M1706","Lübeck":"X1721",
  "Ludwigshafen a.Rhein (Ludwigshafen)":"T3104","Lüneburg":"P2507",
  "Mainz":"T2304","Mannheim":"B1601","Marburg":"M1809",
  "Meiningen":"Y1304","Memmingen":"D2505","Merzig":"V1104",
  "Mönchengladbach":"R1504","Montabaur":"T2214","Mühlhausen":"Y1110",
  "München":"D2601","Münster":"R2713","Neubrandenburg":"N1105",
  "Neunkirchen":"V1105","Neuruppin":"G1309","Neuss":"R1102",
  "Nordhausen":"Y1111","Nürnberg":"D3310","Offenbach am Main":"M1114",
  "Oldenburg (Oldenburg)":"P3210","Osnabrück":"P3313",
  "Ottweiler":"V1107","Paderborn":"R2809","Passau":"D2803",
  "Pinneberg":"X1321","Pößneck":"Y1209",
  "Pößneck Zweigstelle Bad Lobenstein":"Y1208","Potsdam":"G1312",
  "Recklinghausen":"R2204","Regensburg":"D3410","Rostock":"N1206",
  "Rudolstadt":"Y1210","Saarbrücken":"V1109","Saarlouis":"V1110",
  "Schweinfurt":"D4608","Schwerin":"N1308","Siegburg":"R3208",
  "Siegen":"R2909","Sömmerda":"Y1112","Sondershausen":"Y1113",
  "Sonneberg":"Y1307","Stadthagen":"P2106","Stadtroda":"Y1214",
  "Steinfurt":"R2706","Stendal":"W1215",
  "St. Ingbert (St Ingbert)":"V1111","Stralsund":"N1209",
  "Straubing":"D3413","Stuttgart":"B2609",
  "St. Wendel (St Wendel)":"V1112","Suhl":"Y1308",
  "Tostedt":"P2613","Traunstein":"D2910","Ulm":"B2805",
  "Völklingen":"V1115","Walsrode":"P2716",
  "Weiden i. d. OPf.":"D3508","Weimar":"Y1114","Wetzlar":"M1710",
  "Wiesbaden":"M1906","Wittlich":"T2216","Wuppertal":"R1608",
  "Würzburg":"D4714",
}

function resolveCourtCode(gerichtInput) {
  if (!gerichtInput) return ''
  const raw = gerichtInput.trim()
  if (/^[A-Z]\d{4}$/.test(raw)) return raw
  if (COURT_NAME_TO_CODE[raw]) return COURT_NAME_TO_CODE[raw]
  const stripped = raw
    .replace(/^Amtsgericht\s+/i, '')
    .replace(/^AG\s+/i, '')
    .replace(/^Registergericht\s+/i, '')
    .trim()
  if (COURT_NAME_TO_CODE[stripped]) return COURT_NAME_TO_CODE[stripped]
  const lowerStripped = stripped.toLowerCase()
  for (const [name, code] of Object.entries(COURT_NAME_TO_CODE)) {
    if (name.toLowerCase() === lowerStripped) return code
  }
  for (const [name, code] of Object.entries(COURT_NAME_TO_CODE)) {
    if (name.toLowerCase().includes(lowerStripped) || lowerStripped.includes(name.toLowerCase())) return code
  }
  console.warn(`[hr-client] Could not resolve court code for: ${gerichtInput}, sending empty`)
  return ''
}

// ─── Token-bucket rate limiter (200 req/hour to handelsregister.de) ────────────

const BUCKET_CAPACITY = 200
const BUCKET_REFILL_PER_MS = BUCKET_CAPACITY / (60 * 60 * 1000) // ~3 per minute

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

// ─── Search result cache ──────────────────────────────────────────────────────
// Keyed by "registerArt:registerNummer:registerGericht".
// Caches the verified rowIndex so all downloads use the same result row as
// fetchDocumentList, preventing ambiguous-court bugs (e.g. HRB 25133 exists at
// both AG Augsburg and AG Kiel — if an independent search lands on the wrong
// one, the cached rowIndex from the document-list call corrects it).

const searchResultCache = new Map()
const SEARCH_RESULT_TTL = 8 * 60 * 1000 // 8 minutes

function _setCachedRowIndex(key, rowIndex) {
  searchResultCache.set(key, { rowIndex, ts: Date.now() })
}

function _getCachedRowIndex(key) {
  const entry = searchResultCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > SEARCH_RESULT_TTL) { searchResultCache.delete(key); return null }
  return entry.rowIndex
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

  const courtCode = resolveCourtCode(registerGericht)
  console.log(`[hr-client] search: ${registerArt} ${registerNummer} @ ${registerGericht} → courtCode="${courtCode}"`)


  const formData = new URLSearchParams({
    [formId]: formId,
    [`${formId}:schlagwoerter`]: '',
    [`${formId}:schlagwortOptionen`]: '1',
    [`${formId}:registerArt_input`]: registerArt,
    [`${formId}:registerNummer`]: registerNummer,
    [`${formId}:registergericht_input`]: courtCode,
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
  // Build multiple gericht name variants to handle "AG Kiel", "Amtsgericht Kiel", "Kiel" etc.
  const gerichtVariants = [...new Set([
    registerGericht.toLowerCase().replace(/\s+/g, ' ').trim(),
    registerGericht.replace(/^AG\s+/i, '').toLowerCase().replace(/\s+/g, ' ').trim(),
    registerGericht.replace(/^Amtsgericht\s+/i, '').toLowerCase().replace(/\s+/g, ' ').trim(),
  ])]

  // Collect all rows that match register number + art
  const matchingRows = []
  $('tr[data-ri]').each((_, row) => {
    const ri = parseInt($(row).attr('data-ri') || '-1', 10)
    const text = $(row).text().toLowerCase().replace(/\s+/g, ' ')
    if (
      text.includes(registerNummer.toLowerCase()) &&
      text.includes(registerArt.toLowerCase())
    ) {
      matchingRows.push({ ri, text })
    }
  })

  if (matchingRows.length === 1) {
    // Only one candidate — take it regardless of Gericht (portal already filtered)
    rowIndex = matchingRows[0].ri
  } else if (matchingRows.length > 1) {
    // Multiple candidates — require Gericht match to pick the right one
    const gerichtMatch = matchingRows.find(r => gerichtVariants.some(g => r.text.includes(g)))
    if (gerichtMatch) rowIndex = gerichtMatch.ri
    // If no Gericht match found among multiple rows → rowIndex stays -1 (not found)
  }

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

  // Cache the verified rowIndex so download functions use the same row
  const cacheKey = `${registerArt}:${registerNummer}:${registerGericht}`
  _setCachedRowIndex(cacheKey, result.rowIndex)
  console.log(`[hr-client] cached rowIndex=${result.rowIndex} for ${cacheKey}`)

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

// ─── Apply cached rowIndex ────────────────────────────────────────────────────
// After a fresh searchByRegister call, override rowIndex with the cached value
// (set by fetchDocumentList) if it exists and the row is present in the HTML.
// This ensures all downloads use the same verified row regardless of search
// non-determinism (different sessions may return different orderings).

function _applyCachedRowIndex(registerArt, registerNummer, registerGericht, searchResult) {
  const cacheKey = `${registerArt}:${registerNummer}:${registerGericht}`
  const cachedIdx = _getCachedRowIndex(cacheKey)
  if (cachedIdx === null) return searchResult

  const { resultsHtml, rowIndex } = searchResult
  if (cachedIdx === rowIndex) return searchResult

  // Verify the cached row actually exists in the current search HTML
  const $check = load(resultsHtml)
  if ($check(`tr[data-ri="${cachedIdx}"]`).length > 0) {
    console.log(`[hr-client] overriding search rowIndex=${rowIndex} → cached ${cachedIdx} for ${cacheKey}`)
    return { ...searchResult, rowIndex: cachedIdx }
  }

  // Cached row not in current results — trust the fresh search
  console.warn(`[hr-client] cached rowIndex=${cachedIdx} not in results; using search rowIndex=${rowIndex} for ${cacheKey}`)
  return searchResult
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
    _applyCachedRowIndex(registerArt, registerNummer, registerGericht,
      await searchByRegister(registerArt, registerNummer, registerGericht, session))

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
    _applyCachedRowIndex(registerArt, registerNummer, registerGericht,
      await searchByRegister(registerArt, registerNummer, registerGericht, session))

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
    // Try adm-zip to get decompressed entry
    try {
      const zip = new AdmZip(rawBuffer)
      const entries = zip.getEntries().filter(e => !e.isDirectory)
      let chosen = entries.find(e => e.entryName.toLowerCase().endsWith('.pdf'))
      if (!chosen && entries.length > 0) {
        chosen = entries.reduce((a, b) => (a.header.size > b.header.size ? a : b))
      }
      if (chosen) {
        const data = chosen.getData()
        if (data && data.slice(0, 5).toString('ascii') === '%PDF-') {
          console.log(`[hr-client] ${abdruckType}: extracted PDF from ZIP via adm-zip: ${chosen.entryName}`)
          return { buffer: data, contentType: 'application/pdf' }
        }
      }
    } catch (_) { /* fall through to raw scan */ }

    // Raw scan fallback
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
    _applyCachedRowIndex(registerArt, registerNummer, registerGericht,
      await searchByRegister(registerArt, registerNummer, registerGericht, session))

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
 * @param {string|null} docId
 *   Three modes:
 *   - Exact tree key (e.g. "0_0_1_0")  → downloads that specific leaf
 *   - Keyword (e.g. "gesellschafterliste", "satzung") → picks the highest-scoring
 *     leaf whose label contains the keyword
 *   - null / empty → auto-selects the highest-scoring leaf overall
 */
async function downloadDK(registerArt, registerNummer, registerGericht, docId = null) {
  const { leafMap, currentViewState, currentCookies, dkPageUrl, treeHtml } =
    await _expandDKTree(registerArt, registerNummer, registerGericht)

  let chosenKey = null
  let chosenLabel = ''
  const id = docId && docId.trim() ? docId.trim() : null

  if (id && /^\d+_\d+_\d+_\d+$/.test(id)) {
    // Exact tree key
    if (leafMap.has(id)) {
      chosenKey = id
      chosenLabel = leafMap.get(id).label
    } else {
      console.warn(`[hr-client] DK: exact key "${id}" not in tree, falling back to keyword/best`)
    }
  }

  if (!chosenKey && id) {
    // Keyword filter — find highest-scoring leaf whose label contains the keyword.
    // Expand aliases so e.g. "satzung" also matches "gesellschaftsvertrag" / "statut",
    // and "gesellschafterliste" also matches "gesellschaftsliste".
    const KEYWORD_ALIASES = {
      'satzung':             ['satzung', 'gesellschaftsvertrag', 'gesellschaftsvertag', 'statut'],
      'gesellschafterliste': ['gesellschafterliste', 'gesellschaftsliste', 'gesellschafterlist', 'liste der gesellschafter'],
    }
    const kw = id.toLowerCase()
    const candidates = KEYWORD_ALIASES[kw] ?? [kw]

    let bestScore = -1
    let bestDate = ''
    for (const [key, { score, label }] of leafMap) {
      const combined = (label + ' ' + key).toLowerCase()
      if (!candidates.some(c => combined.includes(c))) continue
      // Extract date from label (e.g. "… am 13.08.2015" → "2015-08-13" for ISO comparison)
      const dateMatch = label.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      const isoDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : ''
      if (score > bestScore || (score === bestScore && isoDate > bestDate)) {
        bestScore = score; bestDate = isoDate; chosenKey = key; chosenLabel = label
      }
    }
    if (!chosenKey) {
      // A specific docId was requested but no matching leaf found — throw rather than
      // silently downloading the wrong document (e.g. Satzung when Gesellschafterliste
      // was requested but does not exist in this company's DK tree).
      throw new Error(`Dokument "${id}" nicht im Dokumentenbaum gefunden (nicht verfügbar für dieses Unternehmen)`)
    }
  }

  if (!chosenKey) {
    // No docId given — auto-select highest-scoring leaf overall
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
  if (ct.includes('zip') || ct.includes('octet-stream') || rawBuffer.slice(0, 2).toString('ascii') === 'PK') {
    // Try adm-zip: first look for .pdf entry, then fall back to largest entry
    try {
      const zip = new AdmZip(rawBuffer)
      const entries = zip.getEntries().filter(e => !e.isDirectory)
      console.log(`[hr-client] DK: ZIP has ${entries.length} entries: ${entries.map(e => e.entryName).join(', ')}`)

      // Prefer an entry whose name ends in .pdf (case-insensitive)
      let chosen = entries.find(e => e.entryName.toLowerCase().endsWith('.pdf'))
      // Fallback: largest entry (the PDF regardless of name/extension)
      if (!chosen && entries.length > 0) {
        chosen = entries.reduce((a, b) => (a.header.size > b.header.size ? a : b))
        console.log(`[hr-client] DK: no .pdf entry, using largest: ${chosen.entryName}`)
      }
      if (chosen) {
        const data = chosen.getData()
        if (data && data.length > 0) {
          // Determine content-type from entry name extension
          const ext = chosen.entryName.split('.').pop().toLowerCase()
          const MIME = { pdf: 'application/pdf', tif: 'image/tiff', tiff: 'image/tiff', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }
          const entryContentType = MIME[ext] || 'application/octet-stream'
          console.log(`[hr-client] DK: extracted ${ext.toUpperCase()} from ZIP: ${chosen.entryName} (${data.length} bytes)`)
          return { buffer: data, contentType: entryContentType, filename: chosen.entryName }
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
