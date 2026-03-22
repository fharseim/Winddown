#!/usr/bin/env node
/**
 * Fetches German company data from the OffeneRegister.de Datasette API and
 * saves a compact dataset to api/data/companies.json for the Rise Handelsregister search.
 * Covers all major Rechtsformen: GmbH, UG, AG, SE, KG, OHG, GmbH & Co. KG, KGaA,
 * PartG, PartG mbB, eG, e.V., Stiftung.
 *
 * Usage: node scripts/fetch-companies.js
 *
 * Falls back to a comprehensive built-in mock dataset if the API is unavailable.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'api', 'data')
const OUT_FILE = join(OUT_DIR, 'companies.json')

// OffeneRegister Datasette base URL
const DATASETTE_BASE = 'https://db.offeneregister.de/openregister-ef498fa'

// Major German cities to query
const CITIES = [
  'Berlin', 'München', 'Hamburg', 'Frankfurt am Main', 'Köln',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Hannover', 'Nürnberg',
  'Bremen', 'Dresden', 'Mannheim', 'Augsburg', 'Freiburg',
  'Karlsruhe', 'Bonn', 'Wiesbaden', 'Heidelberg', 'Münster',
]

// Register courts (Amtsgerichte) by city
const COURTS = {
  'Berlin': 'AG Berlin (Charlottenburg)',
  'München': 'AG München',
  'Hamburg': 'AG Hamburg',
  'Frankfurt am Main': 'AG Frankfurt am Main',
  'Köln': 'AG Köln',
  'Stuttgart': 'AG Stuttgart',
  'Düsseldorf': 'AG Düsseldorf',
  'Leipzig': 'AG Leipzig',
  'Hannover': 'AG Hannover',
  'Nürnberg': 'AG Nürnberg',
  'Bremen': 'AG Bremen',
  'Dresden': 'AG Dresden',
  'Mannheim': 'AG Mannheim',
  'Augsburg': 'AG Augsburg',
  'Freiburg': 'AG Freiburg im Breisgau',
  'Karlsruhe': 'AG Karlsruhe',
  'Bonn': 'AG Bonn',
  'Wiesbaden': 'AG Wiesbaden',
  'Heidelberg': 'AG Mannheim',
  'Münster': 'AG Münster',
}

async function fetchFromDatasette(city, offset = 0, size = 100) {
  const params = new URLSearchParams({
    _shape: 'array',
    _size: String(size),
    _offset: String(offset),
    current_status: 'currently registered',
    registered_office: city,
  })
  const url = `${DATASETTE_BASE}/company.json?${params}`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Rise-Handelsregister-Builder/1.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

function normalizeDatasetteCompany(raw, city) {
  // OffeneRegister fields may vary; handle multiple layouts
  const name = raw.name || raw.firma_name || raw.company_name || ''
  if (!name) return null

  // Determine rechtsform from name (all German legal forms)
  const lname = name.toLowerCase()
  let rechtsform = 'GmbH' // default for HRB entries
  if (lname.includes('ug (') || lname.includes('unternehmergesellschaft')) rechtsform = 'UG (haftungsbeschränkt)'
  else if (lname.includes('gmbh & co. kgaa') || lname.includes('gmbh & co kgaa')) rechtsform = 'KGaA'
  else if (lname.includes('gmbh & co. kg') || lname.includes('gmbh & co kg') || lname.includes('& cie. kg')) rechtsform = 'GmbH & Co. KG'
  else if (lname.includes('kgaa') || lname.includes('kommanditgesellschaft auf aktien')) rechtsform = 'KGaA'
  else if (/ se$/.test(lname) || lname.endsWith(' se') || / se &/.test(lname)) rechtsform = 'SE'
  else if (/ ag$/.test(lname) || / ag &/.test(lname) || lname.endsWith(' ag') || lname.includes(' aktiengesellschaft')) rechtsform = 'AG'
  else if (lname.includes('partg mbb') || lname.includes('part. mbb')) rechtsform = 'PartG mbB'
  else if (lname.includes('partg') || lname.includes('partnerschaftsgesellschaft')) rechtsform = 'PartG'
  else if (/\bohg\b/.test(lname) || lname.includes('offene handelsgesellschaft')) rechtsform = 'OHG'
  else if (/ kg$/.test(lname) || / kg &/.test(lname) || lname.includes('kommanditgesellschaft')) rechtsform = 'KG'
  else if (/ eg$/.test(lname) || lname.endsWith(' eg') || lname.includes('eingetragene genossenschaft')) rechtsform = 'eG'
  else if (lname.endsWith(' e.v.') || lname.includes(' e.v. ') || lname.includes('eingetragener verein')) rechtsform = 'e.V.'
  else if (lname.includes('stiftung')) rechtsform = 'Stiftung'

  // Parse register number — native_company_number may be "HRB 12345 München"
  const nativeNum = raw.native_company_number || raw.register_nummer || ''
  let register_art = 'HRB'
  let register_nummer = ''
  const m = nativeNum.match(/^(HRB|HRA)\s*(\d+)/i)
  if (m) {
    register_art = m[1].toUpperCase()
    register_nummer = m[2]
  } else if (nativeNum) {
    register_nummer = nativeNum
  }

  const sitz = raw.registered_office || raw.sitz || city
  const register_gericht = raw.register_court || COURTS[city] || `AG ${city}`
  const status = raw.current_status === 'currently registered' ? 'aktiv' : 'geloescht'

  return {
    id: `or_${register_art}_${register_nummer}_${register_gericht.replace(/\s/g, '_')}`,
    firma_name: name,
    register_art,
    register_nummer,
    register_gericht,
    rechtsform,
    sitz,
    status,
  }
}

async function fetchAllFromDatasette() {
  console.log('Attempting to fetch from OffeneRegister Datasette API…')
  const all = new Map()

  for (const city of CITIES) {
    try {
      console.log(`  Fetching ${city}…`)
      // Fetch 2 pages per city (200 companies)
      for (const offset of [0, 100]) {
        const rows = await fetchFromDatasette(city, offset, 100)
        if (!Array.isArray(rows)) break
        for (const row of rows) {
          const c = normalizeDatasetteCompany(row, city)
          if (c && c.register_nummer) all.set(c.id, c)
        }
        if (rows.length < 100) break
        await new Promise(r => setTimeout(r, 300)) // polite rate limit
      }
      console.log(`    → ${all.size} total so far`)
    } catch (err) {
      console.warn(`    ⚠ Failed for ${city}: ${err.message}`)
    }
  }
  return [...all.values()]
}

// ─── Comprehensive fallback mock dataset ─────────────────────────────────────

function buildMockDataset() {
  console.log('Building comprehensive mock dataset…')

  const companies = [
    // ── Berlin ──────────────────────────────────────────────────────────────
    { firma_name: 'Delivery Hero SE', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '158581', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Zalando GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '100292', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'HelloFresh GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '130165', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'N26 GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '169458', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'SoundCloud GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '115745', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Babbel GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '121073', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Wefox GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '179042', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Personio GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '221247', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Thermondo GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '135832', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Gorillas Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '213684', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Trade Republic Bank GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '195478', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Flixbus GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '190621', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Contentful GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '142567', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Chrono24 GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '162934', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'GetYourGuide Deutschland GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '131472', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Liqid GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '185391', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Mambu GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '153842', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Raisin GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '168237', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Omio GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '134582', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Signavio GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '117923', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Adjust GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '124736', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Moss Financial Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '221489', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Tier Mobility GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '202314', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Solaris SE', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '180816', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'AVIV Group GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '187234', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Taxfix GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '193762', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Unu GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '148923', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Blinkist GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '143291', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Navvis GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '163847', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Startup Gesellschaft mbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '229104', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },

    // UGs — Berlin
    { firma_name: 'Codelab UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '193847', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Greenify UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '201345', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Voicely UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '215678', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },

    // ── München ──────────────────────────────────────────────────────────────
    { firma_name: 'Allianz Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '234521', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Celonis GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '216423', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Kontist GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '219847', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Rohde & Schwarz GmbH & Co. KG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '76784', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Westwing GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '194723', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Lemonone GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '228934', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Scalable Capital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '212472', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Stylight GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '174382', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Brainlab GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '97354', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Softgarden e-recruiting GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '163289', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Freeletics GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '198345', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Wirecard Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '152378', register_gericht: 'AG München', sitz: 'München', status: 'geloescht' },
    { firma_name: 'Isar Aerospace Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '237814', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Konux GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '219483', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Sixt SE', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '59484', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'ProSiebenSat.1 Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '201245', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Check24 Vergleichsportal GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '171034', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'FingerFood Studios GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '219234', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'NARO GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '243812', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Mytheresa GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '189456', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Floy GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '237193', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Digitec GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '224831', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },

    // ── Hamburg ──────────────────────────────────────────────────────────────
    { firma_name: 'About You GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '121127', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Statista GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '101675', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Xing SE', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '92913', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Goodgame Studios GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '108564', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Jimdo GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '99278', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Auxilion GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '147382', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Relex Solutions GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '168234', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Epigenomics GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '109872', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Asknet Solutions AG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '88912', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Talon.One GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '147823', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Billwerk GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '134567', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Doctolib GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '152893', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Tiqets GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '165723', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Finanzcheck GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '118345', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Liqtech GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '173482', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },

    // ── Frankfurt am Main ────────────────────────────────────────────────────
    { firma_name: 'Bilfinger Tebodin GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '45672', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Solarisbank GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '97341', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'flatexDEGIRO GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '47201', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Ratepay GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '89432', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'PAIR Finance GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '113845', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Deposit Solutions GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '108734', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Kapilendo AG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '102345', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Evonik Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '98234', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Novoferm GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '62845', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Auxmoney GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '82134', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Commerzbank Digital Ventures GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '112348', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'DZ Bank GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '45982', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Billie Finance GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '118234', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Finleap GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '107563', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Niiio Finance Group GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '113821', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },

    // ── Köln ─────────────────────────────────────────────────────────────────
    { firma_name: 'reev GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '87234', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Retresco GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '79345', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'XO Life GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '93421', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Materna Information GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '48234', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'coliquio GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '78234', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Virtus Health GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '98712', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Orderbird GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '87651', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Digital Media Solutions GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '91823', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Netcologne GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '42891', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Kölner Startup GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '112934', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },

    // ── Stuttgart ─────────────────────────────────────────────────────────────
    { firma_name: 'Bosch Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '765234', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Porsche Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '751234', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'TRUMPF Venture GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '248912', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Apptus Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '738912', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Zettle GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '741239', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Nexigen GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '762134', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Silo GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '779821', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Mediglobal GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '742891', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'KGS Software GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '728934', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Stryza GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '789234', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },

    // ── Düsseldorf ───────────────────────────────────────────────────────────
    { firma_name: 'Trivago GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '69548', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Zooplus AG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '73241', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Peek & Cloppenburg KG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '38912', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Flossbach von Storch GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '58234', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Tonka GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '93847', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Hatch GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '101234', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Wooga GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '89234', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Thalia Bücher GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '47821', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Medtronic GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '42893', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Signa Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '98231', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },

    // ── Leipzig ──────────────────────────────────────────────────────────────
    { firma_name: 'Spreadshirt GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '22147', register_gericht: 'AG Leipzig', sitz: 'Leipzig', status: 'aktiv' },
    { firma_name: 'COMPAREX GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '18234', register_gericht: 'AG Leipzig', sitz: 'Leipzig', status: 'aktiv' },
    { firma_name: 'Glueckkanja-gab GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '29834', register_gericht: 'AG Leipzig', sitz: 'Leipzig', status: 'aktiv' },
    { firma_name: 'Unister GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '19823', register_gericht: 'AG Leipzig', sitz: 'Leipzig', status: 'geloescht' },
    { firma_name: 'Leipzig Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '34891', register_gericht: 'AG Leipzig', sitz: 'Leipzig', status: 'aktiv' },
    { firma_name: 'Medien GmbH Leipzig', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '12893', register_gericht: 'AG Leipzig', sitz: 'Leipzig', status: 'aktiv' },

    // ── Hannover ─────────────────────────────────────────────────────────────
    { firma_name: 'TUI Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '59823', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Hannover Direct GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '42138', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Infologistix GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '67234', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Neodigital Versicherung GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '72341', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'IT-Services Hannover GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '48932', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },

    // ── Nürnberg ─────────────────────────────────────────────────────────────
    { firma_name: 'Datev GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '12234', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Teamviewer GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '25234', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Fliegender Baum GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '38912', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Grundig Akademie GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '14823', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Noris Network GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '21893', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },

    // ── Bremen ────────────────────────────────────────────────────────────────
    { firma_name: 'Lloyd Werft GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '18234', register_gericht: 'AG Bremen', sitz: 'Bremen', status: 'aktiv' },
    { firma_name: 'Bremer Landesbank GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '9234', register_gericht: 'AG Bremen', sitz: 'Bremen', status: 'aktiv' },
    { firma_name: 'Brebeck Composite GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '26781', register_gericht: 'AG Bremen', sitz: 'Bremen', status: 'aktiv' },
    { firma_name: 'Eurogate GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '14782', register_gericht: 'AG Bremen', sitz: 'Bremen', status: 'aktiv' },

    // ── Dresden ───────────────────────────────────────────────────────────────
    { firma_name: 'Globalfoundries GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '28234', register_gericht: 'AG Dresden', sitz: 'Dresden', status: 'aktiv' },
    { firma_name: 'Nuance Communications GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '21893', register_gericht: 'AG Dresden', sitz: 'Dresden', status: 'aktiv' },
    { firma_name: 'Novaled GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '19834', register_gericht: 'AG Dresden', sitz: 'Dresden', status: 'aktiv' },
    { firma_name: 'Dresdner Kühlanlagenbau GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '7823', register_gericht: 'AG Dresden', sitz: 'Dresden', status: 'aktiv' },

    // ── Mannheim / Heidelberg ─────────────────────────────────────────────────
    { firma_name: 'SAP Digital Interconnect GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '712381', register_gericht: 'AG Mannheim', sitz: 'Mannheim', status: 'aktiv' },
    { firma_name: 'Bizerba GmbH & Co. KG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '702134', register_gericht: 'AG Mannheim', sitz: 'Mannheim', status: 'aktiv' },
    { firma_name: 'prego services GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '723841', register_gericht: 'AG Mannheim', sitz: 'Mannheim', status: 'aktiv' },
    { firma_name: 'Heidelberg Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '734182', register_gericht: 'AG Mannheim', sitz: 'Heidelberg', status: 'aktiv' },
    { firma_name: 'CureVac GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '720341', register_gericht: 'AG Mannheim', sitz: 'Heidelberg', status: 'aktiv' },
    { firma_name: 'Freudenberg & Co. KG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '703482', register_gericht: 'AG Mannheim', sitz: 'Weinheim', status: 'aktiv' },

    // ── Freiburg / Karlsruhe ──────────────────────────────────────────────────
    { firma_name: 'Kaiserstuhl GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '14238', register_gericht: 'AG Freiburg im Breisgau', sitz: 'Freiburg im Breisgau', status: 'aktiv' },
    { firma_name: 'Endress+Hauser GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '12341', register_gericht: 'AG Freiburg im Breisgau', sitz: 'Freiburg im Breisgau', status: 'aktiv' },
    { firma_name: '1&1 Mail & Media GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '218912', register_gericht: 'AG Karlsruhe', sitz: 'Karlsruhe', status: 'aktiv' },
    { firma_name: 'United Internet GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '206723', register_gericht: 'AG Karlsruhe', sitz: 'Karlsruhe', status: 'aktiv' },
    { firma_name: 'Buhl Data Service GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '198234', register_gericht: 'AG Karlsruhe', sitz: 'Karlsruhe', status: 'aktiv' },
    { firma_name: 'GBTEC Software GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '214892', register_gericht: 'AG Karlsruhe', sitz: 'Karlsruhe', status: 'aktiv' },

    // ── Bonn / Wiesbaden ─────────────────────────────────────────────────────
    { firma_name: 'Deutsche Telekom Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '23481', register_gericht: 'AG Bonn', sitz: 'Bonn', status: 'aktiv' },
    { firma_name: 'IVU Traffic Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '18923', register_gericht: 'AG Bonn', sitz: 'Bonn', status: 'aktiv' },
    { firma_name: 'Telekom MMS GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '21893', register_gericht: 'AG Bonn', sitz: 'Bonn', status: 'aktiv' },
    { firma_name: 'Süwag Energie GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '31892', register_gericht: 'AG Wiesbaden', sitz: 'Wiesbaden', status: 'aktiv' },
    { firma_name: 'Kuehn Nagel GmbH & Co. KG', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '28934', register_gericht: 'AG Wiesbaden', sitz: 'Wiesbaden', status: 'aktiv' },
    { firma_name: 'Esker GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '38923', register_gericht: 'AG Wiesbaden', sitz: 'Wiesbaden', status: 'aktiv' },

    // ── Münster ───────────────────────────────────────────────────────────────
    { firma_name: 'Claas GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '6823', register_gericht: 'AG Münster', sitz: 'Münster', status: 'aktiv' },
    { firma_name: 'Fiducia IT GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '14823', register_gericht: 'AG Münster', sitz: 'Münster', status: 'aktiv' },
    { firma_name: 'Creditreform GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '9234', register_gericht: 'AG Münster', sitz: 'Münster', status: 'aktiv' },

    // ── Additional generic GmbHs for search diversity ─────────────────────────
    { firma_name: 'Alpha Software GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '156234', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Beta Solutions GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '167234', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Gamma Consulting GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '72341', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Delta Ventures GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '83412', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Epsilon Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '94521', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Omega Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '45678', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Sigma Networks GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '78234', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Horizon Capital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '34891', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Nexus Innovations GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '89234', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Apex Digital GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '102345', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Quantum Software GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '118234', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Nova Analytics GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '126783', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Pulse Media GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '134521', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Flux Energy GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '142891', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Core Systems GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '151234', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Bridge Finance GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '159872', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Spark Ventures GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '167234', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Arc Consulting GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '175891', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Grid Technologies GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '183247', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Prism Analytics GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '191823', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },

    // ── AG — Aktiengesellschaften ─────────────────────────────────────────────
    { firma_name: 'SAP SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '719915', register_gericht: 'AG Mannheim', sitz: 'Walldorf', status: 'aktiv' },
    { firma_name: 'Siemens AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '6684', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Deutsche Bank AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '30000', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Allianz SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '164232', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'BMW AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '42243', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Volkswagen AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '100484', register_gericht: 'AG Braunschweig', sitz: 'Wolfsburg', status: 'aktiv' },
    { firma_name: 'Deutsche Telekom AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '6794', register_gericht: 'AG Bonn', sitz: 'Bonn', status: 'aktiv' },
    { firma_name: 'BASF SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '3000', register_gericht: 'AG Ludwigshafen', sitz: 'Ludwigshafen am Rhein', status: 'aktiv' },
    { firma_name: 'Bayer AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '48', register_gericht: 'AG Köln', sitz: 'Leverkusen', status: 'aktiv' },
    { firma_name: 'Adidas AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '3284', register_gericht: 'AG Fürth', sitz: 'Herzogenaurach', status: 'aktiv' },
    { firma_name: 'Deutsche Post AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '6792', register_gericht: 'AG Bonn', sitz: 'Bonn', status: 'aktiv' },
    { firma_name: 'Deutsche Lufthansa AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '2168', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Münchener Rückversicherungs-Gesellschaft AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '5765', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Continental AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '3260', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Infineon Technologies AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '126492', register_gericht: 'AG München', sitz: 'Neubiberg', status: 'aktiv' },
    { firma_name: 'Fresenius SE & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '26735', register_gericht: 'AG Frankfurt am Main', sitz: 'Bad Homburg', status: 'aktiv' },
    { firma_name: 'E.ON SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '14615', register_gericht: 'AG Düsseldorf', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'RWE AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '14525', register_gericht: 'AG Essen', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'Henkel AG & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '4724', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'ThyssenKrupp AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '9092', register_gericht: 'AG Duisburg', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'Covestro AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '72505', register_gericht: 'AG Köln', sitz: 'Leverkusen', status: 'aktiv' },
    { firma_name: 'Beiersdorf AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '1787', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Merck KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '6164', register_gericht: 'AG Darmstadt', sitz: 'Darmstadt', status: 'aktiv' },
    { firma_name: 'Porsche AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '730997', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Mercedes-Benz AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '762873', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'METRO AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '79055', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Lanxess AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '53652', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Evonik Industries AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '19201', register_gericht: 'AG Essen', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'Fraport AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '44419', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Daimler Truck AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '762884', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Vonovia SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '16879', register_gericht: 'AG Bochum', sitz: 'Bochum', status: 'aktiv' },
    { firma_name: 'TeamViewer AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '747262', register_gericht: 'AG Stuttgart', sitz: 'Göppingen', status: 'aktiv' },
    { firma_name: 'Zalando SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '158879', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Scout24 AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '220604', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'New Work SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '132133', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Knorr-Bremse AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '102', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Siemens Energy AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '243531', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Brenntag SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '14820', register_gericht: 'AG Duisburg', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'Symrise AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '201213', register_gericht: 'AG Hannover', sitz: 'Holzminden', status: 'aktiv' },
    { firma_name: 'Carl Zeiss AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '568539', register_gericht: 'AG Ulm', sitz: 'Oberkochen', status: 'aktiv' },
    { firma_name: 'Axel Springer SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '152218', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'ProSiebenSat.1 Media SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '148116', register_gericht: 'AG München', sitz: 'Unterföhring', status: 'aktiv' },
    { firma_name: 'MTU Aero Engines AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '157206', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Wacker Chemie AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '7844', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Rational AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '103056', register_gericht: 'AG Kempten', sitz: 'Landsberg am Lech', status: 'aktiv' },
    { firma_name: 'Fuchs Petrolub SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '4206', register_gericht: 'AG Mannheim', sitz: 'Mannheim', status: 'aktiv' },
    { firma_name: 'Gerresheimer AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '54929', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Sixt SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '59484', register_gericht: 'AG München', sitz: 'Pullach im Isartal', status: 'aktiv' },
    { firma_name: 'Fielmann AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '28891', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Hella GmbH & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '5504', register_gericht: 'AG Paderborn', sitz: 'Lippstadt', status: 'aktiv' },
    { firma_name: 'Dürr AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '720381', register_gericht: 'AG Stuttgart', sitz: 'Bietigheim-Bissingen', status: 'aktiv' },
    { firma_name: 'Hannover Rück SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '6778', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'TUI AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '10012', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Heidelberg Materials AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '330082', register_gericht: 'AG Mannheim', sitz: 'Heidelberg', status: 'aktiv' },
    { firma_name: 'K+S AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '4009', register_gericht: 'AG Kassel', sitz: 'Kassel', status: 'aktiv' },
    { firma_name: 'Sartorius AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '1484', register_gericht: 'AG Göttingen', sitz: 'Göttingen', status: 'aktiv' },
    { firma_name: 'Fresenius Medical Care AG & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '4019', register_gericht: 'AG Hof', sitz: 'Hof', status: 'aktiv' },
    { firma_name: 'Auto1 Group SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '188692', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'flatexDEGIRO AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '105571', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Compugroup Medical SE & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '11008', register_gericht: 'AG Koblenz', sitz: 'Koblenz', status: 'aktiv' },

    // ── GmbH & Co. KG — Große Familienunternehmen ────────────────────────────
    { firma_name: 'Aldi Einkauf GmbH & Co. oHG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '5912', register_gericht: 'AG Essen', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'Aldi GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '4821', register_gericht: 'AG Mülheim an der Ruhr', sitz: 'Mülheim an der Ruhr', status: 'aktiv' },
    { firma_name: 'Lidl Stiftung & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '6885', register_gericht: 'AG Heilbronn', sitz: 'Neckarsulm', status: 'aktiv' },
    { firma_name: 'Bosch GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '14'  , register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Bertelsmann SE & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '1833', register_gericht: 'AG Gütersloh', sitz: 'Gütersloh', status: 'aktiv' },
    { firma_name: 'Würth GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '680', register_gericht: 'AG Stuttgart', sitz: 'Künzelsau', status: 'aktiv' },
    { firma_name: 'Freudenberg & Co. Kommanditgesellschaft', rechtsform: 'KG', register_art: 'HRA', register_nummer: '430', register_gericht: 'AG Mannheim', sitz: 'Weinheim', status: 'aktiv' },
    { firma_name: 'Stihl AG & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '390', register_gericht: 'AG Stuttgart', sitz: 'Waiblingen', status: 'aktiv' },
    { firma_name: 'Rittal GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '1812', register_gericht: 'AG Limburg an der Lahn', sitz: 'Herborn', status: 'aktiv' },
    { firma_name: 'Fressnapf Holding SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '3803', register_gericht: 'AG Krefeld', sitz: 'Krefeld', status: 'aktiv' },
    { firma_name: 'OBI GmbH & Co. Deutschland KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '4466', register_gericht: 'AG Wuppertal', sitz: 'Wermelskirchen', status: 'aktiv' },
    { firma_name: 'Schwarz Beteiligungs GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '5742', register_gericht: 'AG Heilbronn', sitz: 'Neckarsulm', status: 'aktiv' },
    { firma_name: 'Phoenix Contact GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '6582', register_gericht: 'AG Lemgo', sitz: 'Blomberg', status: 'aktiv' },
    { firma_name: 'Sick AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '11'  , register_gericht: 'AG Freiburg im Breisgau', sitz: 'Waldkirch', status: 'aktiv' },
    { firma_name: 'Trigema GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '721', register_gericht: 'AG Stuttgart', sitz: 'Burladingen', status: 'aktiv' },
    { firma_name: 'Rohde & Schwarz GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '76784', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Schüco International KG', rechtsform: 'KG', register_art: 'HRA', register_nummer: '6571', register_gericht: 'AG Bielefeld', sitz: 'Bielefeld', status: 'aktiv' },
    { firma_name: 'Globus SB-Warenhaus Holding GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '20438', register_gericht: 'AG St. Wendel', sitz: 'St. Wendel', status: 'aktiv' },
    { firma_name: 'Roller GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '3917', register_gericht: 'AG Hagen', sitz: 'Hagen', status: 'aktiv' },
    { firma_name: 'Claas KGaA mbH', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '1'   , register_gericht: 'AG Gütersloh', sitz: 'Harsewinkel', status: 'aktiv' },
    { firma_name: 'Dr. Oetker GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '5081', register_gericht: 'AG Bielefeld', sitz: 'Bielefeld', status: 'aktiv' },
    { firma_name: 'Deichmann SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '1780', register_gericht: 'AG Essen', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'Hornbach Holding AG & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '2882', register_gericht: 'AG Landau in der Pfalz', sitz: 'Bornheim', status: 'aktiv' },
    { firma_name: 'Peek & Cloppenburg KG', rechtsform: 'KG', register_art: 'HRA', register_nummer: '38912', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Kühne + Nagel International AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '123', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Bizerba SE & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '702134', register_gericht: 'AG Mannheim', sitz: 'Balingen', status: 'aktiv' },
    { firma_name: 'Faber-Castell AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '1'   , register_gericht: 'AG Nürnberg', sitz: 'Stein', status: 'aktiv' },
    { firma_name: 'Steiff GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '321', register_gericht: 'AG Ulm', sitz: 'Giengen an der Brenz', status: 'aktiv' },
    { firma_name: 'Tengelmann Warenhandelsgesellschaft KG', rechtsform: 'KG', register_art: 'HRA', register_nummer: '8231', register_gericht: 'AG Mülheim an der Ruhr', sitz: 'Mülheim an der Ruhr', status: 'aktiv' },
    { firma_name: 'Haniel & Cie. GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '368', register_gericht: 'AG Duisburg', sitz: 'Duisburg', status: 'aktiv' },
    { firma_name: 'REWE International GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '28811', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'dm-drogerie markt GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '109285', register_gericht: 'AG Karlsruhe', sitz: 'Karlsruhe', status: 'aktiv' },
    { firma_name: 'Rossmann GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '100054', register_gericht: 'AG Hannover', sitz: 'Burgwedel', status: 'aktiv' },
    { firma_name: 'Reemtsma Cigarettenfabriken GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '100286', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Kaufland Stiftung & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '13'  , register_gericht: 'AG Heilbronn', sitz: 'Neckarsulm', status: 'aktiv' },
    { firma_name: 'Rewe-Zentralfinanz eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '603', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Media-Saturn-Holding GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '12150', register_gericht: 'AG Ingolstadt', sitz: 'Ingolstadt', status: 'aktiv' },

    // ── KG / OHG — Personengesellschaften ───────────────────────────────────
    { firma_name: 'Berentzen-Gruppe AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '4204', register_gericht: 'AG Osnabrück', sitz: 'Haselünne', status: 'aktiv' },
    { firma_name: 'Oetker Gruppe KG', rechtsform: 'KG', register_art: 'HRA', register_nummer: '3421', register_gericht: 'AG Bielefeld', sitz: 'Bielefeld', status: 'aktiv' },
    { firma_name: 'Flossbach von Storch AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '57479', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Zott SE & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '1243', register_gericht: 'AG Augsburg', sitz: 'Mertingen', status: 'aktiv' },
    { firma_name: 'Kramer-Werke GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '2341', register_gericht: 'AG Ulm', sitz: 'Illertissen', status: 'aktiv' },
    { firma_name: 'Alfred Ritter GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '410098', register_gericht: 'AG Stuttgart', sitz: 'Waldenbuch', status: 'aktiv' },
    { firma_name: 'Wella GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '8714', register_gericht: 'AG Darmstadt', sitz: 'Darmstadt', status: 'aktiv' },
    { firma_name: 'Ratiopharm GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '2721', register_gericht: 'AG Ulm', sitz: 'Ulm', status: 'aktiv' },
    { firma_name: 'Webasto AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '19' , register_gericht: 'AG München', sitz: 'Stockdorf', status: 'aktiv' },
    { firma_name: 'Kaeser Kompressoren SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '654', register_gericht: 'AG Coburg', sitz: 'Coburg', status: 'aktiv' },
    { firma_name: 'Dachser GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '8982', register_gericht: 'AG Kempten', sitz: 'Kempten', status: 'aktiv' },
    { firma_name: 'DB Schenker GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '110928', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Hellmann Worldwide Logistics GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '3692', register_gericht: 'AG Osnabrück', sitz: 'Osnabrück', status: 'aktiv' },
    { firma_name: 'Heraeus Holding GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '26036', register_gericht: 'AG Hanau', sitz: 'Hanau', status: 'aktiv' },
    { firma_name: 'Benteler International AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '4918', register_gericht: 'AG Paderborn', sitz: 'Paderborn', status: 'aktiv' },
    { firma_name: 'Maxingvest AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '77182', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Rethmann SE & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '4761', register_gericht: 'AG Steinfurt', sitz: 'Selm', status: 'aktiv' },
    { firma_name: 'Brillux GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '4321', register_gericht: 'AG Münster', sitz: 'Münster', status: 'aktiv' },
    { firma_name: 'Hager Electro GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '2891', register_gericht: 'AG Saarbrücken', sitz: 'Blieskastel', status: 'aktiv' },
    { firma_name: 'Windmöller & Hölscher KG', rechtsform: 'KG', register_art: 'HRA', register_nummer: '1234', register_gericht: 'AG Osnabrück', sitz: 'Lengerich', status: 'aktiv' },
    { firma_name: 'Sennheiser Electronic GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '2812', register_gericht: 'AG Hannover', sitz: 'Wedemark', status: 'aktiv' },
    { firma_name: 'Lapp Holding AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '20948', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Giesecke+Devrient GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '44192', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Herrenknecht AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '2'   , register_gericht: 'AG Freiburg im Breisgau', sitz: 'Schwanau', status: 'aktiv' },
    { firma_name: 'Bauhaus AG & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '3812', register_gericht: 'AG Mannheim', sitz: 'Mannheim', status: 'aktiv' },
    { firma_name: 'Lidl Dienstleistung GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '6810', register_gericht: 'AG Heilbronn', sitz: 'Neckarsulm', status: 'aktiv' },
    { firma_name: 'Fielmann Verwaltungs-KG', rechtsform: 'KG', register_art: 'HRA', register_nummer: '3421', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },

    // ── PartG / PartG mbB — Berufspartnerschaften ────────────────────────────
    { firma_name: 'Baker McKenzie Partnerschaft von Rechtsanwälten und Steuerberatern mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '12345', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Freshfields Bruckhaus Deringer Rechtsanwälte Steuerberater PartG mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '8934', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Hengeler Mueller Partnerschaft von Rechtsanwälten mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '7823', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Linklaters LLP Zweigniederlassung Frankfurt', rechtsform: 'PartG', register_art: 'PR', register_nummer: '9234', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Clifford Chance Partnerschaft von Rechtsanwälten mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '6782', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Gleiss Lutz Hootz Hirsch PartGmbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '5621', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Noerr PartGmbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '4891', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Deloitte GmbH Wirtschaftsprüfungsgesellschaft', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '66400', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'KPMG AG Wirtschaftsprüfungsgesellschaft', rechtsform: 'AG', register_art: 'HRB', register_nummer: '49019', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'PricewaterhouseCoopers GmbH Wirtschaftsprüfungsgesellschaft', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '161167', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Ernst & Young GmbH Wirtschaftsprüfungsgesellschaft', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '10178', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'BDO AG Wirtschaftsprüfungsgesellschaft', rechtsform: 'AG', register_art: 'HRB', register_nummer: '75860', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Schindhelm Rechtsanwaltsgesellschaft mbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '3821', register_gericht: 'AG Osnabrück', sitz: 'Osnabrück', status: 'aktiv' },
    { firma_name: 'CMS Hasche Sigle Partnerschaft von Rechtsanwälten und Steuerberatern mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '3451', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Loschelder Rechtsanwälte Partnerschaft', rechtsform: 'PartG', register_art: 'PR', register_nummer: '2341', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Mayer Brown LLP Rechtsanwälte Partnerschaft mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '5678', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'White & Case Partnerschaft von Rechtsanwälten mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '6234', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Willkie Farr & Gallagher LLP Rechtsanwälte (Deutschland)', rechtsform: 'PartG', register_art: 'PR', register_nummer: '7821', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Luther Rechtsanwaltsgesellschaft mbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '21312', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Beiten Burkhardt Rechtsanwaltsgesellschaft mbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '99219', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Ärzte-Partnerschaft Internisten Berlin PartG', rechtsform: 'PartG', register_art: 'PR', register_nummer: '1234', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Architekten & Partner München PartGmbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '891', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Steuerberater Partnerschaft Hamburg PartG', rechtsform: 'PartG', register_art: 'PR', register_nummer: '2891', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },

    // ── eG — Eingetragene Genossenschaften ───────────────────────────────────
    { firma_name: 'REWE-Zentralfinanz eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '603', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Volksbank München eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '1234', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Volksbank Berlin eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '4321', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Volksbank Rhein-Ruhr eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '1891', register_gericht: 'AG Duisburg', sitz: 'Duisburg', status: 'aktiv' },
    { firma_name: 'Sparda-Bank München eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '289', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Sparda-Bank Hamburg eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '312', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Edeka Zentrale AG & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '4681', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'DATEV eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '70', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Raiffeisen Waren GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '3217', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Wüstenrot Bausparkasse AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '100751', register_gericht: 'AG Stuttgart', sitz: 'Ludwigsburg', status: 'aktiv' },
    { firma_name: 'Hamburger Volksbank eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '1231', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Volksbank Stuttgart eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '512', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'PSD Bank München eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '221', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Apobank Deutsche Apotheker- und Ärztebank eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '1', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'WGF Hannover eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '782', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Bayerische Raiffeisen-Zentralbank eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '1', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Geno Bank Essen eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '349', register_gericht: 'AG Essen', sitz: 'Essen', status: 'aktiv' },
    { firma_name: 'GdW Bundesverband deutscher Wohnungs- und Immobilienunternehmen eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '901', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'BayWa AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '9363', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Raiffeisen-Volksbank eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '1893', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Evangelische Kreditgenossenschaft eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '4', register_gericht: 'AG Kassel', sitz: 'Kassel', status: 'aktiv' },
    { firma_name: 'Berliner Volksbank eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '281', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Frankfurter Volksbank eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '314', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Tegut Gutberlet Stiftung & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '4281', register_gericht: 'AG Fulda', sitz: 'Fulda', status: 'aktiv' },
    { firma_name: 'Konsum Genossenschaft Leipzig eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '1', register_gericht: 'AG Leipzig', sitz: 'Leipzig', status: 'aktiv' },

    // ── e.V. / Stiftung / Gemeinnützige Organisationen ──────────────────────
    { firma_name: 'Bundesverband der Deutschen Industrie e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '6969', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Deutsches Rotes Kreuz e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '3312', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'ADAC e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '14'  , register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Verbraucherzentrale Bundesverband e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '21764', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'GIZ Gesellschaft für Internationale Zusammenarbeit GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '9021', register_gericht: 'AG Eschborn', sitz: 'Eschborn', status: 'aktiv' },
    { firma_name: 'Stiftung Warentest', rechtsform: 'Stiftung', register_art: 'VR', register_nummer: '0'  , register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Robert Bosch Stiftung GmbH', rechtsform: 'Stiftung', register_art: 'HRB', register_nummer: '6064', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Bertelsmann Stiftung', rechtsform: 'Stiftung', register_art: 'VR', register_nummer: '0'  , register_gericht: 'AG Gütersloh', sitz: 'Gütersloh', status: 'aktiv' },
    { firma_name: 'Bundesverband IT-Mittelstand e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '8312', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Handelsverband Deutschland HDE e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '3291', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Bundesverband Informationswirtschaft Telekommunikation Bitkom e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '13841', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '4461', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Max-Planck-Gesellschaft zur Förderung der Wissenschaften e.V.', rechtsform: 'e.V.', register_art: 'VR', register_nummer: '3451', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Korber AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '70120', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Drägerwerk AG & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '3181', register_gericht: 'AG Lübeck', sitz: 'Lübeck', status: 'aktiv' },

    // ── OHG — Offene Handelsgesellschaften ──────────────────────────────────
    { firma_name: 'Müller & Söhne OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '12345', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Becker & Partner OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '8923', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Schmidt & Weber Handels OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '6782', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'Hoffmann & Braun OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '4512', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Kaiser & Richter OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '3291', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Wagner & Fischer Bauhandel OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '5671', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Hartmann & Lange OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '7234', register_gericht: 'AG Düsseldorf', sitz: 'Düsseldorf', status: 'aktiv' },
    { firma_name: 'Koch & Schwarz Immobilien OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '2891', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'Thoma & Kraus Elektro OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '1893', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Zimmermann & Vogt OHG', rechtsform: 'OHG', register_art: 'HRA', register_nummer: '4321', register_gericht: 'AG Dresden', sitz: 'Dresden', status: 'aktiv' },

    // ── Additional AG/SE/KG for richer coverage ──────────────────────────────
    { firma_name: 'Nemetschek SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '175669', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Morphosys AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '121023', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Süss MicroTec SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '162543', register_gericht: 'AG München', sitz: 'Garching', status: 'aktiv' },
    { firma_name: 'Stratec SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '731723', register_gericht: 'AG Mannheim', sitz: 'Birkenfeld', status: 'aktiv' },
    { firma_name: 'Dermapharm Holding SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '220543', register_gericht: 'AG München', sitz: 'Grünwald', status: 'aktiv' },
    { firma_name: 'Software AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '1994', register_gericht: 'AG Darmstadt', sitz: 'Darmstadt', status: 'aktiv' },
    { firma_name: 'Jenoptik AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '500643', register_gericht: 'AG Jena', sitz: 'Jena', status: 'aktiv' },
    { firma_name: 'Evotec SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '68647', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Ströer SE & Co. KGaA', rechtsform: 'KGaA', register_art: 'HRB', register_nummer: '63559', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Westwing Group SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '218357', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'Zeal Network SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '131168', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'About You Holding SE', rechtsform: 'SE', register_art: 'HRB', register_nummer: '168314', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Nürnberger Versicherung AG', rechtsform: 'AG', register_art: 'HRB', register_nummer: '9981', register_gericht: 'AG Nürnberg', sitz: 'Nürnberg', status: 'aktiv' },
    { firma_name: 'Muster & Söhne KG', rechtsform: 'KG', register_art: 'HRA', register_nummer: '3421', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Köster GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '4219', register_gericht: 'AG Osnabrück', sitz: 'Osnabrück', status: 'aktiv' },
    { firma_name: 'Bremer & Leguil GmbH & Co. KG', rechtsform: 'GmbH & Co. KG', register_art: 'HRA', register_nummer: '3891', register_gericht: 'AG Duisburg', sitz: 'Duisburg', status: 'aktiv' },
    { firma_name: 'Arztpraxis Gemeinschaft Berlin PartG mbB', rechtsform: 'PartG mbB', register_art: 'PR', register_nummer: '2341', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Ingenieurgemeinschaft Hamburg PartG', rechtsform: 'PartG', register_art: 'PR', register_nummer: '1892', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'Kasseler Volksbank eG', rechtsform: 'eG', register_art: 'GnR', register_nummer: '243', register_gericht: 'AG Kassel', sitz: 'Kassel', status: 'aktiv' },
    { firma_name: 'Rewe Markt GmbH', rechtsform: 'GmbH', register_art: 'HRB', register_nummer: '6736', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'Techniker Krankenkasse Stiftung', rechtsform: 'Stiftung', register_art: 'VR', register_nummer: '0', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },

    // UGs spread across cities
    { firma_name: 'StartupMakers UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '198234', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
    { firma_name: 'CleanTech UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '204521', register_gericht: 'AG Hamburg', sitz: 'Hamburg', status: 'aktiv' },
    { firma_name: 'HealthFirst UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '212893', register_gericht: 'AG Frankfurt am Main', sitz: 'Frankfurt am Main', status: 'aktiv' },
    { firma_name: 'EduTech UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '218234', register_gericht: 'AG Köln', sitz: 'Köln', status: 'aktiv' },
    { firma_name: 'FinTech Labs UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '225678', register_gericht: 'AG Stuttgart', sitz: 'Stuttgart', status: 'aktiv' },
    { firma_name: 'Medizin Digital UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '231892', register_gericht: 'AG Berlin (Charlottenburg)', sitz: 'Berlin', status: 'aktiv' },
    { firma_name: 'Agritech UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '238234', register_gericht: 'AG Hannover', sitz: 'Hannover', status: 'aktiv' },
    { firma_name: 'LegalTech UG (haftungsbeschränkt)', rechtsform: 'UG (haftungsbeschränkt)', register_art: 'HRB', register_nummer: '244891', register_gericht: 'AG München', sitz: 'München', status: 'aktiv' },
  ]

  // Deduplicate by id
  const seen = new Set()
  return companies
    .map((c, i) => ({ ...c, id: `mock_${i + 1}` }))
    .filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true })
  }

  let companies = []

  try {
    companies = await fetchAllFromDatasette()
    console.log(`\nFetched ${companies.length} companies from OffeneRegister.`)
  } catch (err) {
    console.warn(`\nDatasette fetch failed: ${err.message}`)
  }

  if (companies.length < 100) {
    console.log('Insufficient data from API, using built-in mock dataset.')
    companies = buildMockDataset()
  } else {
    // Merge with mock dataset to ensure good coverage
    const mockExtra = buildMockDataset()
    const existingIds = new Set(companies.map(c => c.id))
    for (const c of mockExtra) {
      if (!existingIds.has(c.id)) companies.push(c)
    }
    console.log(`Merged with mock dataset → ${companies.length} total companies.`)
  }

  writeFileSync(OUT_FILE, JSON.stringify(companies, null, 0))
  console.log(`\nWrote ${companies.length} companies to ${OUT_FILE}`)
  console.log(`File size: ${(Buffer.byteLength(JSON.stringify(companies)) / 1024).toFixed(1)} KB`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
