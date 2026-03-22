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
  // Allow all localhost origins during development
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true
  return false
}

function checkAuth(req) {
  // In development (no token configured) allow all requests
  const expectedToken = process.env.INTERNAL_API_TOKEN
  if (!expectedToken) return true

  // Check Origin header
  const origin = req.headers['origin'] || ''
  const referer = req.headers['referer'] || ''
  const hasAllowedOrigin = isAllowedOrigin(origin) ||
    ALLOWED_ORIGINS.some(o => referer.startsWith(o)) ||
    /^https?:\/\/localhost/.test(referer) ||
    /^https?:\/\/127\.0\.0\.1/.test(referer)

  if (!hasAllowedOrigin) return false

  // Check API token
  const token = req.headers['x-api-token'] || ''
  return token === expectedToken
}

// ─── Dataset ─────────────────────────────────────────────────────────────────

let _companies = null

function loadCompanies() {
  if (_companies) return _companies
  try {
    const dataPath = join(__dirname, 'data', 'companies.json')
    const raw = readFileSync(dataPath, 'utf-8')
    _companies = JSON.parse(raw)
    console.log(`[companies] loaded ${_companies.length} companies from dataset`)
  } catch (err) {
    console.error('[companies] failed to load dataset:', err.message)
    _companies = []
  }
  return _companies
}

// ─── Fuzzy Search ─────────────────────────────────────────────────────────────

// Normalise a company name for matching: lowercase, strip common legal suffixes,
// collapse whitespace.
function normName(s) {
  return s
    .toLowerCase()
    .replace(/\bug\s*\(haftungsbeschränkt\)/g, '')
    .replace(/\bgmbh\s*&\s*co\.\s*kgaa\b/g, '')
    .replace(/\bgmbh\s*&\s*co\.\s*kg\b/g, '')
    .replace(/\bgmbh\s*&\s*co\s*kg\b/g, '')
    .replace(/\bkgaa\b/g, '')
    .replace(/\bpartg\s+mbb\b/g, '')
    .replace(/\bpartgmbb\b/g, '')
    .replace(/\bpartg\b/g, '')
    .replace(/\bgmbh\b/g, '')
    .replace(/\bug\b/g, '')
    .replace(/\bmbh\b/g, '')
    .replace(/\bohg\b/g, '')
    .replace(/\bkg\b/g, '')
    .replace(/\bag\b/g, '')
    .replace(/\bse\b/g, '')
    .replace(/\beg\b/g, '')
    .replace(/\be\.v\.\b/g, '')
    .replace(/\bstiftung\b/g, '')
    .replace(/[&.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreMatch(query, company) {
  const q = normName(query)
  const n = normName(company.firma_name)
  const nameRaw = company.firma_name.toLowerCase()
  const qRaw = query.toLowerCase().trim()

  if (!q) return 0

  // Exact (normalised) match
  if (n === q) return 100

  // Raw exact match
  if (nameRaw === qRaw) return 98

  // Normalised starts-with
  if (n.startsWith(q)) return 85

  // Raw starts-with
  if (nameRaw.startsWith(qRaw)) return 80

  // Contains full query (raw)
  if (nameRaw.includes(qRaw)) return 65

  // Contains normalised query
  if (n.includes(q)) return 60

  // Word-level matching: all query words present in company name
  const qWords = q.split(' ').filter(Boolean)
  const nWords = n.split(' ').filter(Boolean)
  if (qWords.length > 1) {
    const matchedWords = qWords.filter(w => nWords.some(nw => nw.includes(w) || w.includes(nw)))
    if (matchedWords.length === qWords.length) return 55
    if (matchedWords.length >= Math.ceil(qWords.length * 0.6)) return 40
  }

  // Single token partial match in any word
  if (qWords.length === 1) {
    if (nWords.some(w => w.startsWith(q))) return 45
    if (nWords.some(w => w.includes(q) && w.length <= q.length + 3)) return 35
  }

  // Any word of name starts with query (e.g. "tech" matches "DataTech GmbH")
  if (n.split(' ').some(w => w.startsWith(q) && q.length >= 3)) return 30

  return 0
}

function searchCompanies(q, limit, rechtsformFilter) {
  const companies = loadCompanies()
  const term = q.trim()
  if (!term || term.length < 2) return []

  const rfLower = rechtsformFilter ? rechtsformFilter.toLowerCase().trim() : null

  const scored = []
  for (const c of companies) {
    // Apply rechtsform filter if specified
    if (rfLower && (!c.rechtsform || c.rechtsform.toLowerCase() !== rfLower)) continue

    const score = scoreMatch(term, c)
    if (score > 0) scored.push({ ...c, _score: score })
  }

  scored.sort((a, b) => b._score - a._score || a.firma_name.localeCompare(b.firma_name))

  return scored.slice(0, limit).map(({ _score, ...c }) => c)
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Security: reject unauthorised requests
  if (!checkAuth(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { q = '', limit: limitParam = '5', rechtsform = '' } = req.query
  const limit = Math.min(parseInt(limitParam, 10) || 5, 20)

  if (!q || q.trim().length < 2) {
    return res.status(200).json({ results: [], total: 0, query: q })
  }

  const results = searchCompanies(q, limit, rechtsform || null)
  return res.status(200).json({
    results,
    total: results.length,
    query: q,
    rechtsform: rechtsform || null,
    source: 'dataset',
  })
}
