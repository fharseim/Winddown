import { useState } from 'react'

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-rise-bg-warm/95 backdrop-blur-sm border-b border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <a href="/" className="font-serif text-rise-dark tracking-logo text-2xl uppercase hover:text-rise-coral transition-colors duration-200">
          Rise
        </a>
        <div className="flex items-center gap-6">
          <a
            href="/rechner"
            className="text-sm font-sans font-medium text-rise-muted hover:text-rise-dark transition-colors duration-200 tracking-wide"
          >
            Kosten-Rechner
          </a>
          <a
            href="mailto:hello@risestartup.eu"
            className="text-sm font-sans font-medium text-rise-muted hover:text-rise-dark transition-colors duration-200 tracking-wide"
          >
            Kontakt
          </a>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-36 pb-24 md:pt-44 md:pb-32 px-6 md:px-12 max-w-6xl mx-auto">
      <h1 className="font-serif font-normal text-rise-dark text-[2.75rem] md:text-[3.5rem] lg:text-[3.75rem] leading-[1.08] tracking-tight mb-8">
        Ihre GmbH sauber auflösen.
        <br />
        <span className="italic text-rise-muted">Ein Ansprechpartner.</span>
      </h1>
      <p className="font-sans font-light text-rise-muted text-lg md:text-xl leading-relaxed max-w-xl mb-3">
        Rise übernimmt den gesamten Abwicklungsprozess — Anwälte, Steuerberater,
        Handelsregister, Sperrjahr. Sie müssen nichts selbst koordinieren.
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-10">
        <a
          href="/intake"
          className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-rise-dark transition-colors duration-200"
        >
          Kostenlose Ersteinschätzung anfragen
        </a>
        <span className="font-sans text-xs text-rise-muted-light">
          Antwort innerhalb von 48 Stunden
        </span>
      </div>
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
    { tool: 'Stripe Atlas', stage: 'Gründung', note: 'Gesellschaft, Banking, Compliance' },
    { tool: 'Carta', stage: 'Cap Table & Equity', note: 'Beteiligungen, Optionen, Investoren' },
    { tool: 'Notion / Linear', stage: 'Betrieb', note: 'Produkt, Hiring, Roadmap' },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-4">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-5">
          Die Lücke
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-4xl md:text-5xl leading-[1.08] tracking-tight max-w-2xl">
          Jede Phase ist abgedeckt.
          <br />
          <span className="italic text-rise-muted">Eine nicht.</span>
        </h2>
      </div>

      <p className="font-sans font-light text-rise-muted text-base leading-relaxed max-w-xl mb-14">
        Für jede Phase eines Startups gibt es Infrastruktur — nur nicht für die letzte.
        Gründer, die ihre GmbH auflösen müssen, stehen vor fragmentierten Beratern,
        unklarer Haftung und keinem standardisierten Prozess.
      </p>

      {/* The served stages */}
      <div>
        <div className="hidden md:flex items-center justify-between pb-3 border-b border-rise-border">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span className="font-sans text-[10px] font-medium tracking-[0.2em] uppercase text-rise-muted-light w-32 md:w-40 shrink-0">Tool</span>
            <span className="font-sans text-[10px] font-medium tracking-[0.2em] uppercase text-rise-muted-light">Phase</span>
          </div>
          <span className="font-sans text-[10px] font-medium tracking-[0.2em] uppercase text-rise-muted-light">Infrastruktur</span>
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

      {/* The gap row */}
      <div className="flex items-center justify-between py-5 border-b border-dashed border-rise-border/50">
        <div className="flex items-baseline gap-6 md:gap-10">
          <span className="w-32 md:w-40 shrink-0 font-sans text-xs text-rise-muted-light/30 tracking-widest">
            ———
          </span>
          <span className="font-serif text-xl md:text-2xl font-normal text-rise-muted-light/30 italic">
            Wind-Down & Auflösung
          </span>
        </div>
        <span className="font-sans text-xs text-rise-muted-light/30 hidden md:block italic">
          Keine Infrastruktur vorhanden.
        </span>
      </div>

      {/* Arrow connector */}
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
            Rise schließt diese Lücke
          </span>
        </div>
      </div>

      {/* Rise — the answer */}
      <div className="-mx-6 md:-mx-12 px-6 md:px-12 py-8 md:py-10 border-l-4 border-rise-coral bg-rise-coral/[0.04]">
        <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-rise-coral mb-3">
          Rise
        </p>
        <p className="font-serif font-normal text-rise-dark text-2xl md:text-3xl leading-tight">
          Die fehlende Infrastruktur — jetzt verfügbar.
        </p>
        <p className="font-sans font-light text-rise-muted text-sm mt-3 max-w-lg leading-relaxed">
          Ein Prozess. Ein Ansprechpartner. Festpreis, vollständig orchestrierte
          GmbH-Abwicklungen für europäische Startups und ihre Investoren.
        </p>
        <div className="flex flex-col gap-2.5 mt-5">
          {[
            'Festpreis pro Beauftragung',
            'Zugelassene Rechts- und Steuerexperten',
            'LP-fähige Dokumentation inklusive',
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
      title: 'Intake & Analyse',
      duration: '1–2 Wochen',
      body: 'Rise prüft Ihre Unternehmensstruktur, offene Verbindlichkeiten, verbleibendes Kapital und Stakeholder. Wir ermitteln den richtigen Liquidationspfad und erstellen einen strukturierten Abwicklungsplan — damit Sie wissen, was wann und zu welchen Kosten passiert.',
      deliverables: [
        'Verbindlichkeiten- und Gläubigeranalyse',
        'Stakeholder-Übersicht (Gründer, Investoren, Mitarbeiter)',
        'Abwicklungsplan mit Zeitplan',
        'Fixpreis-Angebot',
      ],
    },
    {
      number: '02',
      title: 'Rise koordiniert alle Workstreams',
      duration: '3–12 Monate',
      body: 'Rise ist Ihr zentraler Ansprechpartner für alle Workstreams. Wir koordinieren Rechtsanwälte, Steuerberater und weitere Spezialisten — und stellen sicher, dass Fristen eingehalten, Dokumente vollständig und Kommunikation lückenlos ist.',
      deliverables: [
        'Gesellschafterversammlung & Liquidatorbestellung',
        'Gläubigerbekanntmachung (Bundesanzeiger)',
        'Sperrjahr-Management & Überwachung',
        'VSOP / ESOP-Bereinigung',
        'Banking, HR und Behördenmeldungen',
        'Regelmäßige LP- und Stakeholder-Updates',
      ],
    },
    {
      number: '03',
      title: 'Sauberer Abschluss, vollständige Dokumentation',
      duration: 'Abschluss in 4–8 Wochen',
      body: 'Nach Ablauf des Sperrjahrs übernimmt Rise die finale Vermögensverteilung, die Löschung im Handelsregister und stellt ein vollständiges Abschlusspaket zusammen. Gründer erhalten eine saubere Akte — Investoren LP-Dokumentation für ihr eigenes Reporting.',
      deliverables: [
        'Finale Ausschüttung an Gesellschafter',
        'Löschung im Handelsregister',
        'Steuerliche Unbedenklichkeitsbescheinigung',
        'D&O-Haftungsfreistellung',
        'LP-Reporting-Paket (prüfungsfertig)',
        'Vollständiges Case-Archiv für Gründer & Investoren',
      ],
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-14">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          So funktioniert es
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Drei Schritte zur sauberen Auflösung.
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
                Enthalten
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
    'Rise':            'bg-rise-coral/10 text-rise-coral',
    'Sie':             'bg-rise-dark/8 text-rise-dark font-medium',
    'Anwalt':          'bg-rise-border text-rise-muted',
    'Steuerberater':   'bg-rise-border text-rise-muted',
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
        <span className="font-sans text-[10px] text-rise-coral shrink-0 ml-1">● aktiv</span>
      )}
    </div>
  )
}

