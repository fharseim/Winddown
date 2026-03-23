import { load } from 'cheerio'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

// ─── Scope filter ─────────────────────────────────────────────────────────────

// Only GmbH, UG, Personengesellschaften — no AG, SE, KGaA
const ALLOWED_RECHTSFORMEN = [
  'gmbh',
  'ug',
  'gmbh & co. kg',
  'gmbh & co kg',
  'kg',
  'ohg',
  'partg',
  'partg mbb',
  'partgmbb',
  'eg',
]

function isInScope(name, registerArt) {
  if (!name) return false
  const lower = name.toLowerCase()
  // Exclude AG, SE, KGaA by name suffix
  if (/\bag\b/.test(lower)) return false
  if (/\bse\b/.test(lower) && !/\bgmbh\b/.test(lower)) return false
  if (/\bkgaa\b/.test(lower)) return false
  if (/kommanditgesellschaft auf aktien/.test(lower)) return false
  // Include if contains a known in-scope form
  if (/\bgmbh\b/.test(lower)) return true
  if (/\bug\b/.test(lower)) return true
  if (/\bkg\b/.test(lower)) return true
  if (/\bohg\b/.test(lower)) return true
  if (/\bpartg\b/.test(lower)) return true
  if (/\beg\b/.test(lower) && !/\bvere/.test(lower)) return true
  // Register-based: HRB = GmbH/UG/AG/SE; HRA = KG/OHG; PR = PartG; GnR = eG
  if (registerArt === 'HRA') return true
  if (registerArt === 'PR') return true
  if (registerArt === 'GnR') return true
  return false
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

const cache = new Map() // query → { ts, results }
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.results
}

function setCached(key, results) {
  cache.set(key, { ts: Date.now(), results })
}

// ─── Static dataset fallback ──────────────────────────────────────────────────

let _dataset = null

function loadDataset() {
  if (_dataset) return _dataset
  try {
    const raw = readFileSync(join(__dirname, 'data', 'companies.json'), 'utf-8')
    _dataset = JSON.parse(raw)
  } catch {
    _dataset = []
  }
  return _dataset
}

