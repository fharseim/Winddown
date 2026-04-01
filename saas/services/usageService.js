import supabase from './supabase.js'

/**
 * Log a single API call and atomically increment the customer's period counter.
 * Fire-and-forget — never throws to the caller.
 */
export async function logUsage({
  apiKeyId,
  customerId,
  endpoint,
  method = 'GET',
  statusCode,
  responseTimeMs,
  registerArt,
  registerNummer,
  registerGericht,
  docType,
  wasCached = false,
  billable = true,
}) {
  try {
    await supabase.from('saas_usage_logs').insert({
      api_key_id:       apiKeyId,
      customer_id:      customerId,
      endpoint,
      method,
      status_code:      statusCode,
      response_time_ms: responseTimeMs,
      register_art:     registerArt,
      register_nummer:  registerNummer,
      register_gericht: registerGericht,
      doc_type:         docType,
      was_cached:       wasCached,
      billable,
    })

    if (billable) {
      await supabase.rpc('saas_increment_usage', { p_customer_id: customerId })
    }
  } catch (err) {
    console.error('[usage] log failed:', err.message)
  }
}

/**
 * Return daily usage for a customer over the last N days.
 */
export async function getDailyUsage(customerId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('saas_usage_daily')
    .select('*')
    .eq('customer_id', customerId)
    .gte('day', since)
    .order('day', { ascending: true })

  if (error) throw error
  return data
}
