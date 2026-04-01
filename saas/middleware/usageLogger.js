import { logUsage } from '../services/usageService.js'

/**
 * Fire-and-forget usage logger. Attaches res.on('finish') listener
 * so logging happens after the response is sent — never blocks the caller.
 */
export default function usageLogger(req, res, next) {
  const startedAt = Date.now()

  res.on('finish', () => {
    if (!req.apiKey) return  // unauthenticated request — skip

    const params = req.query
    const wasCached = res.getHeader('x-cache') === 'HIT'
    // /v1/download is the primary billable event; search/documents are also billable
    const billable = res.statusCode < 400

    logUsage({
      apiKeyId:       req.apiKey.id,
      customerId:     req.customer.id,
      endpoint:       req.path,
      method:         req.method,
      statusCode:     res.statusCode,
      responseTimeMs: Date.now() - startedAt,
      registerArt:    params.registerArt,
      registerNummer:  params.registerNummer,
      registerGericht: params.registerGericht,
      docType:        params.docType,
      wasCached,
      billable,
    })
  })

  next()
}
