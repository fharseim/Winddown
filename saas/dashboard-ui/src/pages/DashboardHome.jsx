import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const s = {
  h1:      { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub:     { color: '#64748b', fontSize: 14, marginBottom: 32 },
  cards:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 },
  card:    { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  label:   { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  value:   { fontSize: 32, fontWeight: 700 },
  small:   { fontSize: 13, color: '#64748b', marginTop: 4 },
  barWrap: { background: '#f1f5f9', borderRadius: 4, height: 8, marginTop: 8 },
  bar:     (pct) => ({ background: pct > 90 ? '#ef4444' : '#0f172a', width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4 }),
  section: { marginTop: 32 },
  sh2:     { fontSize: 16, fontWeight: 600, marginBottom: 16 },
  chart:   { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  bars:    { display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 },
  dayBar:  (h) => ({ flex: 1, background: '#0f172a', borderRadius: '2px 2px 0 0', height: `${h}%`, minHeight: 2 }),
  daylabel:{ display: 'flex', gap: 4, marginTop: 4 },
  dl:      { flex: 1, fontSize: 10, color: '#94a3b8', textAlign: 'center' },
}

export default function DashboardHome() {
  const [me, setMe] = useState(null)
  const [usage, setUsage] = useState([])

  useEffect(() => {
    api.me().then(setMe).catch(console.error)
    api.usage(30).then(setUsage).catch(console.error)
  }, [])

  if (!me) return <div style={{ color: '#64748b' }}>Laden…</div>

  const pct = me.plan_calls_limit > 0 ? Math.round((me.calls_this_period / me.plan_calls_limit) * 100) : 0
  const maxCalls = Math.max(...usage.map(d => d.billable_calls), 1)

  const PLAN_LABELS = { free: 'Free', starter: 'Starter', growth: 'Growth', scale: 'Scale' }

  return (
    <div>
      <div style={s.h1}>Übersicht</div>
      <div style={s.sub}>{me.email}</div>

      <div style={s.cards}>
        <div style={s.card}>
          <div style={s.label}>Plan</div>
          <div style={s.value}>{PLAN_LABELS[me.plan]}</div>
        </div>
        <div style={s.card}>
          <div style={s.label}>Calls diesen Monat</div>
          <div style={s.value}>{me.calls_this_period.toLocaleString('de-DE')}</div>
          <div style={s.small}>von {me.plan_calls_limit.toLocaleString('de-DE')}</div>
          <div style={s.barWrap}><div style={s.bar(pct)} /></div>
        </div>
        <div style={s.card}>
          <div style={s.label}>Reset am</div>
          <div style={{ ...s.value, fontSize: 18, paddingTop: 6 }}>
            {me.period_reset_at
              ? new Date(me.period_reset_at).toLocaleDateString('de-DE')
              : '—'}
          </div>
        </div>
      </div>

      {usage.length > 0 && (
        <div style={s.section}>
          <div style={s.sh2}>API-Calls letzte 30 Tage</div>
          <div style={s.chart}>
            <div style={s.bars}>
              {usage.slice(-30).map((d, i) => (
                <div key={i} style={s.dayBar(Math.round((d.billable_calls / maxCalls) * 100))} title={`${d.billable_calls} Calls`} />
              ))}
            </div>
            <div style={s.daylabel}>
              {usage.slice(-30).map((d, i) => (
                <div key={i} style={s.dl}>
                  {i % 5 === 0 ? new Date(d.day).getDate() : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
