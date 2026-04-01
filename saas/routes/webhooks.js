import { Router } from 'express'
import { stripe } from '../services/stripe.js'
import { syncSubscription, resetPeriodUsage, cancelSubscription } from '../services/billingService.js'

const router = Router()

// Raw body required for Stripe signature verification — mounted before json middleware
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await syncSubscription(event.data.object)
        break

      case 'customer.subscription.deleted':
        await cancelSubscription(event.data.object.customer)
        break

      case 'invoice.paid':
        await resetPeriodUsage(
          event.data.object.customer,
          event.data.object.lines.data[0]?.period?.end
        )
        break

      case 'invoice.payment_failed':
        // Log only — Stripe handles retry and eventual cancellation
        console.warn('[webhook] payment failed for customer:', event.data.object.customer)
        break

      default:
        // Ignore unhandled events
    }
  } catch (err) {
    console.error(`[webhook] error handling ${event.type}:`, err.message)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }

  res.json({ received: true })
})

export default router
