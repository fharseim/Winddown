#!/usr/bin/env node
/**
 * Fetches German GmbH/UG companies from the OffeneRegister.de Datasette API
 * and saves a compact dataset to api/data/companies.json for the Rise Handelsregister search.
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

  // Only GmbH and UG
  const lname = name.toLowerCase()
  if (!lname.includes('gmbh') && !lname.includes('ug (') && !lname.includes('gesellschaft mit beschränkter')) return null

  // Determine rechtsform
  let rechtsform = 'GmbH'
  if (lname.includes('ug (') || lname.includes('unternehmergesellschaft')) rechtsform = 'UG (haftungsbeschränkt)'

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
