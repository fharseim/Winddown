import { Router } from 'express'
import apiKeyAuth from '../middleware/apiKeyAuth.js'
import usageLogger from '../middleware/usageLogger.js'
import { proxyCrawler } from '../services/crawlerProxy.js'

const router = Router()

router.use(apiKeyAuth)
router.use(usageLogger)

// GET /v1/search?q=&registerArt=&registerNummer=&registerGericht=
router.get('/search', async (req, res) => {
  try {
    const upstream = await proxyCrawler('/api/search', req.query)
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Crawler unavailable', detail: err.message })
  }
})

// GET /v1/documents?registerArt=&registerNummer=&registerGericht=
router.get('/documents', async (req, res) => {
  try {
    const upstream = await proxyCrawler('/api/documents', req.query)
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Crawler unavailable', detail: err.message })
  }
})

// GET /v1/dk-list?registerArt=&registerNummer=&registerGericht=
router.get('/dk-list', async (req, res) => {
  try {
    const upstream = await proxyCrawler('/api/dk-list', req.query)
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Crawler unavailable', detail: err.message })
  }
})

// GET /v1/download?registerArt=&registerNummer=&registerGericht=&docType=AD|CD|DK
router.get('/download', async (req, res) => {
  const { docType } = req.query
  if (!['AD', 'CD', 'DK'].includes(docType)) {
    return res.status(400).json({ error: 'docType must be AD, CD, or DK' })
  }

  try {
    const upstream = await proxyCrawler('/api/download', req.query)

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(upstream.status).json({ error: text })
    }

    const ct = upstream.headers.get('content-type') || 'application/pdf'
    const cached = upstream.headers.get('x-cache') || ''
    res.setHeader('Content-Type', ct)
    res.setHeader('x-cache', cached)

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.send(buffer)
  } catch (err) {
    res.status(502).json({ error: 'Crawler unavailable', detail: err.message })
  }
})

export default router
