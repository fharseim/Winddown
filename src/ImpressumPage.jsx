function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-rise-bg-warm/95 backdrop-blur-sm border-b border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <a href="/" className="font-serif text-rise-dark tracking-logo text-2xl uppercase hover:text-rise-coral transition-colors duration-200">
          Rise
        </a>
        <a
          href="/"
          className="text-sm font-sans font-medium text-rise-muted hover:text-rise-dark transition-colors duration-200 tracking-wide"
        >
          Zurück zur Startseite
        </a>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="border-t border-rise-border">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-serif text-rise-dark tracking-logo text-base uppercase">Rise</span>
          <span className="text-rise-border">·</span>
          <span className="font-sans font-light text-rise-muted-light text-xs">GmbH-Abwicklung für Startups</span>
          <span className="text-rise-border hidden md:block">·</span>
          <span className="font-sans font-light text-rise-muted-light text-xs hidden md:block">Frankfurt</span>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          <a href="/impressum" className="font-sans font-light text-xs text-rise-muted hover:text-rise-coral transition-colors duration-200">Impressum</a>
          <a href="/datenschutz" className="font-sans font-light text-xs text-rise-muted hover:text-rise-coral transition-colors duration-200">Datenschutz</a>
          <a href="mailto:hello@risestartup.eu" className="font-sans font-light text-xs text-rise-muted hover:text-rise-coral transition-colors duration-200">hello@risestartup.eu</a>
        </div>
      </div>
    </footer>
  )
}

export default function ImpressumPage() {
  return (
    <div className="bg-rise-bg-warm min-h-screen font-sans">
      <Nav />
      <main className="pt-36 pb-24 px-6 md:px-12 max-w-3xl mx-auto">
        <h1 className="font-serif font-normal text-rise-dark text-4xl md:text-5xl leading-tight tracking-tight mb-12">
          Impressum
        </h1>

        <div className="space-y-10 font-sans text-rise-muted text-base leading-relaxed">

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              Angaben gemäß § 5 DDG
            </h2>
            <p>
              <strong className="text-rise-dark">Riseq GmbH</strong><br />
              [Straße und Hausnummer]<br />
              60xxx Frankfurt am Main<br />
              Deutschland
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              Kontakt
            </h2>
            <p>
              E-Mail: <a href="mailto:hello@risestartup.eu" className="text-rise-coral hover:underline">hello@risestartup.eu</a><br />
              Website: <a href="https://riseq.eu" className="text-rise-coral hover:underline">riseq.eu</a>
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              Handelsregister
            </h2>
            <p>
              Registergericht: Amtsgericht Frankfurt am Main<br />
              Registernummer: HRB [Nummer]
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              Umsatzsteuer-Identifikationsnummer
            </h2>
            <p>
              Gemäß § 27a Umsatzsteuergesetz:<br />
              DE [Nummer]
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV
            </h2>
            <p>
              [Name des Verantwortlichen]<br />
              Riseq GmbH<br />
              [Straße und Hausnummer]<br />
              60xxx Frankfurt am Main
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              Haftungsausschluss
            </h2>

            <h3 className="font-sans font-medium text-rise-dark text-sm mb-2">Haftung für Inhalte</h3>
            <p className="mb-4">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
              Tätigkeit hinweisen.
            </p>

            <h3 className="font-sans font-medium text-rise-dark text-sm mb-2">Haftung für Links</h3>
            <p className="mb-4">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
              Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
              Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
              Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
              Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
              erkennbar.
            </p>

            <h3 className="font-sans font-medium text-rise-dark text-sm mb-2">Urheberrecht</h3>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
              dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
              Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung
              des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den
              privaten, nicht kommerziellen Gebrauch gestattet.
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              Hinweis
            </h2>
            <p className="font-sans text-xs text-rise-muted-light leading-relaxed">
              Die Inhalte dieser Website stellen keine Rechtsberatung dar. Für konkrete rechtliche
              Fragestellungen empfehlen wir die Inanspruchnahme qualifizierter Rechtsberatung.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  )
}
