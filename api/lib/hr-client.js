/**
 * Shared Handelsregister client
 * Handles session establishment (cookies + JSF ViewState) with handelsregister.de
 */

export const HR_BASE = 'https://www.handelsregister.de'
export const HR_SEARCH_URL = `${HR_BASE}/rp_web/erweitertesuche.xhtml`

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
}

export async function fetchWithTimeout(url, opts, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Establishes a session with handelsregister.de.
 * Returns { cookies, viewState, html } from the search page GET.
 */
export async function getHrSession() {
  const res = await fetchWithTimeout(HR_SEARCH_URL, {
    headers: { ...BROWSER_HEADERS },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HR session GET failed: ${res.status}`)

  // Collect cookies
  const setCookie = res.headers.getSetCookie?.() ?? []
  let cookies
  if (setCookie.length) {
    cookies = setCookie.map(c => c.split(';')[0]).join('; ')
  } else {
    const raw = res.headers.get('set-cookie') || ''
    cookies = raw
      .split(',')
      .map(c => c.trim().split(';')[0])
      .join('; ')
  }

  const html = await res.text()

  // Extract javax.faces.ViewState
  const vsMatch = html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]*)"/)
  const viewState = vsMatch ? vsMatch[1] : ''

  return { cookies, viewState, html }
}
