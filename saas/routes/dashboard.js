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
