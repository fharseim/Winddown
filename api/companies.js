import { createClient } from '@supabase/supabase-js'

// Mock dataset — used when Supabase is not configured
const MOCK_COMPANIES = [
  { id: 'm1',  firma_name: 'TechCo GmbH',                          register_art: 'HRB', register_nummer: '12345',  register_gericht: 'AG Frankfurt am Main', rechtsform: 'GmbH',                      sitz: 'Frankfurt am Main', status: 'aktiv' },
  { id: 'm2',  firma_name: 'Horizon SaaS GmbH',                    register_art: 'HRB', register_nummer: '67890',  register_gericht: 'AG München',           rechtsform: 'GmbH',                      sitz: 'München',           status: 'aktiv' },
  { id: 'm3',  firma_name: 'MobileCo UG (haftungsbeschränkt)',      register_art: 'HRB', register_nummer: '11111',  register_gericht: 'AG Berlin (Charlottenburg)', rechtsform: 'UG (haftungsbeschränkt)', sitz: 'Berlin',         status: 'aktiv' },
  { id: 'm4',  firma_name: 'Acme Ventures GmbH',                   register_art: 'HRB', register_nummer: '23456',  register_gericht: 'AG Berlin (Charlottenburg)', rechtsform: 'GmbH',                  sitz: 'Berlin',           status: 'aktiv' },
  { id: 'm5',  firma_name: 'Greenfield Capital GmbH',              register_art: 'HRB', register_nummer: '34567',  register_gericht: 'AG Hamburg',           rechtsform: 'GmbH',                      sitz: 'Hamburg',           status: 'aktiv' },
  { id: 'm6',  firma_name: 'DataBridge GmbH',                      register_art: 'HRB', register_nummer: '45678',  register_gericht: 'AG Düsseldorf',        rechtsform: 'GmbH',                      sitz: 'Düsseldorf',        status: 'aktiv' },
  { id: 'm7',  firma_name: 'NovaTech Solutions GmbH',              register_art: 'HRB', register_nummer: '56789',  register_gericht: 'AG Stuttgart',         rechtsform: 'GmbH',                      sitz: 'Stuttgart',         status: 'aktiv' },
  { id: 'm8',  firma_name: 'CloudStack UG (haftungsbeschränkt)',   register_art: 'HRB', register_nummer: '22222',  register_gericht: 'AG Köln',              rechtsform: 'UG (haftungsbeschränkt)', sitz: 'Köln',              status: 'aktiv' },
  { id: 'm9',  firma_name: 'PulseMedia GmbH',                      register_art: 'HRB', register_nummer: '78901',  register_gericht: 'AG München',           rechtsform: 'GmbH',                      sitz: 'München',           status: 'aktiv' },
  { id: 'm10', firma_name: 'Finbridge GmbH',                       register_art: 'HRB', register_nummer: '89012',  register_gericht: 'AG Frankfurt am Main', rechtsform: 'GmbH',                      sitz: 'Frankfurt am Main', status: 'aktiv' },
  { id: 'm11', firma_name: 'Alphawave Ventures GmbH',              register_art: 'HRB', register_nummer: '90123',  register_gericht: 'AG Berlin (Charlottenburg)', rechtsform: 'GmbH',                  sitz: 'Berlin',           status: 'aktiv' },
  { id: 'm12', firma_name: 'Solaris Digital GmbH',                 register_art: 'HRB', register_nummer: '101112', register_gericht: 'AG Hamburg',           rechtsform: 'GmbH',                      sitz: 'Hamburg',           status: 'aktiv' },
  { id: 'm13', firma_name: 'Medtech Innovations GmbH',             register_art: 'HRB', register_nummer: '121314', register_gericht: 'AG Mannheim',          rechtsform: 'GmbH',                      sitz: 'Heidelberg',        status: 'aktiv' },
  { id: 'm14', firma_name: 'Bravo Commerce GmbH',                  register_art: 'HRB', register_nummer: '131415', register_gericht: 'AG Leipzig',           rechtsform: 'GmbH',                      sitz: 'Leipzig',           status: 'aktiv' },
  { id: 'm15', firma_name: 'Ecoloop UG (haftungsbeschränkt)',      register_art: 'HRB', register_nummer: '33333',  register_gericht: 'AG Freiburg im Breisgau', rechtsform: 'UG (haftungsbeschränkt)', sitz: 'Freiburg im Breisgau', status: 'aktiv' },
  { id: 'm16', firma_name: 'Skyline Properties GmbH',              register_art: 'HRB', register_nummer: '151617', register_gericht: 'AG München',           rechtsform: 'GmbH',                      sitz: 'München',           status: 'aktiv' },
  { id: 'm17', firma_name: 'Legacysoft GmbH',                      register_art: 'HRB', register_nummer: '161718', register_gericht: 'AG Nürnberg',          rechtsform: 'GmbH',                      sitz: 'Nürnberg',          status: 'geloescht' },
  { id: 'm18', firma_name: 'Momentum Labs GmbH',                   register_art: 'HRB', register_nummer: '171819', register_gericht: 'AG Berlin (Charlottenburg)', rechtsform: 'GmbH',                  sitz: 'Berlin',           status: 'aktiv' },
  { id: 'm19', firma_name: 'Redshift Analytics GmbH',              register_art: 'HRB', register_nummer: '181920', register_gericht: 'AG Düsseldorf',        rechtsform: 'GmbH',                      sitz: 'Düsseldorf',        status: 'aktiv' },
  { id: 'm20', firma_name: 'Vortex Robotics GmbH',                 register_art: 'HRB', register_nummer: '192021', register_gericht: 'AG Stuttgart',         rechtsform: 'GmbH',                      sitz: 'Stuttgart',         status: 'aktiv' },
]

function searchMock(q, limit) {
  const term = q.toLowerCase().trim()
  if (!term) return []
  return MOCK_COMPANIES
    .filter(c => c.firma_name.toLowerCase().includes(term))
    .slice(0, limit)
    .map(({ id, firma_name, register_art, register_nummer, register_gericht, rechtsform, sitz, status }) =>
      ({ id, firma_name, register_art, register_nummer, register_gericht, rechtsform, sitz, status })
    )
}

export default async function handler(req, res) {
  // Rate limiting headers
  res.setHeader('X-RateLimit-Limit', '60')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { q = '', limit: limitParam = '5' } = req.query
  const limit = Math.min(parseInt(limitParam, 10) || 5, 20)

  if (!q || q.trim().length < 2) {
    return res.status(200).json({ results: [], source: 'mock' })
  }

  // Use real Supabase if configured
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL) {
    try {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const { data, error } = await supabase
        .from('companies')
        .select('id, firma_name, register_art, register_nummer, register_gericht, rechtsform, sitz, status')
        .ilike('firma_name_normalized', `%${q.toLowerCase().trim()}%`)
        .limit(limit)

      if (error) throw error

      return res.status(200).json({ results: data || [], source: 'supabase' })
    } catch (err) {
      console.error('Supabase company search error:', err)
      // Fall through to mock on error
    }
  }

  // Fall back to mock data
  const results = searchMock(q, limit)
  return res.status(200).json({ results, source: 'mock' })
}
