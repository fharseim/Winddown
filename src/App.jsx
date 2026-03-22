import { useState, useEffect } from 'react'
import HoldingRechner from './rise_holding_rechner'
function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-rise-bg-warm/95 backdrop-blur-sm border-b border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <span className="font-serif text-rise-dark tracking-logo text-2xl uppercase">
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

      {/* The served stages — a complete, tidy table */}
      <div>
        <div className="hidden md:flex items-center justify-between pb-3 border-b border-rise-border">
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

      </div>

      {/* The gap — Wind-Down & Exit, last row, shown as absence */}
      <div className="flex items-center justify-between py-5 border-b border-dashed border-rise-border/50">
        <div className="flex items-baseline gap-6 md:gap-10">
          <span className="w-32 md:w-40 shrink-0 font-sans text-xs text-rise-muted-light/30 tracking-widest">
            ———
          </span>
          <span className="font-serif text-xl md:text-2xl font-normal text-rise-muted-light/30 italic">
            Wind-Down & Exit
          </span>
        </div>
        <span className="font-sans text-xs text-rise-muted-light/30 hidden md:block italic">
          No infrastructure exists.
        </span>
      </div>

      {/* Arrow connector — full-width bridge from problem to solution */}
      <div className="relative flex items-center justify-center py-10 -mx-6 md:-mx-12">
        <div className="absolute inset-x-0 top-1/2 h-px bg-rise-border" />
        <div className="relative flex flex-col items-center gap-2.5 bg-rise-bg-warm px-8">
          <div className="flex flex-col items-center">
            <div className="w-px h-6 bg-rise-coral/60" />
            <svg width="14" height="10" viewBox="0 0 14 10" className="text-rise-coral" fill="currentColor">
              <path d="M7 10L0 0h14L7 10z" />
            </svg>
          </div>
          <span className="font-sans text-[10px] font-semibold tracking-[0.22em] uppercase text-rise-coral">
            Rise fills this gap
          </span>
        </div>
      </div>

      {/* Rise — the answer */}
      <div className="-mx-6 md:-mx-12 px-6 md:px-12 py-8 md:py-10 border-l-4 border-rise-coral bg-rise-coral/[0.04]">
        <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-rise-coral mb-3">
          Rise
        </p>
        <p className="font-serif font-normal text-rise-dark text-2xl md:text-3xl leading-tight">
          The missing infrastructure, built.
        </p>
        <p className="font-sans font-light text-rise-muted text-sm mt-3 max-w-lg leading-relaxed">
          One process. One point of contact. Fixed-price, fully orchestrated wind-downs
          for European startups and their investors.
        </p>
        <div className="flex flex-col gap-2.5 mt-5">
          {[
            'Fixed-price per engagement',
            'Licensed legal & tax professionals',
            'LP-ready documentation included',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-rise-coral shrink-0" />
              <span className="font-sans text-xs text-rise-muted">{item}</span>
            </div>
          ))}
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
      duration: '1–2 weeks',
      body: 'Rise reviews your company structure, outstanding liabilities, remaining capital, and stakeholder map. We identify the right liquidation path and produce a scoped wind-down plan — so you know exactly what happens, in what order, and at what cost.',
      deliverables: [
        'Liability & creditor assessment',
        'Stakeholder map (founders, investors, employees)',
        'Scoped wind-down plan with timeline',
        'Fixed-price engagement proposal',
      ],
    },
    {
      number: '02',
      title: 'Rise orchestrates every workstream',
      duration: '3–12 months',
      body: 'Rise acts as your single point of contact across all workstreams. We coordinate legal counsel, tax advisors, and additional specialists — managing timelines, documents, and communications so nothing is dropped, delayed, or mishandled.',
      deliverables: [
        'Shareholder resolution & liquidator appointment',
        'Creditor notification (Bundesanzeiger)',
        'Sperrjahr management & monitoring',
        'VSOP / ESOP cleanup',
        'Banking, HR, and regulatory filings',
        'Ongoing LP and stakeholder updates',
      ],
    },
    {
      number: '03',
      title: 'Clean close, full documentation',
      duration: 'Final 4–8 weeks',
      body: 'Once the Sperrjahr ends, Rise handles the final asset distribution, commercial register deregistration, and prepares a complete close-out package. Founders receive a clean record. LPs receive documentation ready for their own audit and reporting.',
      deliverables: [
        'Final distribution to shareholders',
        'Commercial register deregistration',
        'Final tax clearance certificate',
        'D&O liability release documentation',
        'LP reporting package (audit-ready)',
        'Full case archive for founders & investors',
      ],
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-14">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          How It Works
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Three steps to a clean close.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-rise-border">
        {steps.map((s) => (
          <div key={s.number} className="bg-rise-bg-warm p-8 md:p-10 flex flex-col">
            <div className="flex items-center justify-between mb-7">
              <span className="font-sans text-xs font-medium tracking-[0.2em] text-rise-muted-light">
                {s.number}
              </span>
              <span className="font-sans text-[10px] text-rise-muted-light bg-rise-border px-2 py-1 rounded">
                {s.duration}
              </span>
            </div>
            <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl mb-4 leading-tight">
              {s.title}
            </h3>
            <p className="font-sans font-light text-rise-muted text-sm leading-relaxed mb-7">
              {s.body}
            </p>
            <div className="mt-auto pt-6 border-t border-rise-border space-y-2">
              <p className="font-sans text-[10px] font-semibold tracking-[0.16em] uppercase text-rise-muted-light mb-3">
                Included
              </p>
              {s.deliverables.map((d) => (
                <div key={d} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-rise-coral shrink-0 mt-1.5" />
                  <span className="font-sans text-xs text-rise-muted leading-snug">{d}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TaskRow({ task }) {
  const assigneeStyle = {
    'Rise':        'bg-rise-coral/10 text-rise-coral',
    'You':         'bg-rise-dark/8 text-rise-dark font-medium',
    'Counsel':     'bg-rise-border text-rise-muted',
    'Tax Advisor': 'bg-rise-border text-rise-muted',
  }
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-rise-border last:border-b-0">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
        task.status === 'done'   ? 'bg-rise-dark text-white'
        : task.status === 'active' ? 'border-2 border-rise-coral bg-rise-coral/10'
        : 'border border-rise-border'
      }`}>
        {task.status === 'done' && '✓'}
      </span>
      <span className={`font-sans text-xs flex-1 ${
        task.status === 'done'   ? 'text-rise-muted-light line-through'
        : task.status === 'active' ? 'text-rise-dark font-medium'
        : 'text-rise-muted'
      }`}>
        {task.label}
      </span>
      <span className={`font-sans text-[10px] px-1.5 py-0.5 rounded shrink-0 ${assigneeStyle[task.assignee] || 'bg-rise-border text-rise-muted'}`}>
        {task.assignee}
      </span>
      {task.status === 'active' && (
        <span className="font-sans text-[10px] text-rise-coral shrink-0 ml-1">● active</span>
      )}
    </div>
  )
}

function FounderView() {
  const phases = ['Intake', 'Legal Setup', 'Creditor Notice', 'Sperrjahr', 'Distribution', 'Deregistration']
  const activePhase = 2

  const workstreams = [
    {
      label: 'Legal',
      tasks: [
        { label: 'Shareholder resolution signed', status: 'done', assignee: 'Rise' },
        { label: 'Liquidator appointed & registered', status: 'done', assignee: 'Rise' },
        { label: 'VSOP / ESOP cleanup', status: 'active', assignee: 'You' },
        { label: 'D&O release letter', status: 'pending', assignee: 'You' },
        { label: 'Commercial register filing', status: 'pending', assignee: 'Rise' },
      ],
    },
    {
      label: 'Tax',
      tasks: [
        { label: 'Tax advisor coordinated', status: 'done', assignee: 'Rise' },
        { label: 'Interim tax return filed', status: 'active', assignee: 'Tax Advisor' },
        { label: 'Final tax clearance', status: 'pending', assignee: 'Tax Advisor' },
      ],
    },
    {
      label: 'Stakeholder Communications',
      tasks: [
        { label: 'LP notification sent', status: 'done', assignee: 'Rise' },
        { label: 'Creditor notice in Bundesanzeiger', status: 'done', assignee: 'Rise' },
        { label: 'Final investor report', status: 'pending', assignee: 'Rise' },
      ],
    },
  ]

  const keyDates = [
    { label: 'Creditor notice published', date: 'Mar 15, 2025' },
    { label: 'Sperrjahr ends', date: 'Mar 15, 2026' },
    { label: 'Est. deregistration', date: 'May 2026' },
  ]

  const docs = [
    { label: 'VSOP schedule', note: 'review request' },
    { label: 'D&O release letter', note: 'signature required' },
  ]

  return (
    <div className="p-5 md:p-7">
      {/* Case header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-sans text-[10px] font-medium tracking-[0.18em] uppercase text-rise-muted-light mb-1">
            Active Case
          </p>
          <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl leading-tight">
            TechCo GmbH — Wind-Down
          </h3>
        </div>
        <span className="font-sans text-xs font-medium bg-rise-coral/10 text-rise-coral px-3 py-1 rounded-full shrink-0 ml-4">
          In Progress
        </span>
      </div>

      {/* Phase stepper */}
      <div className="mb-7 overflow-x-auto pb-1">
        <div className="flex items-center min-w-max">
          {phases.map((phase, i) => (
            <div key={phase} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-sans font-semibold ${
                  i < activePhase  ? 'bg-rise-dark text-white'
                  : i === activePhase ? 'bg-rise-coral text-white'
                  : 'bg-rise-border text-rise-muted-light'
                }`}>
                  {i < activePhase ? '✓' : i + 1}
                </div>
                <span className={`font-sans text-[9px] whitespace-nowrap ${i <= activePhase ? 'text-rise-dark' : 'text-rise-muted-light'}`}>
                  {phase}
                </span>
              </div>
              {i < phases.length - 1 && (
                <div className={`w-7 md:w-10 h-px mx-1 mb-4 shrink-0 ${i < activePhase ? 'bg-rise-dark' : 'bg-rise-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next action callout */}
      <div className="flex items-start gap-3 bg-rise-coral/[0.06] border border-rise-coral/20 rounded-md px-4 py-3 mb-6">
        <span className="text-rise-coral text-xs mt-0.5 shrink-0">●</span>
        <div>
          <p className="font-sans text-xs font-medium text-rise-dark">Action required from you</p>
          <p className="font-sans text-xs text-rise-muted mt-0.5">
            Review and sign the VSOP schedule — Rise is waiting before proceeding with legal cleanup.
          </p>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Left: workstreams */}
        <div className="flex-1 space-y-5 min-w-0">
          {workstreams.map((ws) => (
            <div key={ws.label}>
              <p className="font-sans text-[10px] font-semibold tracking-[0.16em] uppercase text-rise-muted-light mb-1.5 pb-1.5 border-b border-rise-border">
                {ws.label}
              </p>
              {ws.tasks.map((task, i) => (
                <TaskRow key={i} task={task} />
              ))}
            </div>
          ))}
        </div>

        {/* Right: sidebar */}
        <div className="md:w-52 shrink-0 space-y-5">
          {/* Key Dates */}
          <div className="bg-rise-bg rounded-md p-4">
            <p className="font-sans text-[10px] font-semibold tracking-[0.16em] uppercase text-rise-muted-light mb-3">
              Key Dates
            </p>
            <div className="space-y-3">
              {keyDates.map((kd) => (
                <div key={kd.label}>
                  <p className="font-sans text-[10px] text-rise-muted-light leading-tight">{kd.label}</p>
                  <p className="font-sans text-xs font-medium text-rise-dark mt-0.5">{kd.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="bg-rise-bg rounded-md p-4">
            <p className="font-sans text-[10px] font-semibold tracking-[0.16em] uppercase text-rise-muted-light mb-3">
              Team
            </p>
            <div className="space-y-2">
              {[
                { name: 'Rise', role: 'Orchestration' },
                { name: 'Your Counsel', role: 'Legal' },
                { name: 'Tax Advisor', role: 'Tax & Filings' },
              ].map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rise-border flex items-center justify-center text-[10px] font-medium text-rise-muted shrink-0">
                    {m.name[0]}
                  </span>
                  <div>
                    <p className="font-sans text-xs text-rise-dark leading-none">{m.name}</p>
                    <p className="font-sans text-[10px] text-rise-muted-light mt-0.5">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-rise-bg rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-sans text-[10px] font-semibold tracking-[0.16em] uppercase text-rise-muted-light">
                Documents
              </p>
              <span className="font-sans text-[10px] font-medium bg-rise-coral/10 text-rise-coral px-1.5 py-0.5 rounded">
                2 pending
              </span>
            </div>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.label} className="flex items-start gap-2">
                  <span className="text-rise-muted-light text-xs mt-0.5 shrink-0">▸</span>
                  <div>
                    <p className="font-sans text-xs text-rise-dark leading-tight">{doc.label}</p>
                    <p className="font-sans text-[10px] text-rise-coral mt-0.5">{doc.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VCView() {
  const portfolio = [
    {
      name: 'TechCo GmbH',
      phase: 3, phaseLabel: 'Creditor Notice',
      lpDocs: 'In review', writeOff: 'Pending',
      nextMilestone: 'Sperrjahr starts Apr 2025',
      status: 'In Progress',
    },
    {
      name: 'Horizon SaaS GmbH',
      phase: 6, phaseLabel: 'Complete',
      lpDocs: 'Ready', writeOff: 'Confirmed',
      nextMilestone: 'Closed Mar 2025',
      status: 'Closed',
    },
    {
      name: 'MobileCo UG',
      phase: 2, phaseLabel: 'Legal Setup',
      lpDocs: 'Pending', writeOff: 'Pending',
      nextMilestone: 'Creditor notice due Jun 2025',
      status: 'Legal Setup',
    },
  ]

  const activity = [
    { company: 'Horizon SaaS GmbH', event: 'Final LP report ready for download', time: '2d ago' },
    { company: 'TechCo GmbH', event: 'Creditor notice published in Bundesanzeiger', time: '1w ago' },
    { company: 'MobileCo UG', event: 'Liquidator appointed & registered', time: '3w ago' },
    { company: 'TechCo GmbH', event: 'VSOP cleanup initiated, awaiting founder sign-off', time: '1mo ago' },
  ]

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-sans text-[10px] font-medium tracking-[0.18em] uppercase text-rise-muted-light mb-1">
            Portfolio Overview
          </p>
          <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl leading-tight">
            Acme Ventures — Wind-Down Cases
          </h3>
        </div>
        <span className="font-sans text-xs font-medium bg-rise-dark/[0.06] text-rise-dark px-3 py-1 rounded-full shrink-0 ml-4">
          Q1 2025
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Cases', value: '3', sub: '2 active · 1 closed' },
          { label: 'LP Reports', value: '1 / 3', sub: '1 in review · 1 pending' },
          { label: 'Write-offs', value: '1 / 3', sub: 'confirmed this quarter' },
        ].map((s) => (
          <div key={s.label} className="bg-rise-bg rounded-md px-4 py-3">
            <p className="font-sans text-[10px] font-medium tracking-[0.14em] uppercase text-rise-muted-light mb-1">
              {s.label}
            </p>
            <p className="font-serif text-xl text-rise-dark leading-none">{s.value}</p>
            <p className="font-sans text-[10px] text-rise-muted-light mt-1 leading-tight">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Portfolio table */}
      <div className="hidden md:grid grid-cols-[1fr_130px_90px_90px_180px] gap-3 pb-2 mb-0.5">
        {['Company', 'Phase', 'LP Report', 'Write-off', 'Next milestone'].map((h) => (
          <span key={h} className="font-sans text-[10px] font-semibold tracking-[0.14em] uppercase text-rise-muted-light">
            {h}
          </span>
        ))}
      </div>

      <div>
        {portfolio.map((co, i) => (
          <div
            key={i}
            className="border-t border-rise-border py-3.5 flex flex-col md:grid md:grid-cols-[1fr_130px_90px_90px_180px] gap-2 md:gap-3 md:items-center"
          >
            {/* Company */}
            <div>
              <span className="font-sans text-sm font-medium text-rise-dark">{co.name}</span>
              <span className={`md:hidden font-sans text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${
                co.status === 'Closed'      ? 'bg-rise-dark/[0.06] text-rise-dark'
                : co.status === 'In Progress' ? 'bg-rise-coral/10 text-rise-coral'
                : 'bg-rise-border text-rise-muted'
              }`}>{co.status}</span>
            </div>

            {/* Phase bar */}
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="flex-1 h-1 bg-rise-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${co.status === 'Closed' ? 'bg-rise-dark' : 'bg-rise-coral'}`}
                    style={{ width: `${(co.phase / 6) * 100}%` }}
                  />
                </div>
                <span className="font-sans text-[10px] text-rise-muted-light shrink-0">{co.phase}/6</span>
              </div>
              <span className="font-sans text-[10px] text-rise-muted-light">{co.phaseLabel}</span>
            </div>

            {/* LP Report */}
            <span className={`font-sans text-xs font-medium ${
              co.lpDocs === 'Ready'     ? 'text-rise-sage'
              : co.lpDocs === 'In review' ? 'text-rise-coral'
              : 'text-rise-muted-light'
            }`}>
              {co.lpDocs === 'Ready' ? '✓ Ready' : co.lpDocs}
            </span>

            {/* Write-off */}
            <span className={`font-sans text-xs ${
              co.writeOff === 'Confirmed' ? 'text-rise-sage font-medium' : 'text-rise-muted-light'
            }`}>
              {co.writeOff === 'Confirmed' ? '✓ Confirmed' : co.writeOff}
            </span>

            {/* Next milestone */}
            <span className="font-sans text-[11px] text-rise-muted leading-tight">{co.nextMilestone}</span>
          </div>
        ))}
      </div>

      {/* Activity feed */}
      <div className="mt-6 pt-5 border-t border-rise-border">
        <p className="font-sans text-[10px] font-semibold tracking-[0.16em] uppercase text-rise-muted-light mb-3">
          Recent Activity
        </p>
        <div>
          {activity.map((a, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-rise-border last:border-b-0">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-1 h-1 rounded-full bg-rise-muted-light shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <span className="font-sans text-[11px] text-rise-muted-light mr-1.5">{a.company}</span>
                  <span className="font-sans text-[11px] text-rise-dark">{a.event}</span>
                </div>
              </div>
              <span className="font-sans text-[10px] text-rise-muted-light shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
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
  const [page, setPage] = useState(window.location.hash)
  useEffect(() => {
    const handler = () => setPage(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  if (page === '#rechner') return <HoldingRechner />

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