function FounderView() {
  const phases = ['Intake', 'Rechtliches', 'Gläubigerbekanntm.', 'Sperrjahr', 'Verteilung', 'Löschung']
  const activePhase = 2

  const workstreams = [
    {
      label: 'Rechtliches',
      tasks: [
        { label: 'Gesellschafterversammlung unterzeichnet', status: 'done', assignee: 'Rise' },
        { label: 'Liquidator bestellt & eingetragen', status: 'done', assignee: 'Rise' },
        { label: 'VSOP / ESOP-Bereinigung', status: 'active', assignee: 'Sie' },
        { label: 'D&O-Haftungsfreistellungsschreiben', status: 'pending', assignee: 'Sie' },
        { label: 'Handelsregistereintragung', status: 'pending', assignee: 'Rise' },
      ],
    },
    {
      label: 'Steuer',
      tasks: [
        { label: 'Steuerberater koordiniert', status: 'done', assignee: 'Rise' },
        { label: 'Zwischensteuererklärung eingereicht', status: 'active', assignee: 'Steuerberater' },
        { label: 'Steuerliche Unbedenklichkeit', status: 'pending', assignee: 'Steuerberater' },
      ],
    },
    {
      label: 'Stakeholder-Kommunikation',
      tasks: [
        { label: 'LP-Benachrichtigung versandt', status: 'done', assignee: 'Rise' },
        { label: 'Gläubigerbekanntmachung (Bundesanzeiger)', status: 'done', assignee: 'Rise' },
        { label: 'Finaler Investorenbericht', status: 'pending', assignee: 'Rise' },
      ],
    },
  ]

  const keyDates = [
    { label: 'Gläubigerbekanntmachung', date: '15. März 2025' },
    { label: 'Sperrjahr endet', date: '15. März 2026' },
    { label: 'Voraussichtliche Löschung', date: 'Mai 2026' },
  ]

  const docs = [
    { label: 'VSOP-Plan', note: 'Prüfung ausstehend' },
    { label: 'D&O-Freistellungsschreiben', note: 'Unterschrift erforderlich' },
  ]

  return (
    <div className="p-5 md:p-7">
      {/* Case header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-sans text-[10px] font-medium tracking-[0.18em] uppercase text-rise-muted-light mb-1">
            Aktiver Fall
          </p>
          <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl leading-tight">
            TechCo GmbH — Abwicklung
          </h3>
        </div>
        <span className="font-sans text-xs font-medium bg-rise-coral/10 text-rise-coral px-3 py-1 rounded-full shrink-0 ml-4">
          In Bearbeitung
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
          <p className="font-sans text-xs font-medium text-rise-dark">Ihre Handlung erforderlich</p>
          <p className="font-sans text-xs text-rise-muted mt-0.5">
            Bitte prüfen und unterzeichnen Sie den VSOP-Plan — Rise wartet darauf, um mit der rechtlichen Bereinigung fortzufahren.
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
              Wichtige Termine
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
                { name: 'Rise', role: 'Orchestrierung' },
                { name: 'Ihr Anwalt', role: 'Rechtliches' },
                { name: 'Steuerberater', role: 'Steuer & Filings' },
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
                Dokumente
              </p>
              <span className="font-sans text-[10px] font-medium bg-rise-coral/10 text-rise-coral px-1.5 py-0.5 rounded">
                2 offen
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
      phase: 3, phaseLabel: 'Gläubigerbekanntm.',
      lpDocs: 'In Prüfung', writeOff: 'Ausstehend',
      nextMilestone: 'Sperrjahr beginnt Apr 2025',
      status: 'In Bearbeitung',
    },
    {
      name: 'Horizon SaaS GmbH',
      phase: 6, phaseLabel: 'Abgeschlossen',
      lpDocs: 'Bereit', writeOff: 'Bestätigt',
      nextMilestone: 'Abgeschlossen März 2025',
      status: 'Abgeschlossen',
    },
    {
      name: 'MobileCo UG',
      phase: 2, phaseLabel: 'Rechtliches',
      lpDocs: 'Ausstehend', writeOff: 'Ausstehend',
      nextMilestone: 'Gläubigerbekanntm. fällig Jun 2025',
      status: 'Rechtliches',
    },
  ]

  const activity = [
    { company: 'Horizon SaaS GmbH', event: 'Finaler LP-Bericht zum Download bereit', time: 'vor 2 Tagen' },
    { company: 'TechCo GmbH', event: 'Gläubigerbekanntmachung im Bundesanzeiger veröffentlicht', time: 'vor 1 Woche' },
    { company: 'MobileCo UG', event: 'Liquidator bestellt & eingetragen', time: 'vor 3 Wochen' },
    { company: 'TechCo GmbH', event: 'VSOP-Bereinigung eingeleitet, Gründer-Freigabe ausstehend', time: 'vor 1 Monat' },
  ]

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-sans text-[10px] font-medium tracking-[0.18em] uppercase text-rise-muted-light mb-1">
            Portfolio-Übersicht
          </p>
          <h3 className="font-serif font-normal text-rise-dark text-xl md:text-2xl leading-tight">
            Acme Ventures — Abwicklungsfälle
          </h3>
        </div>
        <span className="font-sans text-xs font-medium bg-rise-dark/[0.06] text-rise-dark px-3 py-1 rounded-full shrink-0 ml-4">
          Q1 2025
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Fälle', value: '3', sub: '2 aktiv · 1 abgeschlossen' },
          { label: 'LP-Berichte', value: '1 / 3', sub: '1 in Prüfung · 1 ausstehend' },
          { label: 'Write-offs', value: '1 / 3', sub: 'dieses Quartal bestätigt' },
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
        {['Unternehmen', 'Phase', 'LP-Bericht', 'Write-off', 'Nächster Meilenstein'].map((h) => (
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
            <div>
              <span className="font-sans text-sm font-medium text-rise-dark">{co.name}</span>
              <span className={`md:hidden font-sans text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${
                co.status === 'Abgeschlossen'    ? 'bg-rise-dark/[0.06] text-rise-dark'
                : co.status === 'In Bearbeitung' ? 'bg-rise-coral/10 text-rise-coral'
                : 'bg-rise-border text-rise-muted'
              }`}>{co.status}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="flex-1 h-1 bg-rise-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${co.status === 'Abgeschlossen' ? 'bg-rise-dark' : 'bg-rise-coral'}`}
                    style={{ width: `${(co.phase / 6) * 100}%` }}
                  />
                </div>
                <span className="font-sans text-[10px] text-rise-muted-light shrink-0">{co.phase}/6</span>
              </div>
              <span className="font-sans text-[10px] text-rise-muted-light">{co.phaseLabel}</span>
            </div>

            <span className={`font-sans text-xs font-medium ${
              co.lpDocs === 'Bereit'      ? 'text-rise-sage'
              : co.lpDocs === 'In Prüfung' ? 'text-rise-coral'
              : 'text-rise-muted-light'
            }`}>
              {co.lpDocs === 'Bereit' ? '✓ Bereit' : co.lpDocs}
            </span>

            <span className={`font-sans text-xs ${
              co.writeOff === 'Bestätigt' ? 'text-rise-sage font-medium' : 'text-rise-muted-light'
            }`}>
              {co.writeOff === 'Bestätigt' ? '✓ Bestätigt' : co.writeOff}
            </span>

            <span className="font-sans text-[11px] text-rise-muted leading-tight">{co.nextMilestone}</span>
          </div>
        ))}
      </div>

      {/* Activity feed */}
      <div className="mt-6 pt-5 border-t border-rise-border">
        <p className="font-sans text-[10px] font-semibold tracking-[0.16em] uppercase text-rise-muted-light mb-3">
          Aktuelle Aktivitäten
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
          Die Plattform
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Ein Prozess. Volle Transparenz.
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
              {view === 'founder' ? 'rise.app/faelle/techco' : 'rise.app/portfolio/acme-ventures'}
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
              Gründer
            </button>
            <button
              onClick={() => setView('vc')}
              className={`font-sans text-xs px-3 py-1.5 rounded transition-all duration-200 ${
                view === 'vc'
                  ? 'bg-white text-rise-dark shadow-sm font-medium'
                  : 'text-rise-muted-light hover:text-rise-muted'
              }`}
            >
              VC-Fonds
            </button>
          </div>
        </div>

        {view === 'founder' ? <FounderView /> : <VCView />}
      </div>

      <p className="font-sans font-light text-rise-muted text-sm mt-6 text-center">
        {view === 'founder'
          ? 'Ihr Fall. Jeder Schritt nachverfolgbar. Nichts geht verloren.'
          : 'Portfolio-Hygiene im Überblick. LP-fähige Dokumentation pro Fall.'}
      </p>
    </section>
  )
}

