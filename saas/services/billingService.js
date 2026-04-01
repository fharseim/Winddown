import { stripe, PLANS } from './stripe.js'
import supabase from './supabase.js'

/**
 * Get or create a Stripe customer for a saas_customer row.
 */
async function ensureStripeCustomer(customer) {
  if (customer.stripe_customer_id) return customer.stripe_customer_id

  const stripeCustomer = await stripe.customers.create({
    email: customer.email,
    name: customer.company_name || customer.email,
    metadata: { saas_customer_id: customer.id },
  })

  await supabase
    .from('saas_customers')
    .update({ stripe_customer_id: stripeCustomer.id })
    .eq('id', customer.id)

  return stripeCustomer.id
}

/**
 * Create a Stripe Checkout Session for a plan upgrade.
 * Returns { url } to redirect the customer to.
 */
export async function createCheckoutSession(customer, planId, returnBaseUrl) {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Unknown plan: ${planId}`)

  const stripeCustomerId = await ensureStripeCustomer(customer)

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: plan.price_id, quantity: 1 }],
    success_url: `${returnBaseUrl}/dashboard?upgrade=success`,
    cancel_url:  `${returnBaseUrl}/dashboard/billing`,
    metadata: { saas_customer_id: customer.id, plan: planId },
  })

  return { url: session.url }
}

/**
 * Create a Stripe Billing Portal session for self-serve management.
 */
export async function createPortalSession(customer, returnBaseUrl) {
  const stripeCustomerId = await ensureStripeCustomer(customer)

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${returnBaseUrl}/dashboard/billing`,
  })

  return { url: session.url }
}

/**
 * Sync a Stripe subscription event into saas_subscriptions + saas_customers.
 */
export async function syncSubscription(stripeSubscription) {
  const customerId = stripeSubscription.metadata?.saas_customer_id
  if (!customerId) return

  const planEntry = Object.entries(PLANS).find(
    ([, p]) => p.price_id === stripeSubscription.items.data[0]?.price?.id
  )
  const plan = planEntry?.[0] ?? 'starter'
  const callsLimit = PLANS[plan]?.calls_per_month ?? 500

  await supabase.from('saas_subscriptions').upsert({
    customer_id:            customerId,
    stripe_subscription_id: stripeSubscription.id,
    stripe_price_id:        stripeSubscription.items.data[0]?.price?.id,
    plan,
    status:                 stripeSubscription.status,
    current_period_start:   new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    current_period_end:     new Date(stripeSubscription.current_period_end   * 1000).toISOString(),
    updated_at:             new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' })

  await supabase
    .from('saas_customers')
    .update({ plan, plan_calls_limit: callsLimit })
    .eq('id', customerId)
}

/**
 * Reset the usage counter when an invoice is paid.
 */
export async function resetPeriodUsage(stripeCustomerId, periodEnd) {
  await supabase
    .from('saas_customers')
    .update({
      calls_this_period: 0,
      period_reset_at: new Date(periodEnd * 1000).toISOString(),
    })
    .eq('stripe_customer_id', stripeCustomerId)
}

/**
 * Downgrade customer to free plan on subscription cancellation.
 */
export async function cancelSubscription(stripeCustomerId) {
  await supabase
    .from('saas_customers')
    .update({ plan: 'free', plan_calls_limit: 50 })
    .eq('stripe_customer_id', stripeCustomerId)
}
