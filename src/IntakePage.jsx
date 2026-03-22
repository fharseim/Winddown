import { useReducer, useState, useEffect } from 'react'

// ─── State ───────────────────────────────────────────────────────────────────

const initialState = {
  // Step 1
  name: '',
  email: '',
  telefon: '',
  // Step 2
  rolle: '',
  // Step 3
  firmenname: '',
  rechtsform: 'GmbH',
  gruendungsjahr: '',
  sitz: '',
  // Step 4
  operativAktiv: '',
  hatMitarbeiter: '',
  mitarbeiterAnzahl: '',
  offeneVerbindlichkeiten: '',
  // Step 5
  jahresabschluesseAktuell: '',
  jahreRueckstand: '',
  hatSteuerberater: '',
  // Step 6
  gesellschafterAnzahl: '',
  hatVSOPESOP: '',
  hatInstitutionelleInvestoren: '',
  // Step 7
  vermogenSchuldenfrei: '',
}

function reducer(state, action) {
  return { ...state, [action.field]: action.value }
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-rise-bg-warm/95 backdrop-blur-sm border-b border-rise-border">
      <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="/"
          className="font-serif text-rise-dark tracking-logo text-2xl uppercase hover:text-rise-coral transition-colors duration-200"
        >
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

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-rise-bg-warm">
      <div className="h-0.5 bg-rise-border">
        <div
          className="h-full bg-rise-coral transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="max-w-2xl mx-auto px-6 py-2 flex items-center justify-between">
        <span className="font-sans text-xs text-rise-muted-light">
          Schritt {current} von {total}
        </span>
        <span className="font-sans text-xs text-rise-muted-light">{pct}%</span>
      </div>
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function StepHeader({ label, title, subtitle }) {
  return (
    <div className="mb-8">
      {label && (
        <p className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-rise-coral mb-4">
          {label}
        </p>
      )}
      <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl leading-tight mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="font-sans font-light text-rise-muted text-base leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}

function TextInput({ label, type = 'text', value, onChange, placeholder, required, optional }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-sm font-medium text-rise-dark flex items-center gap-2">
        {label}
        {optional && (
          <span className="text-xs font-light text-rise-muted-light">(optional)</span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="font-sans font-light text-rise-dark text-base border border-rise-border rounded px-4 py-3 bg-white placeholder:text-rise-muted-light focus:outline-none focus:border-rise-coral focus:ring-1 focus:ring-rise-coral/30 transition-colors duration-150"
      />
    </div>
  )
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-sm font-medium text-rise-dark">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-sans font-light text-rise-dark text-base border border-rise-border rounded px-4 py-3 bg-white focus:outline-none focus:border-rise-coral focus:ring-1 focus:ring-rise-coral/30 transition-colors duration-150 appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ToggleCards({ options, value, onChange, columns = 2 }) {
  return (
    <div className={`grid gap-3 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-left px-5 py-4 rounded border-2 transition-all duration-150 ${
            value === opt.value
              ? 'border-rise-coral bg-rise-coral/5'
              : 'border-rise-border bg-white hover:border-rise-muted-light'
          }`}
        >
          {opt.icon && (
            <span className="text-xl block mb-2">{opt.icon}</span>
          )}
          <span
            className={`font-sans font-medium text-sm block ${
              value === opt.value ? 'text-rise-coral' : 'text-rise-dark'
            }`}
          >
            {opt.label}
          </span>
          {opt.description && (
            <span className="font-sans font-light text-xs text-rise-muted mt-0.5 block leading-relaxed">
              {opt.description}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function InfoCard({ children }) {
  return (
    <div className="bg-rise-sage/10 border border-rise-sage/30 rounded-lg px-5 py-4 mb-6">
      <p className="font-sans font-light text-rise-dark text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function NoteCard({ children }) {
  return (
    <div className="bg-rise-coral/8 border border-rise-coral/20 rounded-lg px-5 py-4 mt-4">
      <p className="font-sans font-light text-rise-dark text-sm leading-relaxed">{children}</p>
    </div>
  )
}

// ─── Navigation buttons ───────────────────────────────────────────────────────

function StepNav({ onBack, onNext, nextDisabled, isLast, onSubmit }) {
  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-rise-border">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="font-sans font-medium text-sm text-rise-muted hover:text-rise-dark transition-colors duration-150 flex items-center gap-1.5"
        >
          ← Zurück
        </button>
      ) : (
        <div />
      )}
      {isLast ? (
        <button
          type="button"
          onClick={onSubmit}
          className="font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-rise-dark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={nextDisabled}
        >
          Kostenlose Ersteinschätzung anfragen
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-7 py-3 rounded hover:bg-rise-dark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Weiter →
        </button>
      )}
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ state, dispatch, onNext }) {
  const valid = state.name.trim() && state.email.trim()
  return (
    <div>
      <StepHeader
        label="Schritt 1"
        title="Wer sind Sie?"
        subtitle="Damit wir Ihre Ersteinschätzung persönlich adressieren können."
      />
      <div className="space-y-5">
        <TextInput
          label="Name"
          value={state.name}
          onChange={(v) => dispatch({ field: 'name', value: v })}
          placeholder="Vorname Nachname"
          required
        />
        <TextInput
          label="E-Mail"
          type="email"
          value={state.email}
          onChange={(v) => dispatch({ field: 'email', value: v })}
          placeholder="ihre@email.de"
          required
        />
        <TextInput
          label="Telefon"
          type="tel"
          value={state.telefon}
          onChange={(v) => dispatch({ field: 'telefon', value: v })}
          placeholder="+49 ..."
          optional
        />
      </div>
      <StepNav onNext={onNext} nextDisabled={!valid} />
    </div>
  )
}

function Step2({ state, dispatch, onBack, onNext }) {
  const roles = [
    {
      value: 'gruender',
      icon: '🚀',
      label: 'Gründer',
      description: 'Sie haben die Gesellschaft selbst gegründet.',
    },
    {
      value: 'geschaeftsfuehrer',
      icon: '🏢',
      label: 'Geschäftsführer',
      description: 'Sie sind als GF bestellt, ggf. ohne Gesellschafteranteil.',
    },
    {
      value: 'vc-fonds',
      icon: '📊',
      label: 'VC-Fonds',
      description: 'Sie verwalten Beteiligungen im Portfolio.',
    },
    {
      value: 'anwalt-berater',
      icon: '⚖️',
      label: 'Anwalt oder Berater',
      description: 'Sie beraten Mandanten bei der Abwicklung.',
    },
  ]
  return (
    <div>
      <StepHeader
        label="Schritt 2"
        title="Ihre Rolle"
        subtitle="Welche Funktion haben Sie in Bezug auf die betroffene Gesellschaft?"
      />
      <ToggleCards options={roles} value={state.rolle} onChange={(v) => dispatch({ field: 'rolle', value: v })} />
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!state.rolle} />
    </div>
  )
}

function Step3({ state, dispatch, onBack, onNext }) {
  const years = []
  for (let y = new Date().getFullYear(); y >= 1990; y--) years.push(y)
  const valid = state.firmenname.trim() && state.gruendungsjahr && state.sitz.trim()
  return (
    <div>
      <StepHeader
        label="Schritt 3"
        title="Die Gesellschaft"
        subtitle="Grundlegende Informationen zur aufzulösenden GmbH."
      />
      <div className="space-y-5">
        <TextInput
          label="Firmenname"
          value={state.firmenname}
          onChange={(v) => dispatch({ field: 'firmenname', value: v })}
          placeholder="Muster GmbH"
          required
        />
        <SelectInput
          label="Rechtsform"
          value={state.rechtsform}
          onChange={(v) => dispatch({ field: 'rechtsform', value: v })}
          options={[
            { value: 'GmbH', label: 'GmbH' },
            { value: 'UG (haftungsbeschränkt)', label: 'UG (haftungsbeschränkt)' },
          ]}
        />
        <SelectInput
          label="Gründungsjahr"
          value={state.gruendungsjahr}
          onChange={(v) => dispatch({ field: 'gruendungsjahr', value: v })}
          options={[
            { value: '', label: 'Bitte wählen ...' },
            ...years.map((y) => ({ value: String(y), label: String(y) })),
          ]}
        />
        <TextInput
          label="Sitz der Gesellschaft"
          value={state.sitz}
          onChange={(v) => dispatch({ field: 'sitz', value: v })}
          placeholder="z.B. Berlin"
          required
        />
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  )
}

function Step4({ state, dispatch, onBack, onNext }) {
  const valid =
    state.operativAktiv &&
    state.hatMitarbeiter &&
    state.offeneVerbindlichkeiten &&
    (state.hatMitarbeiter !== 'ja' || state.mitarbeiterAnzahl.trim())

  return (
    <div>
      <StepHeader
        label="Schritt 4"
        title="Aktueller Status"
        subtitle="Helfen Sie uns, die aktuelle Lage der Gesellschaft einzuschätzen."
      />
      <div className="space-y-8">
        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Ist die Gesellschaft noch operativ aktiv?
          </p>
          <ToggleCards
            options={[
              { value: 'ja', label: 'Ja', description: 'Es gibt noch laufende Aktivitäten.' },
              { value: 'nein', label: 'Nein', description: 'Die Gesellschaft ruht vollständig.' },
            ]}
            value={state.operativAktiv}
            onChange={(v) => dispatch({ field: 'operativAktiv', value: v })}
          />
        </div>

        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Gibt es aktuell noch Mitarbeiter?
          </p>
          <ToggleCards
            options={[
              { value: 'ja', label: 'Ja' },
              { value: 'nein', label: 'Nein' },
            ]}
            value={state.hatMitarbeiter}
            onChange={(v) => dispatch({ field: 'hatMitarbeiter', value: v })}
          />
          {state.hatMitarbeiter === 'ja' && (
            <div className="mt-4">
              <TextInput
                label="Wie viele Mitarbeiter?"
                type="number"
                value={state.mitarbeiterAnzahl}
                onChange={(v) => dispatch({ field: 'mitarbeiterAnzahl', value: v })}
                placeholder="Anzahl"
                required
              />
            </div>
          )}
        </div>

        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Gibt es offene Verbindlichkeiten oder bekannte Gläubiger?
          </p>
          <ToggleCards
            options={[
              { value: 'ja', label: 'Ja', description: 'Bekannte Schulden oder Gläubiger.' },
              { value: 'nein', label: 'Nein', description: 'Keine Verbindlichkeiten bekannt.' },
              { value: 'unsicher', label: 'Unsicher', description: 'Unklar, muss geprüft werden.' },
            ]}
            value={state.offeneVerbindlichkeiten}
            onChange={(v) => dispatch({ field: 'offeneVerbindlichkeiten', value: v })}
            columns={3}
          />
        </div>
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  )
}

function Step5({ state, dispatch, onBack, onNext }) {
  const valid = state.jahresabschluesseAktuell && state.hatSteuerberater &&
    (state.jahresabschluesseAktuell !== 'nein' || state.jahreRueckstand)

  return (
    <div>
      <StepHeader
        label="Schritt 5"
        title="Steuerliche Situation"
        subtitle="Der steuerliche Status beeinflusst den Liquidationspfad."
      />
      <div className="space-y-8">
        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Sind alle Jahresabschlüsse aktuell eingereicht?
          </p>
          <ToggleCards
            options={[
              { value: 'ja', label: 'Ja', description: 'Alles auf dem aktuellen Stand.' },
              { value: 'nein', label: 'Nein', description: 'Es gibt Rückstände.' },
            ]}
            value={state.jahresabschluesseAktuell}
            onChange={(v) => dispatch({ field: 'jahresabschluesseAktuell', value: v })}
          />
          {state.jahresabschluesseAktuell === 'nein' && (
            <div className="mt-4">
              <SelectInput
                label="Wie viele Jahre Rückstand?"
                value={state.jahreRueckstand}
                onChange={(v) => dispatch({ field: 'jahreRueckstand', value: v })}
                options={[
                  { value: '', label: 'Bitte wählen ...' },
                  { value: '1', label: '1 Jahr' },
                  { value: '2', label: '2 Jahre' },
                  { value: '3', label: '3 Jahre' },
                  { value: '4', label: '4 Jahre' },
                  { value: '5+', label: '5 Jahre oder mehr' },
                ]}
              />
            </div>
          )}
        </div>

        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Haben Sie einen Steuerberater?
          </p>
          <ToggleCards
            options={[
              { value: 'ja', label: 'Ja', description: 'Bereits in Beratung.' },
              { value: 'nein', label: 'Nein', description: 'Rise kann einen Steuerberater koordinieren.' },
            ]}
            value={state.hatSteuerberater}
            onChange={(v) => dispatch({ field: 'hatSteuerberater', value: v })}
          />
        </div>
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  )
}

function Step6({ state, dispatch, onBack, onNext }) {
  const valid = state.gesellschafterAnzahl && state.hatVSOPESOP && state.hatInstitutionelleInvestoren

  return (
    <div>
      <StepHeader
        label="Schritt 6"
        title="Gesellschafter & Beteiligungen"
        subtitle="Die Gesellschafterstruktur bestimmt den Aufwand der Abwicklung."
      />
      <div className="space-y-8">
        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Wie viele Gesellschafter hat die GmbH?
          </p>
          <ToggleCards
            options={[
              { value: '1', label: '1', description: 'Alleingesellschafter.' },
              { value: '2-5', label: '2 – 5', description: 'Kleine Runde.' },
              { value: '6-10', label: '6 – 10', description: 'Mittlere Runde.' },
              { value: '10+', label: '10+', description: 'Große Gesellschafterrunde.' },
            ]}
            value={state.gesellschafterAnzahl}
            onChange={(v) => dispatch({ field: 'gesellschafterAnzahl', value: v })}
          />
        </div>

        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Gibt es VSOP/ESOP oder virtuelle Beteiligungen?
          </p>
          <ToggleCards
            options={[
              { value: 'ja', label: 'Ja' },
              { value: 'nein', label: 'Nein' },
              { value: 'unsicher', label: 'Unsicher' },
            ]}
            value={state.hatVSOPESOP}
            onChange={(v) => dispatch({ field: 'hatVSOPESOP', value: v })}
            columns={3}
          />
        </div>

        <div>
          <p className="font-sans text-sm font-medium text-rise-dark mb-3">
            Gibt es institutionelle Investoren (VCs, Business Angels)?
          </p>
          <ToggleCards
            options={[
              { value: 'ja', label: 'Ja', description: 'VCs oder Business Angels sind beteiligt.' },
              { value: 'nein', label: 'Nein', description: 'Keine externen Investoren.' },
            ]}
            value={state.hatInstitutionelleInvestoren}
            onChange={(v) => dispatch({ field: 'hatInstitutionelleInvestoren', value: v })}
          />
        </div>
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  )
}

function Step7({ state, dispatch, onBack, onNext }) {
  const valid = !!state.vermogenSchuldenfrei

  return (
    <div>
      <StepHeader
        label="Schritt 7"
        title="§ 394 FamFG — Vermögenslose Gesellschaft"
      />
      <InfoCard>
        Wenn Ihre GmbH weder Vermögen noch Schulden hat, kann unter bestimmten
        Voraussetzungen eine Löschung von Amts wegen nach § 394 FamFG beantragt
        werden. In diesem Fall entfällt das einjährige Sperrjahr, und die
        Abwicklung kann deutlich schneller abgeschlossen werden.
      </InfoCard>
      <div>
        <p className="font-sans text-sm font-medium text-rise-dark mb-3">
          Ist die Gesellschaft nach Ihrer Einschätzung vermögens- und schuldenfrei?
        </p>
        <ToggleCards
          options={[
            { value: 'ja', label: 'Ja', description: 'Keine Vermögenswerte und keine Schulden bekannt.' },
            { value: 'nein', label: 'Nein', description: 'Es gibt noch Vermögen oder Verbindlichkeiten.' },
            { value: 'unsicher', label: 'Unsicher', description: 'Unklar, muss geprüft werden.' },
          ]}
          value={state.vermogenSchuldenfrei}
          onChange={(v) => dispatch({ field: 'vermogenSchuldenfrei', value: v })}
          columns={3}
        />
        {(state.vermogenSchuldenfrei === 'ja' || state.vermogenSchuldenfrei === 'unsicher') && (
          <NoteCard>
            Wir prüfen dies im Rahmen der Ersteinschätzung für Sie. Falls § 394 FamFG
            greift, kann dies den Prozess erheblich beschleunigen.
          </NoteCard>
        )}
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  )
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

const LABELS = {
  name: 'Name',
  email: 'E-Mail',
  telefon: 'Telefon',
  rolle: 'Rolle',
  firmenname: 'Firmenname',
  rechtsform: 'Rechtsform',
  gruendungsjahr: 'Gründungsjahr',
  sitz: 'Sitz',
  operativAktiv: 'Operativ aktiv',
  hatMitarbeiter: 'Mitarbeiter vorhanden',
  mitarbeiterAnzahl: 'Anzahl Mitarbeiter',
  offeneVerbindlichkeiten: 'Offene Verbindlichkeiten',
  jahresabschluesseAktuell: 'Jahresabschlüsse aktuell',
  jahreRueckstand: 'Jahre Rückstand',
  hatSteuerberater: 'Steuerberater vorhanden',
  gesellschafterAnzahl: 'Gesellschafter',
  hatVSOPESOP: 'VSOP/ESOP vorhanden',
  hatInstitutionelleInvestoren: 'Institutionelle Investoren',
  vermogenSchuldenfrei: 'Vermögens- und schuldenfrei',
}

const ROLE_LABELS = {
  gruender: 'Gründer',
  geschaeftsfuehrer: 'Geschäftsführer',
  'vc-fonds': 'VC-Fonds',
  'anwalt-berater': 'Anwalt oder Berater',
}

function formatValue(field, value) {
  if (!value) return '—'
  if (field === 'rolle') return ROLE_LABELS[value] || value
  if (value === 'ja') return 'Ja'
  if (value === 'nein') return 'Nein'
  if (value === 'unsicher') return 'Unsicher'
  return value
}

const SECTIONS = [
  {
    title: 'Kontaktdaten',
    fields: ['name', 'email', 'telefon'],
  },
  {
    title: 'Rolle',
    fields: ['rolle'],
  },
  {
    title: 'Die Gesellschaft',
    fields: ['firmenname', 'rechtsform', 'gruendungsjahr', 'sitz'],
  },
  {
    title: 'Aktueller Status',
    fields: ['operativAktiv', 'hatMitarbeiter', 'mitarbeiterAnzahl', 'offeneVerbindlichkeiten'],
  },
  {
    title: 'Steuerliche Situation',
    fields: ['jahresabschluesseAktuell', 'jahreRueckstand', 'hatSteuerberater'],
  },
  {
    title: 'Gesellschafter & Beteiligungen',
    fields: ['gesellschafterAnzahl', 'hatVSOPESOP', 'hatInstitutionelleInvestoren'],
  },
  {
    title: '§ 394 FamFG',
    fields: ['vermogenSchuldenfrei'],
  },
]

function SummarySection({ section, state }) {
  const [open, setOpen] = useState(true)
  const entries = section.fields
    .filter((f) => {
      if (f === 'mitarbeiterAnzahl' && state.hatMitarbeiter !== 'ja') return false
      if (f === 'jahreRueckstand' && state.jahresabschluesseAktuell !== 'nein') return false
      if (f === 'telefon' && !state[f]) return false
      return true
    })
    .map((f) => ({ label: LABELS[f], value: formatValue(f, state[f]) }))

  return (
    <div className="border border-rise-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-rise-bg transition-colors duration-150"
      >
        <span className="font-sans font-medium text-sm text-rise-dark">{section.title}</span>
        <span className="text-rise-muted-light text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="bg-rise-bg-warm border-t border-rise-border divide-y divide-rise-border">
          {entries.map((e) => (
            <div key={e.label} className="flex items-start gap-4 px-5 py-3">
              <span className="font-sans text-xs font-medium text-rise-muted-light w-44 shrink-0 pt-0.5">
                {e.label}
              </span>
              <span className="font-sans font-light text-rise-dark text-sm">{e.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function buildEmailBody(state) {
  const lines = []
  lines.push('Guten Tag,')
  lines.push('')
  lines.push(
    `hiermit bitte ich um eine kostenlose Ersteinschätzung zur Auflösung der Gesellschaft "${state.firmenname || '—'}".`
  )
  lines.push('')

  for (const section of SECTIONS) {
    lines.push(`── ${section.title} ──`)
    for (const f of section.fields) {
      if (f === 'mitarbeiterAnzahl' && state.hatMitarbeiter !== 'ja') continue
      if (f === 'jahreRueckstand' && state.jahresabschluesseAktuell !== 'nein') continue
      if (f === 'telefon' && !state[f]) continue
      lines.push(`${LABELS[f]}: ${formatValue(f, state[f])}`)
    }
    lines.push('')
  }

  lines.push('Mit freundlichen Grüßen,')
  lines.push(state.name || '')
  return lines.join('\n')
}

function Step8({ state, onBack, onSubmit }) {
  const firmenname = state.firmenname || 'Unbekannte GmbH'
  const subject = encodeURIComponent(`Intake-Anfrage: ${firmenname} — Rise Ersteinschätzung`)
  const body = encodeURIComponent(buildEmailBody(state))
  const mailtoHref = `mailto:hello@risestartup.eu?subject=${subject}&body=${body}`

  return (
    <div>
      <StepHeader
        label="Schritt 8"
        title="Zusammenfassung"
        subtitle="Bitte prüfen Sie Ihre Angaben. Sie können einzelne Abschnitte aufklappen und zurückgehen, um Korrekturen vorzunehmen."
      />
      <div className="space-y-3 mb-10">
        {SECTIONS.map((s) => (
          <SummarySection key={s.title} section={s} state={state} />
        ))}
      </div>

      <div className="text-center space-y-3 pt-4">
        <a
          href={mailtoHref}
          className="inline-block font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-rise-dark transition-colors duration-200"
        >
          Kostenlose Ersteinschätzung anfragen
        </a>
        <p className="font-sans text-xs text-rise-muted-light">
          Antwort innerhalb von 48 Stunden
        </p>
      </div>

      <div className="mt-6 flex justify-start">
        <button
          type="button"
          onClick={onBack}
          className="font-sans font-medium text-sm text-rise-muted hover:text-rise-dark transition-colors duration-150 flex items-center gap-1.5"
        >
          ← Zurück
        </button>
      </div>
    </div>
  )
}

// ─── Animated wrapper ─────────────────────────────────────────────────────────

function StepWrapper({ stepKey, children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [stepKey])

  return (
    <div
      className="transition-all duration-300 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
      }}
    >
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 8

export default function IntakePage() {
  const [step, setStep] = useState(1)
  const [state, dispatch] = useReducer(reducer, initialState)

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const stepProps = { state, dispatch, onBack: back, onNext: next }

  return (
    <div className="bg-rise-bg-warm min-h-screen font-sans">
      <Nav />
      <ProgressBar current={step} total={TOTAL_STEPS} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <StepWrapper stepKey={step}>
            {step === 1 && <Step1 {...stepProps} />}
            {step === 2 && <Step2 {...stepProps} />}
            {step === 3 && <Step3 {...stepProps} />}
            {step === 4 && <Step4 {...stepProps} />}
            {step === 5 && <Step5 {...stepProps} />}
            {step === 6 && <Step6 {...stepProps} />}
            {step === 7 && <Step7 {...stepProps} />}
            {step === 8 && <Step8 state={state} onBack={back} />}
          </StepWrapper>
        </div>
      </main>
    </div>
  )
}
