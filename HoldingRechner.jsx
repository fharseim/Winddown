import { useState, useMemo } from "react";

function fmt(n) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

function Slider({ label, value, onChange, min, max, step = 1, unit = "", hint }) {
  const display = unit === "€" ? "€ " + fmt(value) : value + unit;
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm text-stone-600">{label}</span>
        <span className="text-[15px] font-medium text-stone-900">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-stone-200 rounded appearance-none cursor-pointer accent-[#E85D40] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#E85D40] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
      {hint && <div className="text-[11px] text-stone-400 mt-1">{hint}</div>}
    </div>
  );
}

function Toggle({ label, value, onChange, hint }) {
  return (
    <div className="mb-5 flex justify-between items-center">
      <div className="flex-1">
        <span className="text-sm text-stone-600">{label}</span>
        {hint && <div className="text-[11px] text-stone-400 mt-0.5">{hint}</div>}
      </div>
      <div onClick={() => onChange(!value)}
        className={"w-11 h-6 rounded-xl cursor-pointer relative transition-colors ml-3 flex-shrink-0 " + (value ? "bg-[#1A7A5A]" : "bg-stone-300")}>
        <div className={"w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-[left] shadow-md " + (value ? "left-[23px]" : "left-[3px]")} />
      </div>
    </div>
  );
}

