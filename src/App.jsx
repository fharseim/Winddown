import { useState } from 'react'

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-rise-bg-warm/95 backdrop-blur-sm border-b border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <span className="font-serif text-rise-dark tracking-logo text-lg uppercase">
          Rise
        </span>
        <a
          href="mailto:hello@risestartup.eu"
          className="text-sm font-sans font-medium text-rise-muted hover:text-rise-dark transition-colors duration-200 tracking-wide"
        >
          Get in touch
        </a>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-36 pb-24 md:pt-44 md:pb-32 px-6 md:px-12 max-w-6xl mx-auto">
      <h1 className="font-serif font-normal text-rise-dark text-[2.75rem] md:text-[3.5rem] lg:text-[3.75rem] leading-[1.08] tracking-tight mb-8">
        Every stage has infrastructure.
        <br />
        <span className="italic text-rise-muted">Except the last one.</span>
      </h1>
      <p className="font-sans font-light text-rise-muted text-lg md:text-xl leading-relaxed max-w-xl mb-10">
        Rise builds the missing transition layer for European startups.
      </p>
      <a
        href="mailto:hello@risestartup.eu"
        className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-rise-dark transition-colors duration-200"
      >
        Get in touch
      </a>
    </section>
  )
}

function Divider() {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12">
      <div className="border-t border-rise-border" />
    </div>
  )
}