function WhoWeServe() {
  const customers = [
    {
      label: 'VC-Fonds',
      description:
        'Portfolio-Hygiene, ohne die interne Kapazität zu strapazieren. Festpreis, vollständige Dokumentation, LP-fähiges Reporting — alles aus einer Hand. Wir wissen, dass auslaufende Portfoliounternehmen intern oft keine Priorität haben. Rise stellt sicher, dass die Abwicklung trotzdem professionell, fristgerecht und sauber erfolgt.',
    },
    {
      label: 'Gründer',
      description:
        'Sie haben etwas aufgebaut — und es hat nicht den erhofften Weg genommen. Das ist keine Niederlage, sondern Teil des unternehmerischen Wegs. Rise hilft Ihnen, sauber und strukturiert abzuschließen, sich rechtlich abzusichern und mit einer vollständigen Akte weiterzuziehen. Damit Sie den nächsten Schritt gehen können — ohne offene Baustellen.',
    },
    {
      label: 'Rechtsanwälte',
      description:
        'Ein Umsetzungspartner für operative Workstreams — damit Sie sich auf das konzentrieren können, was echte juristische Expertise erfordert. Rise übernimmt Fristmanagement, Dokumentenkoordination und die Kommunikation mit Behörden und Stakeholdern. Sie behalten die rechtliche Verantwortung. Wir liefern die Struktur drumherum.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          Für wen wir arbeiten
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Gebaut für alle, die den Abschluss professionell gestalten wollen.
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

function TrustSection() {
  const metrics = [
    { value: '50+', label: 'GmbHs begleitet' },
    { value: 'Frankfurt', label: 'Standort' },
    { value: 'Festpreis', label: 'Keine Stundensätze' },
  ]

  return (
    <section className="bg-rise-bg py-16 md:py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <p className="font-sans font-light text-rise-muted text-base md:text-lg leading-relaxed max-w-2xl mb-12">
          Aufgebaut von Rechts- und Operations-Experten mit Erfahrung in der Abwicklung
          von Venture-finanzierten Unternehmen. Rise kombiniert juristische Präzision
          mit operativer Umsetzungsstärke — für einen Prozess, der funktioniert.
        </p>
        <div className="flex flex-col sm:flex-row gap-10 sm:gap-16">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="font-serif text-rise-dark text-3xl md:text-4xl mb-1">{m.value}</p>
              <p className="font-sans text-xs text-rise-muted-light tracking-wide uppercase">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const items = [
    {
      q: 'Wie lange dauert eine GmbH-Liquidation in Deutschland?',
      a: 'Eine solvente GmbH-Liquidation dauert typischerweise 12–18 Monate — hauptsächlich aufgrund des gesetzlich vorgeschriebenen Sperrjahrs nach § 73 GmbHG. Rise koordiniert den gesamten Prozess von der Gesellschafterversammlung bis zur Löschung im Handelsregister. In bestimmten Fällen (keine Aktiva, keine Passiva) ist auch eine vereinfachte Löschung nach § 394 FamFG möglich.',
    },
    {
      q: 'Was übernimmt Rise — und was macht mein Anwalt?',
      a: 'Rise koordiniert den gesamten Prozess: Zeitpläne, Stakeholder-Kommunikation, Dokumenten-Workflows und operative Umsetzung. Rechtliche und steuerliche Leistungen werden von zugelassenen Fachleuten erbracht — entweder Ihrem bestehenden Berater oder Partnern aus unserem Netzwerk. Rise ist die Orchestrierungsebene, keine Kanzlei.',
    },
    {
      q: 'Wer bezahlt eine Rise-Beauftragung?',
      a: 'Das hängt von der Situation ab. In vielen Fällen übernimmt der VC-Fonds die Kosten als Teil des Portfolio-Managements. In anderen Fällen trägt das Unternehmen selbst die Kosten aus verbliebenem Kapital. Wir strukturieren Engagements passend zu Ihrer Situation.',
    },
    {
      q: 'Was ist in einer Rise-Beauftragung enthalten?',
      a: 'Eine Standardbeauftragung umfasst: Gesellschafterversammlung, Liquidatorkoordination, Gläubigerbekanntmachung, Handelsregisteranmeldungen, VSOP/ESOP-Bereinigung, Steuerkoordination, LP-Dokumentation und finale Löschung. Jeder Fall wird individuell scopiert — wir machen kein Einheitsangebot.',
    },
    {
      q: 'Ist Rise eine Kanzlei?',
      a: 'Nein. Rise ist eine technologiegestützte Orchestrierungsplattform für strukturierte Unternehmenstransitionen. Alle Rechts- und Steuerleistungen werden von zugelassenen Fachleuten erbracht. Rise koordiniert den Prozess, überwacht Fristen und stellt sicher, dass nichts verloren geht.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          Häufige Fragen
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Was Sie wissen möchten.
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
        <p className="font-serif font-normal text-white text-4xl md:text-5xl lg:text-6xl leading-tight mb-8 tracking-tight">
          Close Clean.
          <br />
          <span className="text-rise-muted-light">Build Again.</span>
        </p>
        <p className="font-sans font-light text-rise-muted-light text-base mb-10 max-w-md mx-auto">
          Rise begleitet Sie durch den gesamten Abwicklungsprozess —
          von der ersten Analyse bis zur Löschung im Handelsregister.
        </p>
        <div className="flex flex-col items-center gap-3">
          <a
            href="/intake"
            className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-white hover:text-rise-dark transition-colors duration-200"
          >
            Kostenlose Ersteinschätzung anfragen
          </a>
          <span className="font-sans text-xs text-rise-muted-light">
            Antwort innerhalb von 48 Stunden
          </span>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-serif text-rise-dark tracking-logo text-base uppercase">
            Rise
          </span>
          <span className="text-rise-border">·</span>
          <span className="font-sans font-light text-rise-muted-light text-xs">
            GmbH-Abwicklung für Startups
          </span>
          <span className="text-rise-border hidden md:block">·</span>
          <span className="font-sans font-light text-rise-muted-light text-xs hidden md:block">
            Frankfurt
          </span>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          <a
            href="/impressum"
            className="font-sans font-light text-xs text-rise-muted hover:text-rise-coral transition-colors duration-200"
          >
            Impressum
          </a>
          <a
            href="/datenschutz"
            className="font-sans font-light text-xs text-rise-muted hover:text-rise-coral transition-colors duration-200"
          >
            Datenschutz
          </a>
          <a
            href="mailto:hello@risestartup.eu"
            className="font-sans font-light text-xs text-rise-muted hover:text-rise-coral transition-colors duration-200"
          >
            hello@risestartup.eu
          </a>
        </div>
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
        <TrustSection />
        <Divider />
        <FAQ />
        <Closer />
      </main>
      <Footer />
    </div>
  )
}
