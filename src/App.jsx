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
      <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-muted-light mb-8">
        Structured Transitions
      </p>
      <h1 className="font-serif font-normal text-rise-dark text-5xl md:text-6xl lg:text-7xl leading-[1.08] tracking-tight mb-10">
        Every stage has infrastructure.
        <br />
        <span className="italic text-rise-muted">Except the last one.</span>
      </h1>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <p className="font-sans font-light text-rise-muted text-lg md:text-xl leading-relaxed max-w-xl">
          Rise builds the missing transition layer for European startups —
          structured wind-downs, liquidations, and exits handled with the
          same rigor as any other stage.
        </p>
        <a
          href="mailto:hello@risestartup.eu"
          className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-dark text-white px-8 py-4 hover:bg-rise-coral transition-colors duration-200 shrink-0 self-start md:self-auto"
        >
          Talk to us
        </a>
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
    {
      tool: 'Stripe Atlas',
      stage: 'Incorporation',
      note: 'Entity setup, banking, compliance',
      available: true,
    },
    {
      tool: 'Carta',
      stage: 'Cap Table & Equity',
      note: 'Ownership, options, investor reporting',
      available: true,
    },
    {
      tool: 'Notion / Linear',
      stage: 'Operations',
      note: 'Product, hiring, roadmap execution',
      available: true,
    },
    {
      tool: null,
      stage: 'Wind-Down & Exit',
      note: 'No infrastructure. No standard. No support.',
      available: false,
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-muted-light mb-4">
          The Gap
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Every stage is served. One is not.
        </h2>
      </div>

      <div className="space-y-px">
        {stages.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-6 border-b border-rise-border group ${
              !item.available ? 'bg-rise-dark -mx-6 px-6 md:-mx-12 md:px-12' : ''
            }`}
          >
            <div className="flex items-baseline gap-6 md:gap-10">
              <span
                className={`font-sans text-xs font-medium tracking-[0.15em] uppercase w-32 md:w-40 shrink-0 ${
                  item.available ? 'text-rise-muted-light' : 'text-rise-muted-light/60'
                }`}
              >
                {item.tool ?? (
                  <span className="text-rise-coral font-medium">Rise</span>
                )}
              </span>
              <span
                className={`font-serif text-xl md:text-2xl font-normal ${
                  item.available ? 'text-rise-dark' : 'text-white'
                }`}
              >
                {item.stage}
              </span>
            </div>
            <span
              className={`font-sans text-xs font-light hidden md:block max-w-xs text-right ${
                item.available ? 'text-rise-muted-light' : 'text-rise-coral'
              }`}
            >
              {item.note}
            </span>
          </div>
        ))}
      </div>

      <p className="font-sans font-light text-rise-muted mt-12 text-base leading-relaxed max-w-2xl">
        When a company needs to close, founders face fragmented advisors,
        unclear liability, and no standardized process. Rise changes that.
      </p>
    </section>
  )
}

function WhatRiseDoes() {
  const pillars = [
    {
      number: '01',
      title: 'Orchestration',
      body: 'One point of contact across all workstreams — legal, tax, banking, HR, and stakeholder communication. No coordination overhead, no dropped threads.',
    },
    {
      number: '02',
      title: 'Liability Protection',
      body: 'Directors and founders face real legal exposure during wind-downs. Rise ensures every step is documented, sequenced, and compliant — protecting the people behind the company.',
    },
    {
      number: '03',
      title: 'LP Documentation',
      body: 'Clean, standardized reporting packages for investors. Rise produces the documentation funds need to close out portfolio positions with confidence.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-muted-light mb-4">
          What Rise Does
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          The execution layer, finally built.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-rise-border">
        {pillars.map((p) => (
          <div key={p.number} className="bg-rise-bg-warm p-8 md:p-10">
            <span className="font-sans text-xs font-medium tracking-[0.2em] text-rise-muted-light block mb-6">
              {p.number}
            </span>
            <h3 className="font-serif font-normal text-rise-dark text-2xl mb-4">
              {p.title}
            </h3>
            <p className="font-sans font-light text-rise-muted text-sm leading-relaxed">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function WhoWeServe() {
  const customers = [
    {
      label: 'VC Funds',
      description:
        'Portfolio hygiene at scale. Close out positions cleanly, protect LP relationships, and free up management bandwidth.',
    },
    {
      label: 'Portfolio Companies',
      description:
        'A structured, dignified exit from the market — without the chaos, liability risk, or reputational damage of an unmanaged close.',
    },
    {
      label: 'Legal Counsel',
      description:
        'An execution partner that handles the operational workstreams, so counsel can focus on what requires legal expertise.',
    },
  ]

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-muted-light mb-4">
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

function Closer() {
  return (
    <section className="py-24 md:py-36 px-6 md:px-12 max-w-6xl mx-auto text-center">
      <blockquote className="font-serif font-normal italic text-rise-dark text-3xl md:text-4xl lg:text-5xl leading-tight max-w-3xl mx-auto mb-12">
        "How a chapter ends<br className="hidden md:block" /> shapes how the next begins."
      </blockquote>
      <p className="font-sans font-light text-rise-muted text-base mb-10">
        Rise is active in Europe. Talk to us about your situation.
      </p>
      <a
        href="mailto:hello@risestartup.eu"
        className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-dark text-white px-8 py-4 hover:bg-rise-coral transition-colors duration-200"
      >
        Get in touch
      </a>
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
        <WhatRiseDoes />
        <Divider />
        <WhoWeServe />
        <Divider />
        <Closer />
      </main>
      <Footer />
    </div>
  )
}
