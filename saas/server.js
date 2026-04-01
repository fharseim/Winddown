import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import publicApiRouter from './routes/publicApi.js'
import dashboardRouter from './routes/dashboard.js'
import webhookRouter  from './routes/webhooks.js'

const app = express()
const PORT = process.env.PORT || 3002

// ── Stripe webhook: raw body BEFORE json parser ───────────────────────────────
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter)

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json())

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.SAAS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim())

// Public API: machine-to-machine — allow all origins
app.use('/v1', cors())

// Dashboard: restrict to known origins
app.use('/dashboard', cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('CORS: origin not allowed'))
  },
  credentials: true,
}))

// ── Rate limiting (IP-based, protects unauthenticated surface) ────────────────
app.use('/v1', rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
}))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/v1', publicApiRouter)
app.use('/dashboard', dashboardRouter)

app.get('/health', (_, res) => res.json({ ok: true, service: 'hrauszug-saas' }))

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[hrauszug] SaaS API listening on port ${PORT}`)
})
