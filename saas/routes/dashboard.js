import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import supabase from '../services/supabase.js'
import { createApiKey, listApiKeys, revokeApiKey } from '../services/apiKeys.js'
import { getDailyUsage } from '../services/usageService.js'
import { createCheckoutSession, createPortalSession } from '../services/billingService.js'

const router = Router()

// ── Auth middleware (Supabase JWT) ────────────────────────────────────────────
const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function dashboardAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid session' })

  // Resolve or create saas_customers row
  let { data: customer } = await supabase
    .from('saas_customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!customer) {
    const { data: newCustomer, error: insertErr } = await supabase
      .from('saas_customers')
      .insert({ auth_user_id: user.id, email: user.email })
      .select()
      .single()
    if (insertErr) return res.status(500).json({ error: 'Could not create customer record' })
    customer = newCustomer
  }

  req.user = user
  req.customer = customer
  next()
}

router.use(dashboardAuth)

// GET /dashboard/me
router.get('/me', (req, res) => {
  const { id, company_name, email, plan, plan_calls_limit, calls_this_period, period_reset_at } = req.customer
  res.json({ id, company_name, email, plan, plan_calls_limit, calls_this_period, period_reset_at })
})

// GET /dashboard/usage?days=30
router.get('/usage', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30'), 90)
    const data = await getDailyUsage(req.customer.id, days)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /dashboard/api-keys
router.get('/api-keys', async (req, res) => {
  try {
    const keys = await listApiKeys(req.customer.id)
    res.json(keys)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /dashboard/api-keys  { label }
router.post('/api-keys', async (req, res) => {
  try {
    const { label } = req.body
    const { key, record } = await createApiKey(req.customer.id, label)
    // key is returned ONCE — never retrievable again
    res.status(201).json({ key, record })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /dashboard/api-keys/:id
router.delete('/api-keys/:id', async (req, res) => {
  try {
    await revokeApiKey(req.params.id, req.customer.id)
    res.json({ revoked: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /dashboard/recent-companies  — distinct companies from usage_logs
router.get('/recent-companies', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saas_usage_logs')
      .select('register_art, register_nummer, register_gericht')
      .eq('customer_id', req.customer.id)
      .not('register_nummer', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    // Deduplicate by register_art+nummer+gericht, keep order of first occurrence
    const seen = new Set()
    const unique = []
    for (const row of data) {
      const key = `${row.register_art}:${row.register_nummer}:${row.register_gericht}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(row)
      }
      if (unique.length >= 10) break
    }

    res.json(unique)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /dashboard/search?q=
router.get('/search', async (req, res) => {
  try {
    const { proxyCrawler } = await import('../services/crawlerProxy.js')
    const upstream = await proxyCrawler('/api/search', req.query)
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// GET /dashboard/documents?registerArt=&registerNummer=&registerGericht=
router.get('/documents', async (req, res) => {
  try {
    const { proxyCrawler } = await import('../services/crawlerProxy.js')
    const upstream = await proxyCrawler('/api/documents', req.query)
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// GET /dashboard/download?registerArt=&registerNummer=&registerGericht=&docType=&docId=
router.get('/download', async (req, res) => {
  const { registerArt, registerNummer, registerGericht, docType, docId } = req.query
  if (!registerArt || !registerNummer || !registerGericht || !docType) {
    return res.status(400).json({ error: 'registerArt, registerNummer, registerGericht und docType sind erforderlich' })
  }
  if (!['AD', 'CD', 'DK'].includes(docType)) {
    return res.status(400).json({ error: 'docType muss AD, CD oder DK sein' })
  }
  try {
    const { proxyCrawler } = await import('../services/crawlerProxy.js')
    const upstream = await proxyCrawler('/api/download', { registerArt, registerNummer, registerGericht, docType, ...(docId ? { docId } : {}) })
    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(upstream.status).json({ error: text })
    }
    const ct = upstream.headers.get('content-type') || 'application/pdf'
    res.setHeader('Content-Type', ct)
    res.setHeader('Content-Disposition', `attachment; filename="${registerArt}_${registerNummer}_${docType}.pdf"`)
    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.send(buffer)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// POST /dashboard/billing/checkout  { plan: 'starter'|'growth'|'scale' }
router.post('/billing/checkout', async (req, res) => {
  try {
    const { plan } = req.body
    const origin = req.headers.origin || `https://hrauszug.io`
    const { url } = await createCheckoutSession(req.customer, plan, origin)
    res.json({ url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /dashboard/billing/portal
router.post('/billing/portal', async (req, res) => {
  try {
    const origin = req.headers.origin || `https://hrauszug.io`
    const { url } = await createPortalSession(req.customer, origin)
    res.json({ url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
