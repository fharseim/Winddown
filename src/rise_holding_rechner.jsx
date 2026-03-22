import { useState, useMemo } from "react";

const F = {
  sans: "'DM Sans', sans-serif",
  serif: "'DM Serif Display', serif",
};
const C = {
  bg: "#FAFAF9", bgDark: "#1C1917", bgCard: "#FFFFFF",
  coral: "#E85D40", coralLight: "#FEF0EC", coralDark: "#B8422B",
  sage: "#1A7A5A", sageLight: "#EDF9F4", sageDark: "#14603F",
  text: "#1C1917", textMuted: "#57534E", textLight: "#78716C", textFaint: "#A8A29E",
  border: "#E7E5E4", borderLight: "#F0EEEC",
  warm100: "#F5F5F4", warm200: "#E7E5E4", warm300: "#D6D3D1",
  amber: "#D97706", amberLight: "#FFFBEB", amberDark: "#92400E",
};

function fmt(n) { return n.toLocaleString("de-DE", { maximumFractionDigits: 0 }); }

function Slider({ label, value, onChange, min, max, step = 1, unit = "", hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: C.text, fontFamily: F.sans }}>
          {unit === "€" ? `€ ${fmt(value)}` : `${value}${unit}`}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: 4, appearance: "none", background: C.warm200,
          borderRadius: 2, outline: "none", cursor: "pointer",
          accentColor: C.coral,
        }}
      />
      {hint && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Toggle({ label, value, onChange, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
          {hint && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{hint}</div>}
        </div>
        <div onClick={() => onChange(!value)} style={{
          width: 44, height: 24, borderRadius: 12, cursor: "pointer", transition: "background 0.2s",
          background: value ? C.sage : C.warm300, position: "relative",
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 9, background: "#fff",
            position: "absolute", top: 3, transition: "left 0.2s",
            left: value ? 23 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, accent }) {
  const bg = accent === "coral" ? C.coralLight : accent === "sage" ? C.sageLight : accent === "amber" ? C.amberLight : C.warm100;
  const color = accent === "coral" ? C.coralDark : accent === "sage" ? C.sageDark : accent === "amber" ? C.amberDark : C.text;
  return (
    <div style={{ background: bg, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color, fontFamily: F.sans }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Bar({ label, width, value, color, max }) {
  const pct = Math.min((width / max) * 100, 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 500, color: C.text }}>{value}</span>
      </div>
      <div style={{ height: 8, background: C.warm200, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

export default function HoldingRechner({ hideHeader = false }) {
  const [jahre, setJahre] = useState(3);
  const [stbKosten, setStbKosten] = useState(2500);
  const [ihk, setIhk] = useState(200);
  const [sonstige, setSonstige] = useState(300);
  const [rueckstand, setRueckstand] = useState(true);
  const [rueckstandJahre, setRueckstandJahre] = useState(2);
  const [glaeubiger, setGlaeubiger] = useState(false);

  const calc = useMemo(() => {
    const jaehrlich = stbKosten + ihk + sonstige;
    const kumuliert = jaehrlich * jahre;
    const riseFee = glaeubiger ? 4500 : 3000;
    const altjahre = rueckstand ? rueckstandJahre * 800 : 0;
    const sperrjahr = 300 * 12;
    const riseTotal = riseFee + altjahre + sperrjahr;
    const breakEvenMonate = Math.round((riseTotal / jaehrlich) * 12);
    const proj5 = [];
    let kumuliertKeep = kumuliert;
    let kumuliertRise = kumuliert + riseTotal;
    for (let y = 1; y <= 5; y++) {
      kumuliertKeep += jaehrlich;
      proj5.push({ year: y, keep: kumuliertKeep, rise: kumuliertRise });
    }
    const ersparnis5 = proj5[4].keep - proj5[4].rise;
    return { jaehrlich, kumuliert, riseFee, altjahre, sperrjahr, riseTotal, breakEvenMonate, proj5, ersparnis5 };
  }, [jahre, stbKosten, ihk, sonstige, rueckstand, rueckstandJahre, glaeubiger]);

  const maxChart = Math.max(...calc.proj5.map(p => p.keep));

  return (
    <div style={{ fontFamily: F.sans, color: C.text, maxWidth: 680, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=DM+Serif+Display&display=swap');
input[type=range]::-webkit-slider-thumb{appearance:none;width:18px;height:18px;border-radius:50%;background:${C.coral};cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2)}
input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:${C.coral};cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2)}
`}</style>

      {/* Header */}
      {!hideHeader && (
        <div style={{ textAlign: "center", marginBottom: 32, paddingTop: 8 }}>
          <div style={{ fontFamily: F.serif, fontSize: 20, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>RISE</div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textFaint, marginBottom: 16 }}>Structured Transitions</div>
          <h1 style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 400, color: C.text, margin: "0 0 6px", lineHeight: 1.3 }}>
            Was kostet Ihre leere Holding?
          </h1>
          <p style={{ fontSize: 14, color: C.textLight, margin: 0, lineHeight: 1.6 }}>
            Berechnen Sie, wie viel Ihre inaktive Holding-Gesellschaft Sie jedes Jahr kostet — und wann sich die Auflösung rechnet.
          </p>
        </div>
      )}

      {/* Input section */}
      <div style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: C.coral, marginBottom: 16 }}>Ihre Situation</div>

        <Slider label="Holding existiert seit" value={jahre} onChange={setJahre} min={1} max={10} unit=" Jahren" hint="Jahre seit Gründung oder seit Inaktivität" />
        <Slider label="Jährliche StB-Kosten" value={stbKosten} onChange={setStbKosten} min={800} max={5000} step={100} unit="€" hint="Jahresabschluss, Steuererklärungen, Offenlegung" />
        <Slider label="IHK-Beitrag / Jahr" value={ihk} onChange={setIhk} min={0} max={500} step={25} unit="€" />
        <Slider label="Sonstige Kosten / Jahr" value={sonstige} onChange={setSonstige} min={0} max={1000} step={50} unit="€" hint="Bankkonto, Geschäftsadresse, Software" />

        <div style={{ borderTop: `0.5px solid ${C.borderLight}`, paddingTop: 16, marginTop: 8 }}>
          <Toggle label="Offenlegungsrückstände vorhanden?" value={rueckstand} onChange={setRueckstand}
            hint="Bundesanzeiger-Veröffentlichungen nicht aktuell" />
          {rueckstand && (
            <Slider label="Rückstandsjahre" value={rueckstandJahre} onChange={setRueckstandJahre} min={1} max={5} unit=" Jahre" />
          )}
          <Toggle label="Bekannte Gläubiger vorhanden?" value={glaeubiger} onChange={setGlaeubiger}
            hint="Offene Rechnungen, Darlehen, Verbindlichkeiten" />
        </div>
      </div>

      {/* Results */}
      <div style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: C.sage, marginBottom: 16 }}>Ergebnis</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <Metric label="Bisherige Kosten" value={`€ ${fmt(calc.kumuliert)}`} sub={`${jahre} Jahre × € ${fmt(calc.jaehrlich)}/Jahr`} accent="coral" />
          <Metric label="Rise-Liquidation" value={`€ ${fmt(calc.riseTotal)}`} sub={`einmalig, alles inkl.`} accent="sage" />
          <Metric label="Break-even" value={`${calc.breakEvenMonate} Monate`} sub="vs. Weiterlaufen lassen" accent="amber" />
        </div>

        {/* Cost breakdown */}
        <div style={{ background: C.warm100, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 10 }}>Rise-Kostenaufstellung</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: C.textMuted }}>
            <span>Case Fee (Fast Track)</span><span style={{ fontWeight: 500, color: C.text }}>€ {fmt(calc.riseFee)}</span>
          </div>
          {calc.altjahre > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: C.textMuted }}>
              <span>Altjahre-Cleanup ({rueckstandJahre} Jahre)</span><span style={{ fontWeight: 500, color: C.text }}>€ {fmt(calc.altjahre)}</span>
            </div>
          )}
          <div style={{ padding: "4px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textMuted }}>
              <span>Sperrjahr-Begleitung (12 Monate)</span><span style={{ fontWeight: 500, color: C.text }}>€ {fmt(calc.sperrjahr)}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 3, lineHeight: 1.5 }}>
              § 73 GmbHG schreibt 12 Monate Wartezeit vor. Rise überwacht in dieser Zeit aktiv eingehende Gläubigeranmeldungen, koordiniert Fristeinhaltung und hält das Gesellschaftskonto offen — damit Sie es nicht selbst tun müssen.
            </div>
          </div>
          <div style={{ borderTop: `0.5px solid ${C.warm200}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 500 }}>
            <span>Gesamtkosten einmalig</span><span style={{ color: C.sage }}>€ {fmt(calc.riseTotal)}</span>
          </div>
        </div>

        {/* 5-Year projection */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 12 }}>5-Jahres-Projektion: Behalten vs. Auflösen</div>
          {calc.proj5.map(p => (
            <div key={p.year} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 4 }}>Jahr {p.year}</div>
              <Bar label="Behalten" width={p.keep} value={`€ ${fmt(p.keep)}`} color={C.coral} max={maxChart} />
              <Bar label="Rise-Liquidation" width={p.rise} value={`€ ${fmt(p.rise)}`} color={C.sage} max={maxChart} />
            </div>
          ))}
        </div>

        {/* Savings callout */}
        <div style={{
          background: C.sageLight, borderRadius: 10, padding: "16px 20px",
          border: `0.5px solid ${C.sage}22`,
        }}>
          <div style={{ fontSize: 13, color: C.sageDark, fontWeight: 500, marginBottom: 2 }}>
            Ersparnis nach 5 Jahren
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, color: C.sage, fontFamily: F.sans }}>
            € {fmt(calc.ersparnis5)}
          </div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
            gegenüber dem Weiterlaufen lassen der Holding
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <div style={{ fontSize: 13, color: C.textLight, marginBottom: 12, lineHeight: 1.6 }}>
          Jede Holding, die nicht aufgelöst wird, kostet Sie € {fmt(calc.jaehrlich)} pro Jahr — für nichts.
        </div>
        <button onClick={() => sendPrompt("Ich möchte den Intake-Flow für die Holding-Liquidation sehen")} style={{
          fontFamily: F.sans, fontSize: 14, fontWeight: 500,
          background: C.bgDark, color: "#F5F5F4", border: "none",
          padding: "12px 32px", borderRadius: 8, cursor: "pointer",
          letterSpacing: 0.5, transition: "transform 0.15s",
        }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Kostenlose Ersteinschätzung anfordern ↗
        </button>
        <div style={{ fontSize: 10, color: C.textFaint, marginTop: 10 }}>
          Rise koordiniert die gesamte Abwicklung — Sie müssen nichts selbst organisieren.
        </div>
      </div>

      {/* Fine print */}
      <div style={{ borderTop: `0.5px solid ${C.border}`, marginTop: 20, paddingTop: 12, fontSize: 10, color: C.textFaint, lineHeight: 1.6, textAlign: "center" }}>
        Alle Preise netto zzgl. USt. Notarkosten (ca. € 150–300) nicht enthalten. Sperrjahr: mindestens 12 Monate (§ 73 GmbHG).
        Tatsächliche Kosten abhängig vom Einzelfall. Keine Rechtsberatung.
      </div>
    </div>
  );
}
