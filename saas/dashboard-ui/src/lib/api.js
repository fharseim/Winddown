import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_SAAS_API_URL

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: await authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  me:              ()           => req('GET',    '/dashboard/me'),
  recentCompanies: ()           => req('GET',    '/dashboard/recent-companies'),
  usage:           (days = 30)  => req('GET',    `/dashboard/usage?days=${days}`),
  listKeys:        ()           => req('GET',    '/dashboard/api-keys'),
  createKey:       (label)      => req('POST',   '/dashboard/api-keys', { label }),
  revokeKey:       (id)         => req('DELETE', `/dashboard/api-keys/${id}`),
  checkout:        (plan)       => req('POST',   '/dashboard/billing/checkout', { plan }),
  billingPortal:   ()           => req('POST',   '/dashboard/billing/portal'),
}
