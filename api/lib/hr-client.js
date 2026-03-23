/**
 * Shared handelsregister.de HTTP client
 *
 * Handles session bootstrapping (ViewState + cookies), name-based search,
 * register-number search and raw document-tree fetching.  All higher-level
 * endpoints (hr-search, hr-documents) import from here so we never duplicate
 * the session / retry logic.
 */

import { load } from 'cheerio'

// ─── Constants ────────────────────────────────────────────────────────────────

export const HR_BASE       = 'https://www.handelsregister.de'
export const HR_SEARCH_URL = `${HR_BASE}/rp_web/erweitertesuche.xhtml`

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
}

// Document types available on handelsregister.de
export const DOC_TYPE_LABELS = {
  SI: 'Strukturierte Inhalte (XML)',
  AD: 'Aktueller Abdruck (PDF)',
  CD: 'Chronologischer Abdruck (PDF)',
  DK: 'Dokumente',
  HD: 'Historische Daten',
  VÖ: 'Veröffentlichungen',
  UT: 'Unternehmensträgerdaten',
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

export async function fetchWithTimeout(url, opts, timeoutMs = 14000) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─── Session bootstrap ────────────────────────────────────────────────────────

/**
 * GET the search page, harvest cookies and the JSF ViewState.
 * Returns { viewState, cookies, html }
 */
export async function getSession() {
  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    headers: { ...BROWSER_HEADERS },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`getSession HTTP ${res.status}`)

  // Collect Set-Cookie headers (Node 18+ getSetCookie() / fallback for older)
  const setCookie = res.headers.getSetCookie?.() ?? []
  let cookies
  if (setCookie.length) {
    cookies = setCookie.map(c => c.split(';')[0]).join('; ')
  } else {
    const raw = res.headers.get('set-cookie') || ''
    cookies = raw
      .split(',')
      .map(c => c.trim().split(';')[0])
      .join('; ')
  }

  const html = await res.text()
  const $    = load(html)

  let viewState = $('input[name="javax.faces.ViewState"]').val() || ''
  if (!viewState) viewState = $('[id$="ViewState"]').val() || ''

  return { viewState, cookies, html }
}

// ─── Search helpers ───────────────────────────────────────────────────────────

/**
 * POST a keyword search.  Returns raw results-page HTML.
 */
export async function searchByName(query, session, schlagwortOptionen = '2') {
  const body = new URLSearchParams({
    'form1':                    'form1',
    'form1:schlagwoerter':      query,
    'form1:schlagwortOptionen': schlagwortOptionen,
    'form1:btnSuche':           'Suche',
    'javax.faces.ViewState':    session.viewState,
  })

  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    method:  'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie:  session.cookies,
    },
    body:     body.toString(),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`searchByName POST HTTP ${res.status}`)
  return res.text()
}

/**
 * Search by exact register number (+ optional art / gericht).
 * Uses the Schlagwort field with the raw number so the site can match it.
 * Returns raw results-page HTML.
 */
export async function searchByRegister(registerArt, registerNummer, registerGericht, session) {
  // We pass the register number as the keyword; the site's full-text index
  // picks it up.  We also set form1:registerart when the field is present.
  const body = new URLSearchParams({
    'form1':                    'form1',
    'form1:schlagwoerter':      registerNummer.trim(),
    'form1:schlagwortOptionen': '2',
    'form1:registerart':        registerArt.trim(),
    'form1:btnSuche':           'Suche',
    'javax.faces.ViewState':    session.viewState,
  })

  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    method:  'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie:  session.cookies,
    },
    body:     body.toString(),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`searchByRegister POST HTTP ${res.status}`)
  return res.text()
}

// ─── Document tree fetcher ────────────────────────────────────────────────────

/**
 * Follow a DK document-tree href (absolute or relative).
 * Returns raw HTML.
 */
export async function getDocumentTree(href, session) {
  const url = href.startsWith('http') ? href : `${HR_BASE}${href}`
  const res = await fetchWithTimeout(url, {
    headers: {
      ...BROWSER_HEADERS,
      Referer: HR_SEARCH_URL,
      Cookie:  session.cookies,
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`getDocumentTree HTTP ${res.status}`)
  return res.text()
}

/**
 * Submit a JSF action link (onclick="mojarra.jsfcljs(...)") by re-POSTing
 * the page form with the clicked element's ID as an extra parameter.
 * Returns raw HTML of the resulting page.
 */
export async function submitJsfAction(clickedId, session) {
  const body = new URLSearchParams({
    'form1':                 'form1',
    [clickedId]:             clickedId,
    'javax.faces.ViewState': session.viewState,
  })

  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    method:  'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: HR_SEARCH_URL,
      Cookie:  session.cookies,
    },
    body:     body.toString(),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`submitJsfAction POST HTTP ${res.status}`)
  return res.text()
}

// ─── HTML parsers ─────────────────────────────────────────────────────────────

/**
 * Given a results-page HTML string and identify criteria, locate the matching
 * company row and return:
 *   { rowHtml, availableTypes, docLinks }
 *
 * availableTypes: string[] e.g. ['SI', 'AD', 'CD', 'DK']
 * docLinks: { type, href, jsfId }[]  — href may be null if JSF-only
 */