function normName(s) {
  return s
    .toLowerCase()
    .replace(/\bug\s*\(haftungsbeschränkt\)/g, '')
    .replace(/\bgmbh\s*&\s*co\.\s*kg\b/g, '')
    .replace(/\bgmbh\b/g, '')
    .replace(/\bug\b/g, '')
    .replace(/\bohg\b/g, '')
    .replace(/\bkg\b/g, '')
    .replace(/\beg\b/g, '')
    .replace(/[&.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function searchDataset(q) {
  const companies = loadDataset()
  const term = normName(q)
  if (!term || term.length < 2) return []

  const scored = companies
    .filter(c => isInScope(c.firma_name, c.register_art))
    .map(c => {
      const n = normName(c.firma_name)
      const raw = c.firma_name.toLowerCase()
      const qRaw = q.toLowerCase().trim()
      let score = 0
      if (n === term) score = 100
      else if (raw === qRaw) score = 98
      else if (n.startsWith(term)) score = 85
      else if (raw.startsWith(qRaw)) score = 80
      else if (raw.includes(qRaw)) score = 65
      else if (n.includes(term)) score = 60
      else {
        const qw = term.split(' ').filter(Boolean)
        const nw = n.split(' ').filter(Boolean)
        if (qw.length > 0) {
          const matched = qw.filter(w => nw.some(nw2 => nw2.includes(w)))
          if (matched.length === qw.length) score = 55
          else if (matched.length >= Math.ceil(qw.length * 0.6)) score = 40
        }
      }
      return score > 0 ? { ...c, _score: score } : null
    })
    .filter(Boolean)

  scored.sort((a, b) => b._score - a._score)
  return scored.slice(0, 5).map(({ _score, ...c }) => ({ ...c, source: 'dataset' }))
}

// ─── Live Handelsregister search ──────────────────────────────────────────────

const HR_BASE = 'https://www.handelsregister.de'
const HR_SEARCH_URL = `${HR_BASE}/rp_web/erweitertesuche.xhtml`

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
}

async function fetchWithTimeout(url, opts, timeoutMs = 12000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function searchHandelsregister(query, schlagwortOptionen = '2') {
  // Step 1: GET the search page to obtain JSF ViewState + cookies
  let viewState = ''
  let cookies = ''

  try {
    const getRes = await fetchWithTimeout(HR_SEARCH_URL, {
      headers: { ...BROWSER_HEADERS },
      redirect: 'follow',
    })
    if (!getRes.ok) throw new Error(`GET ${getRes.status}`)

    // Collect cookies
    const setCookie = getRes.headers.getSetCookie?.() ?? []
    if (setCookie.length) {
      cookies = setCookie.map(c => c.split(';')[0]).join('; ')
    } else {
      const raw = getRes.headers.get('set-cookie') || ''
      cookies = raw
        .split(',')
        .map(c => c.trim().split(';')[0])
        .join('; ')
    }

    const html = await getRes.text()
    const $ = load(html)

    // Extract javax.faces.ViewState
    viewState = $('input[name="javax.faces.ViewState"]').val() || ''
    if (!viewState) {
      // Try alternate attribute
      viewState = $('[id$="ViewState"]').val() || ''
    }
  } catch (err) {
    console.warn('[hr-search] GET phase failed:', err.message)
    throw err
  }

  // Step 2: POST the search form
  const formData = new URLSearchParams({
    'form1': 'form1',
    'form1:schlagwoerter': query,
    'form1:schlagwortOptionen': schlagwortOptionen,
    'form1:btnSuche': 'Suche',
    'javax.faces.ViewState': viewState,
  })

  let resultsHtml = ''
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
    if (!postRes.ok) throw new Error(`POST ${postRes.status}`)
    resultsHtml = await postRes.text()
  } catch (err) {
    console.warn('[hr-search] POST phase failed:', err.message)
    throw err
  }

  // Step 3: Parse results
  return parseResults(resultsHtml, query)
}

function parseResults(html, query) {
  const $ = load(html)
  const companies = []

  // The results table — handelsregister.de uses a table with id containing "ergebnisTable"
  // Row structure: Firmennamen | Ort | Registergericht | Registerart | Registernummer | Status
  const table = $('table[id*="ergebnis"], table[id*="result"], #ergebnisse table, .ergebnisTabelle').first()

  if (table.length) {
    table.find('tr').each((i, row) => {
      if (i === 0) return // skip header
      const cells = $(row).find('td')
      if (cells.length < 4) return

      const firma_name = $(cells[0]).text().trim()
      if (!firma_name) return

      const ort = $(cells[1]).text().trim()
      const gericht = $(cells[2]).text().trim()
      const regText = $(cells[3]).text().trim()
      const regNummer = $(cells[4])?.text?.().trim() || ''
      const statusText = $(cells[5])?.text?.().trim() || ''

      // Parse register art from combined field or separate cells
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

      const status = /aktiv|active|eingetragen/i.test(statusText)
        ? 'aktiv'
        : statusText
          ? 'gelöscht'
          : 'aktiv'

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

  // Fallback: try to find data in any table if primary selector missed
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

      if (companies.length > 0) return false // break $.each
    })
  }

  return companies.slice(0, 10)
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

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { q = '', schlagwortOptionen = '2' } = req.query

  if (!q || q.trim().length < 2) {
    return res.status(200).json({ results: [], total: 0, query: q, source: 'handelsregister.de' })
  }

  const cacheKey = `${q.trim().toLowerCase()}:${schlagwortOptionen}`
  const cached = getCached(cacheKey)
  if (cached) {
    console.log(`[hr-search] cache hit for "${q}"`)
    return res.status(200).json({ results: cached, total: cached.length, query: q, source: 'handelsregister.de', cached: true })
  }

  let results = []
  try {
    results = await searchHandelsregister(q.trim(), schlagwortOptionen)
    console.log(`[hr-search] got ${results.length} results from handelsregister.de for "${q}"`)
    setCached(cacheKey, results)
  } catch (err) {
    console.warn(`[hr-search] live search failed for "${q}": ${err.message} — falling back to dataset`)
    // Fallback to static dataset
    results = searchDataset(q).map(c => ({ ...c, source: 'dataset' }))
    return res.status(200).json({
      results,
      total: results.length,
      query: q,
      source: 'dataset',
      fallback: true,
      error: err.message,
    })
  }

  return res.status(200).json({
    results,
    total: results.length,
    query: q,
    source: 'handelsregister.de',
  })
}
