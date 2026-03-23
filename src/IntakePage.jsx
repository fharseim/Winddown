import { useReducer, useState, useEffect, useRef } from 'react'

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
  // Step 3b — HR validation
  hrbNummer: '',
  hrValidated: false,
  hrMatchedCompany: null,
  hrDocuments: null,   // null | { available_types, dokumente } — fetched in background after company confirm
  // Step 5 (was 4)
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

function StepNav({ onBack, onNext, nextDisabled, isLast, onSubmit, submitting }) {
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
          disabled={nextDisabled || submitting}
          className="font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-8 py-4 rounded hover:bg-rise-dark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {submitting ? 'Wird gesendet …' : 'Kostenlose Ersteinschätzung anfragen'}
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
            { value: 'GmbH & Co. KG', label: 'GmbH & Co. KG' },
            { value: 'KG', label: 'KG (Kommanditgesellschaft)' },
            { value: 'OHG', label: 'OHG (Offene Handelsgesellschaft)' },
            { value: 'PartG', label: 'PartG (Partnerschaftsgesellschaft)' },
            { value: 'PartG mbB', label: 'PartG mbB' },
            { value: 'eG', label: 'eG (eingetragene Genossenschaft)' },
            { value: 'e.V.', label: 'e.V. (eingetragener Verein)' },
            { value: 'Stiftung', label: 'Stiftung' },
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

// ─── Rechtsform Badge ─────────────────────────────────────────────────────────

const RECHTSFORM_COLORS = {
  'GmbH':                    'bg-blue-100 text-blue-700',
  'UG (haftungsbeschränkt)': 'bg-sky-100 text-sky-700',
  'GmbH & Co. KG':           'bg-amber-100 text-amber-700',
  'KG':                      'bg-orange-100 text-orange-700',
  'OHG':                     'bg-yellow-100 text-yellow-700',
  'PartG':                   'bg-teal-100 text-teal-700',
  'PartG mbB':               'bg-cyan-100 text-cyan-700',
  'eG':                      'bg-emerald-100 text-emerald-700',
  'e.V.':                    'bg-lime-100 text-lime-700',
  'Stiftung':                'bg-rose-100 text-rose-700',
}

function RechtsformBadge({ rechtsform }) {
  const color = RECHTSFORM_COLORS[rechtsform] || 'bg-stone-100 text-stone-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-sans font-semibold ${color}`}>
      {rechtsform}
    </span>
  )
}

// ─── Step 3b: Handelsregister Validation ─────────────────────────────────────

