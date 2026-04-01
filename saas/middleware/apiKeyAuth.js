import { validateApiKey } from '../services/apiKeys.js'

/**
 * Validates `Authorization: Bearer hra_live_...` header.
 * Attaches req.apiKey and req.customer on success.
 */
export default async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!rawKey) {
    return res.status(401).json({ error: 'Missing API key. Send Authorization: Bearer <key>' })
  }

  const apiKey = await validateApiKey(rawKey)

  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid or revoked API key.' })
  }

  const customer = apiKey.customer
  if (customer.calls_this_period >= customer.plan_calls_limit) {
    return res.status(429).json({
      error: 'Monthly call limit reached.',
      plan: customer.plan,
      limit: customer.plan_calls_limit,
      used: customer.calls_this_period,
    })
  }

  req.apiKey = apiKey
  req.customer = customer
  next()
}
