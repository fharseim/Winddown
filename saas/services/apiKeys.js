import crypto from 'crypto'
import supabase from './supabase.js'

function generateRawKey() {
  return 'hra_live_' + crypto.randomBytes(32).toString('hex')
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Create a new API key for a customer.
 * Returns { key (plaintext, shown once), record }.
 */
export async function createApiKey(customerId, label = '') {
  const rawKey = generateRawKey()
  const keyHash = hashKey(rawKey)
  const keyPrefix = rawKey.slice(0, 12)

  const { data, error } = await supabase
    .from('saas_api_keys')
    .insert({ customer_id: customerId, label, key_prefix: keyPrefix, key_hash: keyHash })
    .select()
    .single()

  if (error) throw error
  return { key: rawKey, record: data }
}

/**
 * Validate an inbound raw API key.
 * Returns the api_key row (with customer joined) or null.
 */
export async function validateApiKey(rawKey) {
  if (!rawKey) return null
  const keyHash = hashKey(rawKey)

  const { data, error } = await supabase
    .from('saas_api_keys')
    .select('*, customer:saas_customers(*)')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  if (!data.customer?.is_active) return null

  // Update last_used_at async — don't await
  supabase
    .from('saas_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return data
}

/**
 * List all active API keys for a customer (never returns key_hash).
 */
export async function listApiKeys(customerId) {
  const { data, error } = await supabase
    .from('saas_api_keys')
    .select('id, label, key_prefix, is_active, created_at, last_used_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Revoke an API key. Only the owning customer can revoke their own key.
 */
export async function revokeApiKey(keyId, customerId) {
  const { error } = await supabase
    .from('saas_api_keys')
    .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: 'customer' })
    .eq('id', keyId)
    .eq('customer_id', customerId)

  if (error) throw error
}