function Step3b({ state, dispatch, onBack, onNext }) {
  const [loadingDataset, setLoadingDataset] = useState(true)
  const [loadingLive, setLoadingLive] = useState(true)
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(state.hrMatchedCompany)
  const [searchError, setSearchError] = useState(null)

  const loading = loadingDataset || loadingLive

  useEffect(() => {
    let cancelled = false
    setLoadingDataset(true)
    setLoadingLive(true)
    setSearchError(null)
    setResults([])

    const apiToken = import.meta.env.VITE_INTERNAL_API_TOKEN || ''
    const headers = apiToken ? { 'x-api-token': apiToken } : {}

    // 1) Static dataset — fast
    fetch(`/api/companies?q=${encodeURIComponent(state.firmenname)}&limit=5`, { headers })
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          const datasetResults = (data.results || []).map(c => ({ ...c, source: 'dataset' }))
          setResults(prev => mergeResults(prev, datasetResults))
          setLoadingDataset(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingDataset(false)
      })

    // 2) Live Handelsregister search
    fetch(`/api/hr-search?q=${encodeURIComponent(state.firmenname)}`, { headers })
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          const liveResults = (data.results || []).map(c => ({ ...c, source: c.source || 'handelsregister.de' }))
          setResults(prev => mergeResults(prev, liveResults))
          setLoadingLive(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingLive(false)
      })

    return () => { cancelled = true }
  }, [state.firmenname])

  // Merge: live HR results first, then dataset; deduplicate by register_nummer+gericht
  function mergeResults(existing, incoming) {
    const combined = [...incoming, ...existing]
    const seen = new Set()
    return combined.filter(c => {
      const key = `${c.register_nummer}|${c.register_gericht}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  function selectCompany(company) {
    setSelected(company)
    dispatch({ field: 'hrMatchedCompany', value: company })
    dispatch({ field: 'hrValidated', value: true })
    dispatch({ field: 'hrbNummer', value: `${company.register_art} ${company.register_nummer} ${company.register_gericht}` })

    // Background fetch of document list — silently, no loading state shown to user
    if (company.register_art && company.register_nummer) {
      const apiToken = import.meta.env.VITE_INTERNAL_API_TOKEN || ''
      const headers  = apiToken ? { 'x-api-token': apiToken } : {}
      const params   = new URLSearchParams({
        registerArt:     company.register_art,
        registerNummer:  company.register_nummer,
        registerGericht: company.register_gericht || '',
      })
      fetch(`/api/hr-documents?${params}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.documents) {
            dispatch({ field: 'hrDocuments', value: data.documents })
          }
        })
        .catch(() => { /* silent — non-critical */ })
    }
  }

  function proceedManually() {
    dispatch({ field: 'hrMatchedCompany', value: null })
    dispatch({ field: 'hrValidated', value: false })
    onNext()
  }

  return (
    <div>
      <StepHeader
        title="Gesellschaft bestätigen"
        subtitle={`Wir gleichen Ihre Angaben für „${state.firmenname}" mit dem Handelsregister ab.`}
      />

      <div className="bg-rise-sage/10 border border-rise-sage/30 rounded-lg px-5 py-4 mb-6 flex items-start gap-3">
        <svg className="w-4 h-4 text-rise-sage mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-sans font-light text-rise-dark text-sm leading-relaxed">
          Wir gleichen Ihre Angaben mit dem Handelsregister ab, um Tippfehler zu vermeiden. Dieser Schritt ist optional — Sie können jederzeit mit manuellen Angaben fortfahren.
          <span className="block mt-1 text-rise-muted">Hinweis: Die Handelsregister-Suche ist für GmbHs und Personengesellschaften verfügbar.</span>
        </p>
      </div>

      {/* Loading states — show partial results as they arrive */}
      {loadingDataset && results.length === 0 && (
        <div className="flex items-center gap-3 py-8 justify-center">
          <svg className="animate-spin h-5 w-5 text-rise-sage" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-sans text-sm text-rise-muted">Suche in der Datenbank…</span>
        </div>
      )}

      {searchError && (
        <p className="font-sans text-sm text-rise-muted text-center py-6">{searchError}</p>
      )}

      {!loading && !searchError && results.length === 0 && (
        <div className="text-center py-8">
          <p className="font-sans text-sm text-rise-muted">Kein Ergebnis gefunden.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3 mb-4">
          {results.map(company => {
            const isSelected = selected?.id === company.id
            const isLive = company.source === 'handelsregister.de'
            return (
              <button
                key={company.id}
                type="button"
                onClick={() => selectCompany(company)}
                className={`w-full text-left px-5 py-4 rounded-lg border-2 transition-all duration-150 ${
                  isSelected
                    ? 'border-rise-coral bg-rise-coral/5'
                    : 'border-rise-border bg-white hover:border-rise-muted-light'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className={`font-sans font-medium text-sm ${isSelected ? 'text-rise-coral' : 'text-rise-dark'}`}>
                      {company.firma_name}
                    </p>
                    <p className="font-sans font-light text-xs text-rise-muted mt-1">
                      {company.register_art} {company.register_nummer} · {company.register_gericht}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <RechtsformBadge rechtsform={company.rechtsform} />
                      <span className="font-sans font-light text-xs text-rise-muted">{company.sitz}</span>
                      {isLive
                        ? <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-100 text-emerald-700 tracking-wide">Live</span>
                        : <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-stone-100 text-stone-500 tracking-wide">Datenbank</span>
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-sans font-medium ${
                      company.status === 'aktiv' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {company.status === 'aktiv' ? 'Aktiv' : 'Gelöscht'}
                    </span>
                    {isSelected && (
                      <svg className="w-5 h-5 text-rise-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <p className="font-sans text-xs font-medium text-rise-coral mt-2">Das ist meine Gesellschaft ✓</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Live search spinner — shown while HR search is in flight, even if dataset results are visible */}
      {loadingLive && !loadingDataset && (
        <div className="flex items-center gap-2 py-3 text-xs text-rise-muted font-sans">
          <svg className="animate-spin h-3.5 w-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Suche im Handelsregister…
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-rise-border">
        <button
          type="button"
          onClick={onBack}
          className="font-sans font-medium text-sm text-rise-muted hover:text-rise-dark transition-colors duration-150 flex items-center gap-1.5"
        >
          ← Zurück
        </button>
        <div className="flex flex-col items-end gap-2">
          {selected ? (
            <button
              type="button"
              onClick={onNext}
              className="font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-7 py-3 rounded hover:bg-rise-dark transition-colors duration-200"
            >
              Weiter →
            </button>
          ) : (
            <button
              type="button"
              onClick={proceedManually}
              className="font-sans font-medium text-sm tracking-wide bg-rise-coral text-white px-7 py-3 rounded hover:bg-rise-dark transition-colors duration-200"
            >
              Weiter →
            </button>
          )}
          <button
            type="button"
            onClick={proceedManually}
            className="font-sans text-xs text-rise-muted hover:text-rise-dark transition-colors duration-150 underline underline-offset-2"
          >
            Meine Gesellschaft ist nicht dabei — mit manuellen Angaben fortfahren
          </button>
        </div>
      </div>
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
        label="Schritt 5"
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
        label="Schritt 6"
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
        label="Schritt 7"
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
        label="Schritt 8"
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

// ─── Step 8: Satzung Upload ───────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Step8({ satzungFile, setSatzungFile, onBack, onNext }) {
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState(null)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    setFileError(null)
    if (file.type !== 'application/pdf') {
      setFileError('Bitte nur PDF-Dateien hochladen.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Die Datei darf maximal 10 MB groß sein.')
      return
    }
    setSatzungFile(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      <StepHeader
        label="Schritt 9"
        title="Satzung der Gesellschaft"
        subtitle="Laden Sie die aktuelle Satzung Ihrer Gesellschaft als PDF hoch. Wir prüfen diese auf besondere Auflösungsklauseln, Mehrheitserfordernisse und Abfindungsregelungen, die den Ablauf beeinflussen können."
      />

      <InfoCard>
        Optional — falls Sie die Satzung nicht zur Hand haben, können Sie diese auch später nachreichen.
      </InfoCard>

      {!satzungFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-150 ${
            dragging
              ? 'border-rise-coral bg-rise-coral/5'
              : 'border-rise-border hover:border-rise-muted-light bg-white'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="text-4xl mb-3">📄</div>
          <p className="font-sans font-medium text-sm text-rise-dark">
            PDF hier ablegen oder klicken zum Auswählen
          </p>
          <p className="font-sans text-xs text-rise-muted-light mt-1">Nur PDF, max. 10 MB</p>
        </div>
      ) : (
        <div className="flex items-center gap-4 border border-rise-sage/40 rounded-lg px-5 py-4 bg-rise-sage/5">
          <span className="text-2xl">📄</span>
          <div className="flex-1 min-w-0">
            <p className="font-sans font-medium text-sm text-rise-dark truncate">{satzungFile.name}</p>
            <p className="font-sans text-xs text-rise-muted-light mt-0.5">{formatFileSize(satzungFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => { setSatzungFile(null); setFileError(null) }}
            className="text-rise-muted-light hover:text-rise-dark transition-colors duration-150 text-xl leading-none w-6 h-6 flex items-center justify-center"
            aria-label="Datei entfernen"
          >
            ×
          </button>
        </div>
      )}

      {fileError && (
        <p className="font-sans text-xs text-rise-coral mt-3">{fileError}</p>
      )}

      <StepNav onBack={onBack} onNext={onNext} />
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

// ─── Step 9: Zusammenfassung ──────────────────────────────────────────────────

function SuccessScreen() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="text-center py-16 transition-all duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rise-sage/20 mb-6">
        <svg className="w-8 h-8 text-rise-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-serif font-normal text-rise-dark text-3xl md:text-4xl mb-4">
        Vielen Dank!
      </h2>
      <p className="font-sans font-light text-rise-muted text-base leading-relaxed max-w-sm mx-auto mb-10">
        Ihre Anfrage ist eingegangen. Wir melden uns innerhalb von 48 Stunden bei Ihnen.
      </p>
      <a
        href="/"
        className="font-sans font-medium text-sm text-rise-coral hover:text-rise-dark transition-colors duration-150 flex items-center justify-center gap-1.5"
      >
        ← Zurück zur Startseite
      </a>
    </div>
  )
}

function Step9({ state, satzungFile, onBack }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const formData = new FormData()
      formData.append('data', JSON.stringify(state))
      if (satzungFile) {
        formData.append('satzung', satzungFile)
      }

      const res = await fetch('/api/intake', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Unbekannter Fehler')
      }

      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Fehler beim Senden. Bitte versuchen Sie es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return <SuccessScreen />
  }

  return (
    <div>
      <StepHeader
        label="Schritt 10"
        title="Zusammenfassung"
        subtitle="Bitte prüfen Sie Ihre Angaben. Sie können einzelne Abschnitte aufklappen und zurückgehen, um Korrekturen vorzunehmen."
      />

      <div className="space-y-3 mb-8">
        {SECTIONS.map((s) => (
          <SummarySection key={s.title} section={s} state={state} />
        ))}
      </div>

      {state.hrDocuments && (state.hrDocuments.available_types?.length > 0 || state.hrDocuments.dokumente?.length > 0) && (
        <div className="border border-blue-200 rounded-lg px-5 py-4 bg-blue-50/50 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="font-sans text-sm font-medium text-blue-700">
              Im Handelsregister gefundene Dokumente
              {state.hrDocuments.dokumente?.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {state.hrDocuments.dokumente.length} Dokument{state.hrDocuments.dokumente.length !== 1 ? 'e' : ''}
                </span>
              )}
            </p>
          </div>
          {state.hrDocuments.available_types?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {state.hrDocuments.available_types.map(t => (
                <span key={t} className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-white text-blue-600 border border-blue-200">
                  {t}
                </span>
              ))}
            </div>
          )}
          {state.hrDocuments.dokumente?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {state.hrDocuments.dokumente.slice(0, 5).map(doc => (
                <li key={doc.id} className="font-sans text-xs text-blue-700 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                  {doc.name}
                </li>
              ))}
              {state.hrDocuments.dokumente.length > 5 && (
                <li className="font-sans text-xs text-blue-500">
                  + {state.hrDocuments.dokumente.length - 5} weitere
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {satzungFile && (
        <div className="flex items-center gap-3 border border-rise-sage/40 rounded-lg px-5 py-3 bg-rise-sage/5 mb-8">
          <span className="text-lg">📄</span>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm text-rise-dark truncate">{satzungFile.name}</p>
            <p className="font-sans text-xs text-rise-muted-light">{formatFileSize(satzungFile.size)}</p>
          </div>
          <span className="font-sans text-xs text-rise-sage font-medium">Anhang</span>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 mb-6">
          <p className="font-sans text-sm text-red-700">{submitError}</p>
        </div>
      )}

      <StepNav
        onBack={onBack}
        isLast
        onSubmit={handleSubmit}
        submitting={submitting}
      />
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

const TOTAL_STEPS = 10

export default function IntakePage() {
  const [step, setStep] = useState(1)
  const [state, dispatch] = useReducer(reducer, initialState)
  const [satzungFile, setSatzungFile] = useState(null)

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
            {step === 1  && <Step1 {...stepProps} />}
            {step === 2  && <Step2 {...stepProps} />}
            {step === 3  && <Step3 {...stepProps} />}
            {step === 4  && <Step3b {...stepProps} />}
            {step === 5  && <Step4 {...stepProps} />}
            {step === 6  && <Step5 {...stepProps} />}
            {step === 7  && <Step6 {...stepProps} />}
            {step === 8  && <Step7 {...stepProps} />}
            {step === 9  && (
              <Step8
                satzungFile={satzungFile}
                setSatzungFile={setSatzungFile}
                onBack={back}
                onNext={next}
              />
            )}
            {step === 10 && (
              <Step9
                state={state}
                satzungFile={satzungFile}
                onBack={back}
              />
            )}
          </StepWrapper>
        </div>
      </main>
    </div>
  )
}