function Problem() {
  const stages = [
    { tool: 'Stripe Atlas', stage: 'Incorporation', note: 'Entity setup, banking, compliance' },
    { tool: 'Carta', stage: 'Cap Table & Equity', note: 'Ownership, options, investor reporting' },
    { tool: 'Notion / Linear', stage: 'Operations', note: 'Product, hiring, roadmap execution' },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-4">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-5">
          The Gap
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-4xl md:text-5xl leading-[1.08] tracking-tight max-w-2xl">
          Every stage is served.
          <br />
          <span className="italic text-rise-muted">One is not.</span>
        </h2>
      </div>

      <p className="font-sans font-light text-rise-muted text-base leading-relaxed max-w-xl mb-14">
        Infrastructure exists for every phase of a startup's life — except the last one.
        Founders who need to close face fragmented advisors, unclear liability, and no
        standardized process.
      </p>

      <div>
        {/* Column headers */}
        <div className="hidden md:flex items-center justify-between pb-3 border-b border-rise-border mb-0">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span className="font-sans text-[10px] font-medium tracking-[0.2em] uppercase text-rise-muted-light w-32 md:w-40 shrink-0">Tool</span>
            <span className="font-sans text-[10px] font-medium tracking-[0.2em] uppercase text-rise-muted-light">Stage</span>
          </div>
          <span className="font-sans text-[10px] font-medium tracking-[0.2em] uppercase text-rise-muted-light">Infrastructure</span>
        </div>

        {stages.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-5 border-b border-rise-border">
            <div className="flex items-baseline gap-6 md:gap-10">
              <span className="font-sans text-xs font-medium tracking-[0.15em] uppercase w-32 md:w-40 shrink-0 text-rise-muted-light">
                {item.tool}
              </span>
              <span className="font-serif text-xl md:text-2xl font-normal text-rise-dark">
                {item.stage}
              </span>
            </div>
            <span className="font-sans text-xs font-light hidden md:block max-w-xs text-right text-rise-muted-light">
              {item.note}
            </span>
          </div>
        ))}

        {/* Gap row — the unserved stage: names the PROBLEM */}
        <div className="flex items-center justify-between py-5 border-b border-dashed border-rise-border/60 -mx-6 px-6 md:-mx-12 md:px-12 bg-rise-bg/40">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span className="font-sans text-xs font-medium tracking-[0.15em] uppercase w-32 md:w-40 shrink-0 text-rise-muted-light/40">
              No tool
            </span>
            <span className="font-serif text-xl md:text-2xl font-normal text-rise-muted-light/40 italic">
              Wind-Down & Exit
            </span>
          </div>
          <span className="font-sans text-xs font-light text-rise-muted-light/40 hidden md:block text-right">
            No infrastructure. No standard. No support.
          </span>
        </div>

        {/* Rise row — the ANSWER: different copy, no duplication */}
        <div className="flex items-center justify-between py-6 border-b-2 border-rise-coral/20 -mx-6 px-6 md:-mx-12 md:px-12 bg-rise-coral/[0.035]">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span className="font-sans text-xs font-semibold tracking-[0.15em] uppercase w-32 md:w-40 shrink-0 text-rise-coral">
              Rise
            </span>
            <span className="font-serif text-xl md:text-2xl font-normal text-rise-coral">
              One process. Clean close.
            </span>
          </div>
          <span className="font-sans text-xs font-light hidden md:block max-w-xs text-right text-rise-coral/80">
            Fixed-price. Fully orchestrated. LP-ready.
          </span>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Intake & Assessment',
      body: 'We evaluate your situation, identify stakeholders, and scope the wind-down.',
    },
    {
      number: '02',
      title: 'Rise coordinates legal, tax & operations',
      body: 'One process, one point of contact. Licensed professionals handle every workstream.',
    },
    {
      number: '03',
      title: 'Clean close, full documentation',
      body: 'Deregistration complete. LPs informed. Founders free to build again.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          How It Works
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Three steps to a clean close.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-rise-border">
        {steps.map((s) => (
          <div key={s.number} className="bg-rise-bg-warm p-8 md:p-10">
            <span className="font-sans text-xs font-medium tracking-[0.2em] text-rise-muted-light block mb-6">
              {s.number}
            </span>
            <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl mb-4 leading-tight">
              {s.title}
            </h3>
            <p className="font-sans font-light text-rise-muted text-sm leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FounderView() {
  const phases = ['Intake', 'Legal Setup', 'Creditor Notice', 'Sperrjahr', 'Distribution', 'Deregistration']
  const activePhase = 2

  const tasks = [
    { label: 'Shareholder resolution signed', status: 'done' },
    { label: 'Liquidator appointed', status: 'done' },
    { label: 'VSOP cleanup', status: 'active' },
    { label: 'D&O release letter', status: 'pending' },
    { label: 'Personal tax clearance', status: 'pending' },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-sans text-xs font-medium tracking-[0.15em] uppercase text-rise-muted-light mb-1">
            Active Case
          </p>
          <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl">
            TechCo GmbH — Wind-Down
          </h3>
        </div>
        <span className="font-sans text-xs font-medium bg-rise-coral/10 text-rise-coral px-3 py-1 rounded-full shrink-0">
          In Progress
        </span>
      </div>

      {/* Phase stepper */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center min-w-max">
          {phases.map((phase, i) => (
            <div key={phase} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-sans font-medium ${
                  i < activePhase ? 'bg-rise-dark text-white'
                  : i === activePhase ? 'bg-rise-coral text-white'
                  : 'bg-rise-border text-rise-muted-light'
                }`}>
                  {i < activePhase ? '✓' : i + 1}
                </div>
                <span className={`font-sans text-[10px] whitespace-nowrap ${i <= activePhase ? 'text-rise-dark' : 'text-rise-muted-light'}`}>
                  {phase}
                </span>
              </div>
              {i < phases.length - 1 && (
                <div className={`w-8 md:w-12 h-px mx-1 mb-5 shrink-0 ${i < activePhase ? 'bg-rise-dark' : 'bg-rise-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks + Team */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        <div className="flex-1">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-rise-border last:border-b-0">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                task.status === 'done' ? 'bg-rise-dark text-white'
                : task.status === 'active' ? 'bg-rise-coral/20 border border-rise-coral'
                : 'border border-rise-border'
              }`}>
                {task.status === 'done' && '✓'}
              </span>
              <span className={`font-sans text-sm ${
                task.status === 'done' ? 'text-rise-muted-light line-through'
                : task.status === 'active' ? 'text-rise-dark font-medium'
                : 'text-rise-muted'
              }`}>
                {task.label}
              </span>
              {task.status === 'active' && <span className="font-sans text-xs text-rise-coral ml-auto">in progress</span>}
              {task.status === 'pending' && <span className="font-sans text-xs text-rise-muted-light ml-auto">pending</span>}
            </div>
          ))}
        </div>

        <div className="md:w-48 bg-rise-bg rounded-md p-4 shrink-0">
          <p className="font-sans text-xs font-medium tracking-[0.12em] uppercase text-rise-muted-light mb-3">Team</p>
          <div className="space-y-2">
            {['Rise', 'Your Counsel', 'Tax Advisor'].map((member) => (
              <div key={member} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rise-border flex items-center justify-center text-[10px] font-medium text-rise-muted">
                  {member[0]}
                </span>
                <span className="font-sans text-xs text-rise-muted">{member}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function VCView() {
  const portfolio = [
    { name: 'TechCo GmbH', phase: 3, label: 'Creditor Notice', lpDocs: 'In review', status: 'In Progress', active: true },
    { name: 'Horizon SaaS GmbH', phase: 6, label: 'Deregistration', lpDocs: 'Ready', status: 'Closed', active: false },
    { name: 'MobileCo UG', phase: 2, label: 'Legal Setup', lpDocs: 'Pending', status: 'Legal Setup', active: false },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-sans text-xs font-medium tracking-[0.15em] uppercase text-rise-muted-light mb-1">
            Portfolio Overview
          </p>
          <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl">
            Acme Ventures — Wind-Down Cases
          </h3>
        </div>
        <span className="font-sans text-xs font-medium bg-rise-dark/8 text-rise-dark px-3 py-1 rounded-full shrink-0">
          3 Active
        </span>
      </div>

      {/* Portfolio table header */}
      <div className="hidden md:grid grid-cols-[1fr_160px_100px_100px] gap-4 px-0 mb-2">
        {['Company', 'Phase', 'LP Docs', 'Status'].map((h) => (
          <span key={h} className="font-sans text-[10px] font-medium tracking-[0.12em] uppercase text-rise-muted-light">
            {h}
          </span>
        ))}
      </div>

      <div className="space-y-0">
        {portfolio.map((co, i) => (
          <div key={i} className="border-t border-rise-border py-4 flex flex-col md:grid md:grid-cols-[1fr_160px_100px_100px] gap-2 md:gap-4 md:items-center">
            {/* Company */}
            <span className="font-sans text-sm font-medium text-rise-dark">{co.name}</span>

            {/* Phase bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-rise-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rise-dark transition-all"
                    style={{ width: `${(co.phase / 6) * 100}%` }}
                  />
                </div>
                <span className="font-sans text-[10px] text-rise-muted-light shrink-0">{co.phase}/6</span>
              </div>
              <span className="font-sans text-[10px] text-rise-muted-light">{co.label}</span>
            </div>

            {/* LP Docs */}
            <span className={`font-sans text-xs ${
              co.lpDocs === 'Ready' ? 'text-rise-sage font-medium'
              : co.lpDocs === 'In review' ? 'text-rise-coral'
              : 'text-rise-muted-light'
            }`}>
              {co.lpDocs === 'Ready' ? '✓ Ready' : co.lpDocs}
            </span>

            {/* Status */}
            <span className={`font-sans text-xs px-2 py-0.5 rounded-full w-fit ${
              co.status === 'Closed' ? 'bg-rise-dark/8 text-rise-dark'
              : co.status === 'In Progress' ? 'bg-rise-coral/10 text-rise-coral'
              : 'bg-rise-border text-rise-muted'
            }`}>
              {co.status}
            </span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="mt-6 pt-6 border-t border-rise-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-6">
          {[
            { label: 'Cases managed', value: '3' },
            { label: 'LP reports ready', value: '1 of 3' },
            { label: 'Est. close', value: 'Q3 2025' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-rise-muted-light">{stat.label}</p>
              <p className="font-sans text-sm font-medium text-rise-dark mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
        <span className="font-sans text-xs text-rise-muted-light">Fixed-price per case</span>
      </div>
    </div>
  )
}

function Platform() {
  const [view, setView] = useState('founder')

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          The Platform
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          One process. Full visibility.
        </h2>
      </div>

      {/* Dashboard mockup */}
      <div className="rounded-lg border border-rise-border shadow-sm overflow-hidden bg-rise-bg-warm">
        {/* Chrome bar */}
        <div className="border-b border-rise-border px-5 py-3 flex items-center justify-between bg-rise-bg">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rise-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-rise-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-rise-border" />
            </div>
            <span className="font-sans text-xs text-rise-muted-light ml-1">
              {view === 'founder' ? 'rise.app/cases/techco' : 'rise.app/portfolio/acme-ventures'}
            </span>
          </div>

          {/* Perspective toggle */}
          <div className="flex items-center gap-1 bg-rise-bg-warm border border-rise-border rounded-md p-0.5">
            <button
              onClick={() => setView('founder')}
              className={`font-sans text-xs px-3 py-1.5 rounded transition-all duration-200 ${
                view === 'founder'
                  ? 'bg-white text-rise-dark shadow-sm font-medium'
                  : 'text-rise-muted-light hover:text-rise-muted'
              }`}
            >
              Founder
            </button>
            <button
              onClick={() => setView('vc')}
              className={`font-sans text-xs px-3 py-1.5 rounded transition-all duration-200 ${
                view === 'vc'
                  ? 'bg-white text-rise-dark shadow-sm font-medium'
                  : 'text-rise-muted-light hover:text-rise-muted'
              }`}
            >
              VC Fund
            </button>
          </div>
        </div>

        {view === 'founder' ? <FounderView /> : <VCView />}
      </div>

      <p className="font-sans font-light text-rise-muted text-sm mt-6 text-center">
        {view === 'founder'
          ? 'Your case. Every step tracked. Nothing falls through the cracks.'
          : 'Portfolio hygiene at scale. LP-ready documentation per case.'}
      </p>
    </section>
  )
}

function WhoWeServe() {
  const customers = [
    {
      label: 'VC Funds',
      description:
        'Portfolio hygiene without GP bandwidth. Fixed-price, full documentation, LP-ready reporting.',
    },
    {
      label: 'Founders',
      description:
        'Close with structure and dignity. Protect yourself legally. Build again with a clean record.',
    },
    {
      label: 'Legal Counsel',
      description:
        'An execution partner for operational workstreams, so you can focus on what requires legal expertise.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          Who We Serve
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Built for the institutions that make the ecosystem work.
        </h2>
      </div>

      <div className="space-y-0">
        {customers.map((c, i) => (
          <div
            key={i}
            className="flex flex-col md:flex-row md:items-start py-10 border-t border-rise-border gap-4 md:gap-20"
          >
            <span className="font-serif text-rise-dark text-xl md:text-2xl md:w-56 shrink-0">
              {c.label}
            </span>
            <p className="font-sans font-light text-rise-muted text-base leading-relaxed max-w-lg">
              {c.description}
            </p>
          </div>
        ))}
        <div className="border-t border-rise-border" />
      </div>
    </section>
  )
}

function Credibility() {
  return (
    <section className="py-20 md:py-24 px-6 md:px-12 max-w-6xl mx-auto text-center">
      <p className="font-sans font-light text-rise-muted text-base">
        Built by legal and operations professionals. Based in Frankfurt.
      </p>
    </section>
  )
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const items = [
    {
      q: 'How long does a wind-down take in Germany?',
      a: 'A solvent GmbH liquidation typically takes 12–18 months, primarily due to the mandatory one-year creditor protection period (Sperrjahr). Rise manages the full timeline — from the shareholder resolution through to final deregistration.',
    },
    {
      q: 'What does Rise handle vs. what does my lawyer handle?',
      a: 'Rise coordinates the entire process: timelines, stakeholder communication, document workflows, and operational execution. Legal and tax work is performed by licensed professionals — your existing counsel or partners from our network. Rise is the orchestration layer, not a law firm.',
    },
    {
      q: 'Who typically pays for a Rise engagement?',
      a: 'It depends on the situation. In many cases, the VC fund sponsors the wind-down as part of portfolio management. In others, the company itself pays from remaining capital. We structure engagements to fit your setup.',
    },
    {
      q: "What's included in a Rise engagement?",
      a: 'A standard engagement covers: shareholder resolution, liquidator coordination, creditor notification, commercial register filings, VSOP/ESOP cleanup, tax coordination, LP documentation, and final deregistration. We scope each case individually.',
    },
    {
      q: 'Is Rise a law firm?',
      a: 'No. Rise is a tech-enabled orchestration platform for structured company transitions. All legal and tax work is performed by licensed professionals. Rise coordinates the process, manages timelines, and ensures nothing falls through the cracks.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          Common Questions
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          What you need to know.
        </h2>
      </div>

      <div>
        {items.map((item, i) => {
          const isOpen = openIndex === i
          return (
            <div key={i} className="border-t border-rise-border">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between py-6 text-left gap-6 group"
                aria-expanded={isOpen}
              >
                <span className="font-sans font-medium text-rise-dark text-base group-hover:text-rise-coral transition-colors duration-200">
                  {item.q}
                </span>
                <span className="shrink-0 w-5 h-5 rounded-full border border-rise-border flex items-center justify-center text-rise-muted-light text-sm transition-colors duration-200 group-hover:border-rise-coral group-hover:text-rise-coral">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <p className="font-sans font-light text-rise-muted text-base leading-relaxed pb-6 max-w-3xl">
                  {item.a}
                </p>
              )}
            </div>
          )
        })}
        <div className="border-t border-rise-border" />
      </div>
    </section>
  )
}

function Closer() {
  return (
    <section className="bg-rise-dark">
      <div className="py-24 md:py-36 px-6 md:px-12 max-w-6xl mx-auto text-center">
        <p className="font-serif font-normal text-white text-4xl md:text-5xl lg:text-6xl leading-tight mb-12 tracking-tight">
          Close clean. Build again.
        </p>
        <p className="font-sans font-light text-rise-muted-light text-base mb-10">
          Rise is active in Europe.
        </p>
        <a
          href="mailto:hello@risestartup.eu"
          className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-white hover:text-rise-dark transition-colors duration-200"
        >
          Get in touch
        </a>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-serif text-rise-dark tracking-logo text-base uppercase">
            Rise
          </span>
          <span className="text-rise-border">·</span>
          <span className="font-sans font-light text-rise-muted-light text-xs">
            Structured Transitions
          </span>
          <span className="text-rise-border hidden md:block">·</span>
          <span className="font-sans font-light text-rise-muted-light text-xs hidden md:block">
            Frankfurt
          </span>
        </div>
        <a
          href="mailto:hello@risestartup.eu"
          className="font-sans font-light text-xs text-rise-muted hover:text-rise-coral transition-colors duration-200"
        >
          hello@risestartup.eu
        </a>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="bg-rise-bg-warm min-h-screen font-sans">
      <Nav />
      <main>
        <Hero />
        <Divider />
        <Problem />
        <Divider />
        <HowItWorks />
        <Divider />
        <Platform />
        <Divider />
        <WhoWeServe />
        <Credibility />
        <Divider />
        <FAQ />
        <Closer />
      </main>
      <Footer />
    </div>
  )
}