function Metric({ label, value, sub, variant }) {
  const bg = { coral: "bg-[#FEF0EC]", sage: "bg-[#EDF9F4]", amber: "bg-[#FFFBEB]" };
  const tc = { coral: "text-[#B8422B]", sage: "text-[#14603F]", amber: "text-[#92400E]" };
  return (
    <div className={bg[variant] + " rounded-[10px] p-3.5 flex-1 min-w-[130px]"}>
      <div className="text-[11px] text-stone-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={"text-[22px] font-medium " + tc[variant]}>{value}</div>
      {sub && <div className="text-[11px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Bar({ label, width, value, color, max }) {
  const pct = Math.min((width / max) * 100, 100);
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs text-stone-600 mb-0.5">
        <span>{label}</span><span className="font-medium text-stone-900">{value}</span>
      </div>
      <div className="h-2 bg-stone-200 rounded overflow-hidden">
        <div className="h-full rounded transition-all duration-400" style={{ width: pct + "%", background: color }} />
      </div>
    </div>
  );
}

function PhaseCard({ month, title, items, accent }) {
  const bg = accent === "coral" ? "bg-[#FEF0EC]" : "bg-[#EDF9F4]";
  const dot = accent === "coral" ? "#E85D40" : "#1A7A5A";
  return (
    <div className="flex gap-3 mb-0.5">
      <div className="flex flex-col items-center w-9 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ background: dot }} />
        <div className="w-[1.5px] flex-1 bg-stone-200 mt-0.5" />
      </div>
      <div className={bg + " rounded-[10px] p-3 flex-1 mb-2"}>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[13px] font-medium text-stone-900">{title}</span>
          <span className="text-[11px] text-stone-400">{month}</span>
        </div>
        {items.map((item, i) => (
          <div key={i} className="text-xs text-stone-600 leading-relaxed py-px flex gap-1.5 items-baseline">
            <span className="text-[8px] mt-[3px] flex-shrink-0" style={{ color: dot }}>●</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareRow({ label, ohne, mit }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-stone-100 items-center">
      <span className="text-xs text-stone-600">{label}</span>
      <span className="text-xs text-[#B8422B] text-center">{ohne}</span>
      <span className="text-xs text-[#14603F] text-center font-medium">{mit}</span>
    </div>
  );
}

export default function HoldingRechner() {
  const [jahre, setJahre] = useState(3);
  const [stb, setStb] = useState(2500);
  const [ihk, setIhk] = useState(200);
  const [sonst, setSonst] = useState(300);
  const [rueck, setRueck] = useState(true);
  const [rueckJ, setRueckJ] = useState(2);
  const [glaub, setGlaub] = useState(false);
  const [showSperr, setShowSperr] = useState(false);

  const c = useMemo(() => {
    const pa = stb + ihk + sonst;
    const kum = pa * jahre;
    const fee = glaub ? 4500 : 3000;
    const alt = rueck ? rueckJ * 800 : 0;
    const sperr = 3600;
    const total = fee + alt + sperr;
    const be = Math.round((total / pa) * 12);
    const p5 = [];
    let kk = kum, kr = kum + total;
    for (let y = 1; y <= 5; y++) { kk += pa; p5.push({ y, keep: kk, rise: kr }); }
    return { pa, kum, fee, alt, sperr, total, be, p5, sav: p5[4].keep - p5[4].rise };
  }, [jahre, stb, ihk, sonst, rueck, rueckJ, glaub]);

  const mx = Math.max(...c.p5.map(p => p.keep));

  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[680px] mx-auto px-5 py-8 sm:py-12">
        <a href="/" className="text-xs text-stone-400 hover:text-stone-600 transition-colors mb-8 inline-block">← Zurück zur Startseite</a>
        <div className="text-center mb-8">
          <div className="text-xl tracking-[3px] uppercase mb-1.5" style={{ fontFamily: "'DM Serif Display', serif" }}>RISE</div>
          <div className="text-[10px] tracking-[2px] uppercase text-stone-400 mb-4">Structured Transitions</div>
          <h1 className="text-[26px] font-normal text-stone-900 mb-1.5 leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>Was kostet Ihre leere Holding?</h1>
          <p className="text-sm text-stone-500 leading-relaxed">Berechnen Sie, wie viel Ihre inaktive Holding jedes Jahr kostet — und wann sich die Auflösung rechnet.</p>
        </div>

        <div className="bg-white border border-stone-200/60 rounded-[14px] p-6 sm:p-7 mb-4">
          <div className="text-[10px] font-medium tracking-[2px] uppercase text-[#E85D40] mb-4">Ihre Situation</div>
          <Slider label="Holding existiert seit" value={jahre} onChange={setJahre} min={1} max={10} unit=" Jahren" hint="Jahre seit Gründung oder seit Inaktivität" />
          <Slider label="Jährliche StB-Kosten" value={stb} onChange={setStb} min={800} max={5000} step={100} unit="€" hint="Jahresabschluss, Steuererklärungen, Offenlegung" />
          <Slider label="IHK-Beitrag / Jahr" value={ihk} onChange={setIhk} min={0} max={500} step={25} unit="€" />
          <Slider label="Sonstige Kosten / Jahr" value={sonst} onChange={setSonst} min={0} max={1000} step={50} unit="€" hint="Bankkonto, Geschäftsadresse, Software" />
          <div className="border-t border-stone-100 pt-4 mt-2">
            <Toggle label="Offenlegungsrückstände vorhanden?" value={rueck} onChange={setRueck} hint="Bundesanzeiger-Veröffentlichungen nicht aktuell" />
            {rueck && <Slider label="Rückstandsjahre" value={rueckJ} onChange={setRueckJ} min={1} max={5} unit=" Jahre" />}
            <Toggle label="Bekannte Gläubiger vorhanden?" value={glaub} onChange={setGlaub} hint="Offene Rechnungen, Darlehen, Verbindlichkeiten" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/60 rounded-[14px] p-6 sm:p-7 mb-4">
          <div className="text-[10px] font-medium tracking-[2px] uppercase text-[#1A7A5A] mb-4">Ergebnis</div>
          <div className="flex gap-2.5 flex-wrap mb-5">
            <Metric label="Bisherige Kosten" value={"€ " + fmt(c.kum)} sub={jahre + " Jahre × € " + fmt(c.pa) + "/Jahr"} variant="coral" />
            <Metric label="Rise-Liquidation" value={"€ " + fmt(c.total)} sub="einmalig, alles inkl." variant="sage" />
            <Metric label="Break-even" value={c.be + " Mo."} sub="vs. Weiterlaufen lassen" variant="amber" />
          </div>
          <div className="text-xs font-medium text-stone-600 mb-3">So setzt sich der Preis zusammen</div>
          <div className="bg-stone-100/70 rounded-[10px] p-3.5 mb-2">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-[13px] font-medium text-stone-900">Abwicklung (einmalig)</span>
              <span className="text-[15px] font-medium text-[#1A7A5A]">€ {fmt(c.fee)}</span>
            </div>
            <div className="text-xs text-stone-500 leading-relaxed">Auflösungsbeschluss, Liquidatorbestellung, HR-Anmeldung, Gläubigeraufruf, Koordination Schlussbilanz und finale Steuererklärungen mit Partner-StB, Löschungsantrag.</div>
          </div>
          {c.alt > 0 && (
            <div className="bg-[#FFFBEB] rounded-[10px] p-3.5 mb-2">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[13px] font-medium text-stone-900">Altjahre-Cleanup ({rueckJ} {rueckJ === 1 ? "Jahr" : "Jahre"})</span>
                <span className="text-[15px] font-medium text-[#D97706]">€ {fmt(c.alt)}</span>
              </div>
              <div className="text-xs text-stone-500 leading-relaxed">Nachholung rückständiger Jahresabschlüsse und Offenlegungen. Vermeidet Ordnungsgelder (ab € 2.500 je Versäumnis).</div>
            </div>
          )}
          <div className={"bg-white rounded-xl mb-2 border transition-colors " + (showSperr ? "border-[#1A7A5A]/25" : "border-stone-200/60")}>
            <div className="p-3.5 cursor-pointer flex justify-between items-center" onClick={() => setShowSperr(!showSperr)}>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-stone-900">Sperrjahr-Begleitung (12 Monate)</span>
                  <span className="text-[15px] font-medium text-[#1A7A5A]">€ {fmt(c.sperr)}</span>
                </div>
                <div className="text-xs text-stone-500 mt-1">{showSperr ? "Zuklappen" : "Was passiert in den 12 Monaten? Details anzeigen"}</div>
              </div>
              <div className={"w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-sm text-stone-500 transition-transform " + (showSperr ? "rotate-180" : "")}>&#9662;</div>
            </div>
            {showSperr && (
              <div className="px-3.5 pb-4">
                <div className="bg-[#EDF9F4] rounded-[10px] p-3.5 mb-4 border border-[#1A7A5A]/10">
                  <div className="text-[13px] font-medium text-[#14603F] mb-1">Warum 12 Monate?</div>
                  <div className="text-xs text-stone-600 leading-[1.7]">Das Sperrjahr (§ 73 GmbHG) ist eine gesetzliche Wartefrist: Gläubiger müssen 12 Monate Zeit haben, Forderungen anzumelden. Rise übernimmt die komplette Koordination, damit der frühestmögliche Löschungstermin eingehalten wird.</div>
                </div>
                <div className="text-xs font-medium text-stone-600 mb-3">Was Rise in dieser Zeit für Sie tut</div>
                <PhaseCard month="Monat 1–2" title="Auflösung und Einleitung" accent="sage" items={["Gesellschafterbeschluss gefasst und eingereicht","Liquidator beim Handelsregister angemeldet","Gläubigeraufruf im Bundesanzeiger veröffentlicht","Sperrjahr-Frist beginnt zu laufen","Erster Statusbericht an Sie"]} />
                <PhaseCard month="Monat 3–6" title="Steuerlicher Abschluss" accent="sage" items={["Koordination mit Partner-StB: Schlussbilanz, finale KSt/GewSt/USt","Letzte Offenlegung beim Bundesanzeiger","IHK-Abmeldung","Bankkonten-Auflösung koordiniert","Quartals-Statusbericht an Sie"]} />
                <PhaseCard month="Monat 7–11" title="Fristenüberwachung" accent="sage" items={["Monitoring eingehender Gläubigerforderungen","Finanzamt-Kommunikation: Steuerbescheide prüfen","Quartals-Statusbericht an Sie"]} />
                <PhaseCard month="Monat 12" title="Löschung" accent="coral" items={["Sperrjahr abgelaufen — Frist bestätigt","Schlussrechnung erstellt","Löschungsantrag beim HR eingereicht","Gesellschaft gelöscht — Confirmation Letter","Case closed. Keine weiteren Kosten. Nie wieder."]} />
                <div className="mt-3">
                  <div className="text-xs font-medium text-stone-600 mb-2">Was passiert ohne professionelle Begleitung?</div>
                  <div className="bg-stone-100/70 rounded-[10px] p-3.5">
                    <div className="grid grid-cols-3 gap-2 pb-2 border-b border-stone-200 mb-1">
                      <span className="text-[11px] text-stone-400"></span>
                      <span className="text-[11px] text-[#B8422B] text-center font-medium">Ohne Rise</span>
                      <span className="text-[11px] text-[#14603F] text-center font-medium">Mit Rise</span>
                    </div>
                    <CompareRow label="Fristen-Tracking" ohne="Sie selbst" mit="Automatisch" />
                    <CompareRow label="FA-Korrespondenz" ohne="Ihr StB (€ 180/Std.)" mit="Inklusive" />
                    <CompareRow label="Frist verpasst?" ohne="Ordnungsgeld" mit="Ausgeschlossen" />
                    <CompareRow label="Koordination" ohne="Sie selbst" mit="Rise koordiniert" />
                    <CompareRow label="Löschungsantrag" ohne="Notar selbst beauftragen" mit="Rise bereitet vor" />
                    <CompareRow label="Statusberichte" ohne="Keine" mit="Quartalsweise" />
                    <CompareRow label="Typische Dauer" ohne="18–24 Monate" mit="12–14 Monate" />
                    <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-stone-200 mt-1">
                      <span className="text-xs font-medium text-stone-600">Kosten Sperrjahr</span>
                      <span className="text-xs text-[#B8422B] text-center font-medium">€ 2.000–5.000+</span>
                      <span className="text-xs text-[#14603F] text-center font-medium">€ {fmt(c.sperr)} (fix)</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-[#EDF9F4] rounded-[10px] p-3">
                  <div className="text-xs font-medium text-[#14603F] mb-0.5">€ {fmt(c.sperr)} Sperrjahr-Begleitung =</div>
                  <div className="text-[22px] font-medium text-[#1A7A5A]">€ 300 / Monat</div>
                  <div className="text-xs text-stone-500 mt-1">Zum Vergleich: Eine laufende StB-Betreuung für eine GmbH kostet ab € 249/Monat — und die Holding existiert danach immer noch.</div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-[#1C1917] rounded-[10px] p-4 flex justify-between items-center">
            <div>
              <div className="text-[11px] text-stone-400 uppercase tracking-wide mb-0.5">Gesamtkosten einmalig</div>
              <div className="text-[11px] text-stone-500">Danach: € 0 / Jahr. Für immer.</div>
            </div>
            <div className="text-[28px] font-medium text-stone-100">€ {fmt(c.total)}</div>
          </div>
        </div>

        <div className="bg-white border border-stone-200/60 rounded-[14px] p-6 sm:p-7 mb-4">
          <div className="text-[10px] font-medium tracking-[2px] uppercase text-stone-500 mb-4">5-Jahres-Projektion</div>
          {c.p5.map((p) => (
            <div key={p.y} className="mb-3.5">
              <div className="text-[11px] text-stone-400 mb-1">Jahr {p.y} nach heute</div>
              <Bar label="Behalten" width={p.keep} value={"€ " + fmt(p.keep)} color="#E85D40" max={mx} />
              <Bar label="Auflösen mit Rise" width={p.rise} value={"€ " + fmt(p.rise)} color="#1A7A5A" max={mx} />
            </div>
          ))}
          <div className="bg-[#EDF9F4] rounded-[10px] p-4 mt-2 border border-[#1A7A5A]/10">
            <div className="text-[13px] text-[#14603F] font-medium mb-0.5">Ersparnis nach 5 Jahren</div>
            <div className="text-[28px] font-medium text-[#1A7A5A]">€ {fmt(c.sav)}</div>
            <div className="text-xs text-stone-500 mt-1">gegenüber dem Weiterlaufen lassen der Holding</div>
          </div>
        </div>

        <div className="text-center py-5">
          <div className="text-[13px] text-stone-500 mb-3 leading-relaxed">Jede Holding, die nicht aufgelöst wird, kostet Sie € {fmt(c.pa)} pro Jahr — für nichts.</div>
          <a href="mailto:felix@rise-transitions.de?subject=Ersteinschätzung%20Holding-Liquidation">
            <button className="text-sm font-medium bg-[#1C1917] text-stone-100 border-none py-3 px-8 rounded-lg cursor-pointer tracking-wide hover:bg-stone-800 active:scale-[0.97] transition-all">Kostenlose Ersteinschätzung anfordern</button>
          </a>
          <div className="text-[10px] text-stone-400 mt-2.5">Rise koordiniert die gesamte Abwicklung — Sie müssen nichts selbst organisieren.</div>
        </div>
        <div className="border-t border-stone-200 mt-5 pt-3 text-[10px] text-stone-400 leading-relaxed text-center">
          Alle Preise netto zzgl. USt. Notarkosten (ca. € 150–300) nicht enthalten. Sperrjahr: mind. 12 Monate (§ 73 GmbHG). Tatsächliche Kosten abhängig vom Einzelfall. Keine Rechtsberatung.
        </div>
      </div>
    </div>
  );
}
