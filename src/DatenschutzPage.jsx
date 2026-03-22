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

export default function DatenschutzPage() {
  return (
    <div className="bg-rise-bg-warm min-h-screen font-sans">
      <Nav />
      <main className="pt-36 pb-24 px-6 md:px-12 max-w-3xl mx-auto">
        <h1 className="font-serif font-normal text-rise-dark text-4xl md:text-5xl leading-tight tracking-tight mb-4">
          Datenschutzerklärung
        </h1>
        <p className="font-sans font-light text-rise-muted text-sm mb-12">
          Stand: März 2025
        </p>

        <div className="space-y-10 font-sans text-rise-muted text-base leading-relaxed">

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              1. Verantwortlicher
            </h2>
            <p>
              Verantwortlicher im Sinne der DSGVO ist:<br /><br />
              <strong className="text-rise-dark">Riseq GmbH</strong><br />
              [Straße und Hausnummer]<br />
              60xxx Frankfurt am Main<br />
              Deutschland<br />
              E-Mail: <a href="mailto:hello@risestartup.eu" className="text-rise-coral hover:underline">hello@risestartup.eu</a>
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              2. Erhebung und Speicherung personenbezogener Daten
            </h2>
            <p className="mb-4">
              Beim Besuch unserer Website werden durch den auf Ihrem Endgerät zum Einsatz kommenden
              Browser automatisch Informationen an den Server unserer Website gesendet. Diese
              Informationen werden temporär in einem sogenannten Logfile gespeichert. Folgende
              Informationen werden dabei ohne Ihr Zutun erfasst und bis zur automatisierten Löschung
              gespeichert:
            </p>
            <ul className="list-none space-y-1 pl-0">
              {[
                'IP-Adresse des anfragenden Rechners',
                'Datum und Uhrzeit des Zugriffs',
                'Name und URL der abgerufenen Datei',
                'Website, von der aus der Zugriff erfolgt (Referrer-URL)',
                'Verwendeter Browser und ggf. das Betriebssystem Ihres Rechners',
                'Name Ihres Access-Providers',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-rise-muted-light shrink-0 mt-2.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Die genannten Daten werden durch uns zu folgenden Zwecken verarbeitet: Gewährleistung
              eines reibungslosen Verbindungsaufbaus der Website, Gewährleistung einer komfortablen
              Nutzung unserer Website, Auswertung der Systemsicherheit und -stabilität sowie zu
              weiteren administrativen Zwecken. Die Rechtsgrundlage für die Datenverarbeitung ist
              Art. 6 Abs. 1 S. 1 lit. f DSGVO.
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              3. Cookies
            </h2>
            <p>
              Unsere Website verwendet keine Tracking-Cookies oder Analyse-Cookies von Drittanbietern.
              Es werden ausschließlich technisch notwendige Cookies verwendet, die für den Betrieb
              der Website erforderlich sind. Diese Cookies enthalten keine personenbezogenen Daten
              und werden nach dem Schließen des Browsers gelöscht.
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              4. Kontaktaufnahme per E-Mail
            </h2>
            <p>
              Wenn Sie uns per E-Mail kontaktieren, werden die von Ihnen mitgeteilten Daten
              (Ihre E-Mail-Adresse, ggf. Ihr Name und Ihre Telefonnummer) von uns gespeichert,
              um Ihre Fragen zu beantworten. Die in diesem Zusammenhang anfallenden Daten löschen
              wir, nachdem die Speicherung nicht mehr erforderlich ist, oder schränken die
              Verarbeitung ein, falls gesetzliche Aufbewahrungspflichten bestehen. Rechtsgrundlage
              ist Art. 6 Abs. 1 S. 1 lit. f DSGVO (berechtigtes Interesse an der Bearbeitung von
              Anfragen) sowie ggf. Art. 6 Abs. 1 S. 1 lit. b DSGVO (vorvertragliche Maßnahmen).
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              5. Weitergabe von Daten
            </h2>
            <p>
              Eine Übermittlung Ihrer persönlichen Daten an Dritte zu anderen als den im Folgenden
              aufgeführten Zwecken findet nicht statt. Wir geben Ihre persönlichen Daten nur an
              Dritte weiter, wenn Sie Ihre ausdrückliche Einwilligung dazu erteilt haben, die
              Weitergabe zur Abwicklung von Vertragsverhältnissen mit Ihnen erforderlich ist oder
              eine gesetzliche Verpflichtung zur Weitergabe besteht.
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              6. Hosting
            </h2>
            <p>
              Diese Website wird bei Vercel Inc., 340 Pine Street, Suite 700, San Francisco,
              California 94104, USA gehostet. Vercel verarbeitet dabei Server-Logfiles und
              technische Daten. Mit Vercel besteht ein Auftragsverarbeitungsvertrag gemäß Art. 28
              DSGVO. Die Datenübertragung in die USA erfolgt auf Basis der
              EU-Standardvertragsklauseln.
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              7. Ihre Rechte als betroffene Person
            </h2>
            <p className="mb-4">
              Sie haben das Recht:
            </p>
            <ul className="list-none space-y-2 pl-0">
              {[
                'gemäß Art. 15 DSGVO Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu verlangen',
                'gemäß Art. 16 DSGVO unverzüglich die Berichtigung unrichtiger oder Vervollständigung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen',
                'gemäß Art. 17 DSGVO die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen',
                'gemäß Art. 18 DSGVO die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen',
                'gemäß Art. 20 DSGVO Ihre personenbezogenen Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten',
                'gemäß Art. 77 DSGVO sich bei einer Aufsichtsbehörde zu beschweren',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-rise-muted-light shrink-0 mt-2.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              8. Widerspruchsrecht
            </h2>
            <p>
              Sofern Ihre personenbezogenen Daten auf Grundlage von berechtigten Interessen gemäß
              Art. 6 Abs. 1 S. 1 lit. f DSGVO verarbeitet werden, haben Sie das Recht, gemäß
              Art. 21 DSGVO Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten
              einzulegen, soweit dafür Gründe vorliegen, die sich aus Ihrer besonderen Situation
              ergeben. Möchten Sie von Ihrem Widerrufs- oder Widerspruchsrecht Gebrauch machen,
              genügt eine E-Mail an{' '}
              <a href="mailto:hello@risestartup.eu" className="text-rise-coral hover:underline">
                hello@risestartup.eu
              </a>.
            </p>
          </section>

          <div className="border-t border-rise-border" />

          <section>
            <h2 className="font-sans font-medium text-rise-dark text-sm tracking-[0.15em] uppercase mb-4">
              9. Aktualität und Änderung dieser Datenschutzerklärung
            </h2>
            <p>
              Diese Datenschutzerklärung ist aktuell gültig und hat den Stand März 2025. Durch die
              Weiterentwicklung unserer Website und Angebote darüber oder aufgrund geänderter
              gesetzlicher beziehungsweise behördlicher Vorgaben kann es notwendig werden, diese
              Datenschutzerklärung zu ändern. Die jeweils aktuelle Datenschutzerklärung kann
              jederzeit auf dieser Seite abgerufen werden.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  )
}
