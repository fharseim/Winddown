import { useState } from 'react'
import HoldingRechner from './rise_holding_rechner'

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-rise-bg-warm/95 backdrop-blur-sm border-b border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <a
          href="/"
          className="font-serif text-rise-dark tracking-logo text-2xl uppercase hover:text-rise-coral transition-colors duration-200"
        >
          Rise
        </a>
        <div className="flex items-center gap-6">
          <a
            href="/"
            className="text-sm font-sans font-medium text-rise-muted hover:text-rise-dark transition-colors duration-200 tracking-wide"
          >
            Zurück zur Übersicht
          </a>
          <a
            href="mailto:hello@risestartup.eu"
            className="text-sm font-sans font-medium text-rise-muted hover:text-rise-dark transition-colors duration-200 tracking-wide"
          >
            Get in touch
          </a>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-36 pb-16 md:pt-44 md:pb-20 px-6 md:px-12 max-w-3xl mx-auto text-center">
      <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-5">
        Holding-Kosten-Rechner
      </p>
      <h1 className="font-serif font-normal text-rise-dark text-[2.5rem] md:text-[3rem] leading-[1.1] tracking-tight mb-6">
        Was kostet Ihre leere Holding
        <br />
        <span className="italic text-rise-muted">wirklich?</span>
      </h1>
      <p className="font-sans font-light text-rise-muted text-lg leading-relaxed max-w-xl mx-auto">
        Viele Gründer halten ihre GmbH oder UG am Leben, obwohl sie längst
        inaktiv ist. Die laufenden Kosten summieren sich still — Jahr für Jahr.
        Dieser Rechner zeigt Ihnen den genauen Betrag und ab wann sich die
        Auflösung rentiert.
      </p>
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

function Explanation() {
  const items = [
    {
      label: 'Break-even',
      body: 'Sobald dieser Punkt erreicht ist, amortisiert sich die Rise-Liquidation vollständig. Jeder weitere Monat danach bedeutet reinen Kostenverlust durch das Weiterlaufen der Holding.',
    },
    {
      label: '5-Jahres-Projektion',
      body: 'Die Grafik zeigt die kumulierten Gesamtkosten beider Szenarien über fünf Jahre. Der Abstand zwischen den Balken wächst jedes Jahr — je länger Sie warten, desto teurer wird Nichtstun.',
    },
    {
      label: 'Ersparnis',
      body: 'Die ausgewiesene Ersparnis ist der Unterschied zwischen dem Weiterlaufen lassen und einer einmaligen Liquidation durch Rise über fünf Jahre gerechnet. Nicht enthalten: der Zeitaufwand und das Haftungsrisiko, das mit jeder weiteren Offenlegungspflicht steigt.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          Was bedeuten die Ergebnisse?
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Die Zahlen eingeordnet.
        </h2>
      </div>

      <div className="space-y-0">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex flex-col md:flex-row md:items-start py-10 border-t border-rise-border gap-4 md:gap-20"
          >
            <span className="font-serif text-rise-dark text-xl md:text-2xl md:w-56 shrink-0">
              {item.label}
            </span>
            <p className="font-sans font-light text-rise-muted text-base leading-relaxed max-w-lg">
              {item.body}
            </p>
          </div>
        ))}
        <div className="border-t border-rise-border" />
      </div>
    </section>
  )
}

function NextSteps() {
  const steps = [
    {
      number: '01',
      title: 'Ersteinschätzung',
      body: 'Sie schildern kurz Ihre Situation — Rechtsform, Stand der Buchhaltung, bekannte Verbindlichkeiten. Rise prüft kostenlos, welcher Liquidationspfad passt.',
    },
    {
      number: '02',
      title: 'Fixpreis-Angebot',
      body: 'Sie erhalten ein vollständiges Angebot mit klarem Scope und Festpreis. Kein Stundensatz, keine Überraschungen. Sie entscheiden, ob und wann es losgeht.',
    },
    {
      number: '03',
      title: 'Rise übernimmt',
      body: 'Rise koordiniert Anwälte, Steuerberater und Behörden — von der Gesellschafterversammlung bis zur Löschung im Handelsregister. Sie haben einen Ansprechpartner.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-14">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          Wie es weitergeht
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Drei Schritte zur sauberen Auflösung.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-rise-border">
        {steps.map((s) => (
          <div key={s.number} className="bg-rise-bg-warm p-8 md:p-10 flex flex-col">
            <span className="font-sans text-xs font-medium tracking-[0.2em] text-rise-muted-light mb-7">
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

function Differentiator() {
  return (
    <section className="bg-rise-sage">
      <div className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-white/50 mb-6">
            Warum Rise
          </p>
          <p className="font-serif font-normal text-white text-3xl md:text-4xl lg:text-5xl leading-tight mb-8">
            Rise koordiniert die gesamte Abwicklung.{' '}
            <span className="text-white/60">Sie müssen nichts selbst organisieren.</span>
          </p>
          <p className="font-sans font-light text-white/70 text-base md:text-lg leading-relaxed max-w-xl">
            Template-Anbieter liefern Dokumente. Rise übernimmt den Prozess —
            von der Gesellschafterversammlung über Behördenkommunikation bis zur
            Handelsregister-Löschung. Ein Ansprechpartner. Kein Koordinationsaufwand auf Ihrer Seite.
          </p>
        </div>
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
          Kostenlose Ersteinschätzung — unverbindlich, innerhalb von 48 Stunden.
        </p>
        <a
          href="mailto:hello@risestartup.eu"
          className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-white hover:text-rise-dark transition-colors duration-200"
        >
          Jetzt anfragen
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

export default function RechnerPage() {
  return (
    <div className="bg-rise-bg-warm min-h-screen font-sans">
      <Nav />
      <main>
        <Hero />
        <Divider />
        <section className="py-16 md:py-24 px-6 md:px-12">
          <HoldingRechner hideHeader />
        </section>
        <Differentiator />
        <Divider />
        <Explanation />
        <Divider />
        <NextSteps />
        <Closer />
      </main>
      <Footer />
    </div>
  )
}