export function parseDocumentLinks(html, registerArt, registerNummer, registerGericht) {
  const $ = load(html)

  const knownTypes  = Object.keys(DOC_TYPE_LABELS)
  const availableTypes = []
  const docLinks       = []

  // Walk every table row looking for the one that matches our register entry
  let matched = false

  $('table tr').each((i, row) => {
    if (matched) return false   // break
    if (i === 0) return          // skip header

    const rowText = $(row).text().replace(/\s+/g, ' ')

    // Match by register nummer (loose — handles spaces / formats)
    const numClean   = registerNummer.replace(/\s+/g, '').toLowerCase()
    const artClean   = registerArt.replace(/\s+/g, '').toLowerCase()
    const rowClean   = rowText.replace(/\s+/g, '').toLowerCase()

    if (!rowClean.includes(numClean)) return
    if (artClean && !rowClean.includes(artClean)) return

    matched = true

    // Find document-type anchors in this row
    $(row).find('a').each((_, a) => {
      const el      = $(a)
      const title   = (el.attr('title') || '').trim().toUpperCase()
      const imgAlt  = (el.find('img').attr('alt') || '').trim().toUpperCase()
      const imgSrc  = (el.find('img').attr('src') || '').toLowerCase()
      const text    = el.text().trim().toUpperCase()

      // Try to identify doc type from title, img alt, or link text
      const label = knownTypes.find(t =>
        title.startsWith(t) || imgAlt.startsWith(t) || text === t ||
        imgSrc.includes(`/${t.toLowerCase()}`) ||
        imgSrc.includes(`_${t.toLowerCase()}`)
      )
      if (!label) return

      const href    = el.attr('href') || ''
      const onclick = el.attr('onclick') || ''

      // Extract JSF element id from onclick="mojarra.jsfcljs(document.getElementById('form1'),{'id':'id'},...)"
      let jsfId = null
      const jsfMatch = onclick.match(/\{'([^']+)':'[^']*'\}/)
      if (jsfMatch) jsfId = jsfMatch[1]

      availableTypes.push(label)
      docLinks.push({
        type:  label,
        href:  href && href !== '#' && href !== 'javascript:void(0)' ? href : null,
        jsfId: jsfId || null,
      })
    })

    // Also look for input[type=image] (older HR site variants)
    $(row).find('input[type=image]').each((_, inp) => {
      const el    = $(inp)
      const title = (el.attr('title') || el.attr('alt') || el.attr('name') || '').toUpperCase()
      const label = knownTypes.find(t => title.startsWith(t))
      if (!label) return

      availableTypes.push(label)
      docLinks.push({ type: label, href: null, jsfId: el.attr('name') || null })
    })
  })

  return { matched, availableTypes: [...new Set(availableTypes)], docLinks }
}

/**
 * Parse a DK document-tree page and return individual documents:
 * [{ id, type, date, name, downloadHref }]
 */
export function parseDocumentTree(html) {
  const $         = load(html)
  const documents = []

  // handelsregister.de renders the doc tree as nested lists or a table
  // with entries like "Gesellschafterliste vom 15.03.2024"

  // Pattern 1: tree nodes in <li> or <span> elements
  $('li, tr').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!text || text.length < 5) return

    const docType = inferDocType(text)
    if (!docType) return

    const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/)
    const date      = dateMatch ? parseGermanDate(dateMatch[1]) : null

    // Find download link in this element
    const anchor = $(el).find('a[href]').first()
    const href   = anchor.attr('href') || null
    const fullHref = href
      ? (href.startsWith('http') ? href : `${HR_BASE}${href}`)
      : null

    // Build a stable id
    const id = `dk_${docType}_${date || 'unknown'}_${documents.length}`

    documents.push({
      id,
      type:         docType,
      date:         date,
      name:         buildDocName(docType, date, text),
      downloadHref: fullHref,
    })
  })

  // Pattern 2: plain links whose text matches doc-type patterns
  if (documents.length === 0) {
    $('a[href]').each((_, a) => {
      const text     = $(a).text().replace(/\s+/g, ' ').trim()
      const docType  = inferDocType(text)
      if (!docType) return

      const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/)
      const date      = dateMatch ? parseGermanDate(dateMatch[1]) : null
      const href      = $(a).attr('href') || ''
      const fullHref  = href.startsWith('http') ? href : `${HR_BASE}${href}`
      const id        = `dk_${docType}_${date || 'unknown'}_${documents.length}`

      documents.push({
        id,
        type:         docType,
        date,
        name:         buildDocName(docType, date, text),
        downloadHref: fullHref,
      })
    })
  }

  return documents
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const DOC_TYPE_PATTERNS = [
  { pattern: /gesellschafter.*liste|gesellschafterliste/i,    type: 'Gesellschafterliste'         },
  { pattern: /gesellschafts.*vertrag|satzung/i,               type: 'Satzung'                     },
  { pattern: /handelsregister.*auszug|hr.*auszug|auszug/i,   type: 'Handelsregisterauszug'       },
  { pattern: /jahresabschluss|jahresabschluß/i,               type: 'Jahresabschluss'             },
  { pattern: /liquidations/i,                                  type: 'Liquidationsdokument'        },
  { pattern: /protokoll/i,                                     type: 'Protokoll'                   },
  { pattern: /verschmelzung/i,                                 type: 'Verschmelzungsvertrag'       },
  { pattern: /spaltung/i,                                      type: 'Spaltungsvertrag'            },
  { pattern: /umwandlung/i,                                    type: 'Umwandlungsvertrag'          },
  { pattern: /anmeldung/i,                                     type: 'Anmeldung'                   },
  { pattern: /verschiedenes|sonstiges/i,                       type: 'Sonstiges'                   },
]

function inferDocType(text) {
  for (const { pattern, type } of DOC_TYPE_PATTERNS) {
    if (pattern.test(text)) return type
  }
  return null
}

function parseGermanDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('.')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function buildDocName(type, date, rawText) {
  if (date) {
    const [y, m, d] = date.split('-')
    return `${type} vom ${d}.${m}.${y}`
  }
  // Trim the raw text to something readable
  return rawText.slice(0, 80).trim()
}
