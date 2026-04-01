const CRAWLER_URL = process.env.CRAWLER_URL
const CRAWLER_SECRET = process.env.CRAWLER_SECRET

/**
 * Forward a request to the internal crawler service.
 * Returns a fetch Response — caller decides how to pipe it.
 */
export async function proxyCrawler(path, queryParams = {}) {
  const url = new URL(`${CRAWLER_URL}${path}`)
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-api-secret': CRAWLER_SECRET },
  })

  return res
}
