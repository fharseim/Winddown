import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const PLANS = [
  { id: 'starter', name: 'Starter', price: '49 €', calls: '500', overage: '0,05 € / Call' },
  { id: 'growth',  name: 'Growth',  price: '199 €', calls: '5.000', overage: '0,03 € / Call' },
  { id: 'scale',   name: 'Scale',   price: '799 €', calls: '50.000', overage: '0,02 € / Call' },
]

const s = {
  h1:      { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub:     { color: '#64748b', fontSize: 14, marginBottom: 32 },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 },
  card:    (active) => ({
    background: active ? '#0f172a' : '#fff',
    color: active ? '#fff' : '#111',
    borderRadius: 12, padding: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: active ? '2px solid #0f172a' : '2px solid transparent',
  }),
  name:    { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  price:   { fontSize: 32, fontWeight: 800, marginBottom: 16 },
  per:     (active) => ({ fontSize: 13, color: active ? '#94a3b8' : '#64748b', marginBottom: 4 }),
  btn:     (active) => ({
    marginTop: 20, width: '100%', padding: '10px 0',
    background: active ? '#fff' : '#0f172a',
    color: active ? '#0f172a' : '#fff',
    border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }),
  portal:  { padding: '10px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
}

export default function BillingPage() {
  const [me, setMe] = useState(null)

  useEffect(() => { api.me().then(setMe) }, [])

  async function upgrade(planId) {
    const { url } = await api.checkout(planId)
    window.location.href = url
  }

  async function openPortal() {
    const { url } = await api.billingPortal()
    window.location.href = url
  }

  if (!me) return <div style={{ color: '#64748b' }}>Laden…</div>

  return (
    <div>
      <div style={s.h1}>Abonnement</div>
      <div style={s.sub}>Aktueller Plan: <strong>{me.plan}</strong></div>

      <div style={s.grid}>
        {PLANS.map(plan => {
          const active = me.plan === plan.id
          return (
            <div key={plan.id} style={s.card(active)}>
              <div style={s.name}>{plan.name}</div>
              <div style={s.price}>{plan.price}<span style={{ fontSize: 14, fontWeight: 400 }}>/mo</span></div>
              <div style={s.per(active)}>{plan.calls} Calls inkl.</div>
              <div style={s.per(active)}>Overage: {plan.overage}</div>
              <button style={s.btn(active)} onClick={() => upgrade(plan.id)} disabled={active}>
                {active ? 'Aktueller Plan' : 'Upgraden'}
              </button>
            </div>
          )
        })}
      </div>

      <button style={s.portal} onClick={openPortal}>
        Zahlungsmethode & Rechnungen verwalten →
      </button>
    </div>
  )
}
