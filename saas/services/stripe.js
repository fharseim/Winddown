import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const PLANS = {
  starter: {
    name: 'Starter',
    calls_per_month: 500,
    overage_per_call: 0.05,
    price_id: process.env.STRIPE_STARTER_PRICE_ID,
  },
  growth: {
    name: 'Growth',
    calls_per_month: 5000,
    overage_per_call: 0.03,
    price_id: process.env.STRIPE_GROWTH_PRICE_ID,
  },
  scale: {
    name: 'Scale',
    calls_per_month: 50000,
    overage_per_call: 0.02,
    price_id: process.env.STRIPE_SCALE_PRICE_ID,
  },
}
