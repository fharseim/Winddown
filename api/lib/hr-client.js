/**
 * Shared handelsregister.de client.
 *
 * Handles:
 *  - Session creation (cookies + JSF ViewState)
 *  - Company search by register data
 *  - Document list extraction from results
 *  - Document downloads: SI (XML), AD (PDF), DK (document tree → PDF)
 */

import { load } from 'cheerio'

export const HR_BASE = 'https://www.handelsregister.de'
export const HR_WELCOME_URL = `${HR_BASE}/rp_web/welcome.xhtml`
export const HR_SEARCH_URL = `${HR_BASE}/rp_web/erweitertesuche/welcome.xhtml`

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'Accept-Encoding': 'identity',
  Connection: 'keep-alive',
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

export async function fetchWithTimeout(url, opts, timeoutMs = 25000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Merges Set-Cookie headers from a response into an existing cookie string.
 */
export function mergeCookies(res, existing = '') {
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

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Opens handelsregister.de and returns a session object:
 *   { cookies, viewState, formId, html }
 */
export async function createSession() {
  // Step 1: Welcome page — establishes a valid JSESSIONID
  const res1 = await fetchWithTimeout(HR_WELCOME_URL, { headers: { ...BROWSER_HEADERS } })
  if (!res1.ok) throw new Error(`HR welcome init failed: HTTP ${res1.status}`)
  const html1 = await res1.text()
  let cookies = mergeCookies(res1)
  const $1 = load(html1)
  const naviViewState = $1('form#naviForm input[name="javax.faces.ViewState"]').val() || ''

  // Step 2: Navigate to extended search via naviForm POST (returns 302)
  const navBody = new URLSearchParams({
    naviForm: 'naviForm',
    'naviForm:erweiterteSucheLink': 'naviForm:erweiterteSucheLink',
    'javax.faces.ViewState': naviViewState,
  })
  const res2 = await fetchWithTimeout(HR_WELCOME_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
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
  const res3 = await fetchWithTimeout(searchUrl, { headers: { ...BROWSER_HEADERS, Cookie: cookies } })
  cookies = mergeCookies(res3, cookies)
  const html3 = await res3.text()
  const $3 = load(html3)
  const viewState = $3('form[id="form"] input[name="javax.faces.ViewState"]').val() || ''
  const formId = 'form'

  return { cookies, viewState, formId, html: html3, searchUrl }
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Searches for a company by register data.
 * Returns { cookies, viewState, formId, resultsHtml, rowIndex }.
 * rowIndex is the 0-based index of the matching row (-1 if not found).
 */
export async function searchByRegister(registerArt, registerNummer, registerGericht, session) {
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

  const res = await fetchWithTimeout(searchUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
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

  // Find the row that matches register art + nummer + gericht
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

// ─── Document list ────────────────────────────────────────────────────────────

/**
 * Parses available document types (SI/AD/CD/DK) from the results page.
 * Returns an array of:
 *   { type: 'SI'|'AD'|'CD'|'DK', linkId: string, label: string }
 */
export function parseDocumentLinks($, rowIndex, formId) {
  const docs = []
  const row = $('table tr').eq(rowIndex + 1) // +1 for header

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
  const labels = {
    SI: 'Strukturierte Inhalte (XML)',
    AD: 'Aktueller Abdruck (PDF)',
    CD: 'Chronologischer Abdruck (PDF)',
    DK: 'Dokumentenliste',
  }
  return labels[type] || type
}

// ─── JSF link helpers ─────────────────────────────────────────────────────────

/**
 * Finds the JSF component ID of a document type link in a result row.
 * Tries common naming patterns used by handelsregister.de.
 */
export function findDocLinkId($, rowIndex, docType, formId) {
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
    if ($(`#${CSS.escape(id)}`).length) return id
  }

  // Fallback: scan the correct row
  let found = null
  $('table tr').eq(rowIndex + 1).find('a, button').each((_, el) => {
    if ($( el).text().trim().toUpperCase() === docType) {
      found = $(el).attr('id') || null
      return false
    }
  })
  return found
}

/**
 * Simulates a JSF command link click via form POST.
 * Returns the raw fetch Response.
 */
export async function clickJSFLink(linkId, formId, viewState, cookies, ajaxRender = '') {
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

  return fetchWithTimeout(HR_SEARCH_URL, {
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
}

// ─── SI download ──────────────────────────────────────────────────────────────

export async function downloadSI(registerArt, registerNummer, registerGericht) {
  const session = await createSession()
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

  // Parse AJAX response for redirect URL
  const text = Buffer.from(body).toString('utf-8')
  const redir = text.match(/redirect\s+url="([^"]+)"/) ||
    text.match(/location\s*[=:]\s*["']([^"']+)["']/)
  if (redir) {
    const url = redir[1].startsWith('http') ? redir[1] : `${HR_BASE}${redir[1]}`
    const docRes = await fetchWithTimeout(url, { headers: { ...BROWSER_HEADERS, Cookie: cookies } })
    return { buffer: Buffer.from(await docRes.arrayBuffer()), contentType: 'application/xml' }
  }

  return { buffer: Buffer.from(body), contentType: 'application/xml' }
}

// ─── AD download ──────────────────────────────────────────────────────────────

export async function downloadAD(registerArt, registerNummer, registerGericht) {
  const session = await createSession()
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
    const pdfRes = await fetchWithTimeout(url, { headers: { ...BROWSER_HEADERS, Cookie: cookies } })
    if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`)
    return { buffer: Buffer.from(await pdfRes.arrayBuffer()), contentType: 'application/pdf' }
  }

  return { buffer: Buffer.from(text, 'utf-8'), contentType: ct || 'application/pdf' }
}

// ─── DK download ──────────────────────────────────────────────────────────────

export async function downloadDK(registerArt, registerNummer, registerGericht, docId) {
  const session = await createSession()
  const { cookies, viewState, formId, resultsHtml, rowIndex } =
    await searchByRegister(registerArt, registerNummer, registerGericht, session)

  if (rowIndex === -1) throw new Error(`Company not found: ${registerArt} ${registerNummer}`)

  const $ = load(resultsHtml)
  const dkLinkId = findDocLinkId($, rowIndex, 'DK', formId)
  if (!dkLinkId) throw new Error('No DK link found')

  // Open document tree
  const treeRes = await clickJSFLink(dkLinkId, formId, viewState, cookies)
  const treeHtml = await treeRes.text()
  const treeCookies = mergeCookies(treeRes, cookies)
  const $tree = load(treeHtml)
  const treeViewState = $tree('input[name="javax.faces.ViewState"]').val() || viewState

  // Find the specific document link in the tree
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

  const formData = new URLSearchParams({
    [formId]: formId,
    [docLinkId]: docLinkId,
    'javax.faces.ViewState': treeViewState,
  })

  const dlRes = await fetchWithTimeout(HR_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie: treeCookies,
    },
    body: formData.toString(),
    redirect: 'follow',
  })

  const ct = dlRes.headers.get('content-type') || 'application/pdf'
  return { buffer: Buffer.from(await dlRes.arrayBuffer()), contentType: ct }
}

// ─── SI XML parser ────────────────────────────────────────────────────────────

/**
 * Parses the SI XML into structured company data.
 * The SI format is handelsregister.de's proprietary XML schema.
 * Returns a partial object — only fields we can reliably extract.
 */
export function parseSIXml(xmlBuffer) {
  const xml = xmlBuffer.toString('utf-8')

  // Extract using regex — avoids needing a full XML parser package
  function extractText(tag) {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i'))
    return m ? m[1].trim() : null
  }

  function extractAll(tag) {
    const results = []
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'gi')
    let m
    while ((m = re.exec(xml)) !== null) results.push(m[1].trim())
    return results
  }

  // Company name
  const firma = extractText('bezeichnung') || extractText('firmenname') || extractText('name')

  // Stammkapital
  const stammkapitalRaw = extractText('stammkapital') || extractText('kapital')
  const stammkapital = stammkapitalRaw ? parseFloat(stammkapitalRaw.replace(/[^0-9.,]/g, '').replace(',', '.')) : null

  // Geschäftsanschrift
  const strasse = extractText('strasse') || extractText('street')
  const plz = extractText('postleitzahl') || extractText('plz')
  const ort = extractText('ort') || extractText('city')
  const adresse = [strasse, plz && ort ? `${plz} ${ort}` : ort].filter(Boolean).join(', ')

  // Gesellschafter
  const gesellschafterBlocks = extractAll('gesellschafter')
  const gesellschafter = gesellschafterBlocks.map(block => {
    const nameMatch = block.match(/<(?:nachname|familienname|name)[^>]*>([^<]+)</)
    const vornameMatch = block.match(/<vorname[^>]*>([^<]+)</)
    const anteilMatch = block.match(/<(?:anteil|einlage|betrag)[^>]*>([^<]+)</)
    const name = [vornameMatch?.[1], nameMatch?.[1]].filter(Boolean).join(' ') || 'Unbekannt'
    const anteil = anteilMatch ? anteilMatch[1].trim() : null
    return { name, anteil }
  })

  // Geschäftsführer
  const gfBlocks = extractAll('geschaeftsfuehrer').concat(extractAll('vertretungsberechtigte'))
  const geschaeftsfuehrer = gfBlocks.map(block => {
    const nameMatch = block.match(/<(?:nachname|familienname|name)[^>]*>([^<]+)</)
    const vornameMatch = block.match(/<vorname[^>]*>([^<]+)</)
    return [vornameMatch?.[1], nameMatch?.[1]].filter(Boolean).join(' ') || 'Unbekannt'
  })

  return {
    firma,
    stammkapital,
    adresse: adresse || null,
    gesellschafter: gesellschafter.length ? gesellschafter : null,
    geschaeftsfuehrer: geschaeftsfuehrer.length ? geschaeftsfuehrer : null,
  }
}

// ─── Document list from results page ─────────────────────────────────────────

/**
 * Full flow: create session → search → extract document links.
 * Returns { documents: [{type, linkId, label}], rowIndex, ... }
 */
export async function fetchDocumentList(registerArt, registerNummer, registerGericht) {
  const session = await createSession()
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
    // Pass session state for downstream use
    _session: {
      cookies: result.cookies,
      viewState: result.viewState,
      formId: result.formId,
    },
  }
}
