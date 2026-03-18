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
        className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 hover:bg-rise-dark transition-colors duration-200"
      >
        Talk to us about your situation
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
      <div className="mb-12">
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          The Gap
        </p>
        <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight max-w-xl">
          Every stage is served. One is not.
        </h2>
      </div>

      <div>
        {stages.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-6 border-b border-rise-border">
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

        {/* Gap row — the missing stage */}
        <div className="flex items-center justify-between py-6 border-b border-dashed border-rise-border">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span className="w-32 md:w-40 shrink-0" />
            <span className="font-serif text-xl md:text-2xl font-normal text-rise-muted-light/40 italic">
              Wind-Down & Exit
            </span>
          </div>
          <span className="font-sans text-xs font-light text-rise-muted-light/40 hidden md:block">
            —
          </span>
        </div>

        {/* Rise row — the resolution */}
        <div className="flex items-center justify-between py-6 border-b border-rise-border">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span className="font-sans text-xs font-medium tracking-[0.15em] uppercase w-32 md:w-40 shrink-0 text-rise-coral">
              Rise
            </span>
            <span className="font-serif text-xl md:text-2xl font-normal text-rise-coral">
              Wind-Down & Exit
            </span>
          </div>
          <span className="font-sans text-xs font-light hidden md:block max-w-xs text-right text-rise-coral/70">
            Structured transitions for startups and investors.
          </span>
        </div>
      </div>

      <p className="font-sans font-light text-rise-muted mt-12 text-base leading-relaxed max-w-2xl">
        When a company needs to close, founders face fragmented advisors,
        unclear liability, and no standardized process. Rise changes that.
      </p>
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
    <section className="py-16 md:py-20 px-6 md:px-12 max-w-6xl mx-auto text-center">
      <p className="font-sans font-light text-rise-muted text-base">
        Built by legal and operations professionals. Based in Frankfurt.
      </p>
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
          Rise is active in Europe. Talk to us about your situation.
        </p>
        <a
          href="mailto:hello@risestartup.eu"
          className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 hover:bg-white hover:text-rise-dark transition-colors duration-200"
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
        <WhoWeServe />
        <Credibility />
        <Closer />
      </main>
      <Footer />
    </div>
  )
}
