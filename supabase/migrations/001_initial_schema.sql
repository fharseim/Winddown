-- Cases table (stores intake submissions)
CREATE TABLE cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'intake' CHECK (status IN ('intake', 'ersteinschaetzung', 'angebot', 'aktiv', 'abgeschlossen', 'abgebrochen')),

  -- Contact info (Step 1)
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Role (Step 2)
  rolle TEXT,

  -- Company info (Step 3)
  firma_name TEXT,
  firma_rechtsform TEXT,
  firma_gruendungsjahr INTEGER,
  firma_sitz TEXT,

  -- Handelsregister validation
  hrb_nummer TEXT,
  hr_validated BOOLEAN DEFAULT FALSE,

  -- Current status (Step 4)
  operativ_aktiv BOOLEAN,
  mitarbeiter BOOLEAN,
  mitarbeiter_anzahl INTEGER,
  glaeubiger TEXT, -- 'ja', 'nein', 'unsicher'

  -- Tax situation (Step 5)
  jahresabschluesse_aktuell BOOLEAN,
  rueckstand_jahre INTEGER,
  steuerberater BOOLEAN,

  -- Shareholders (Step 6)
  gesellschafter_anzahl TEXT,
  vsop_esop TEXT, -- 'ja', 'nein', 'unsicher'
  investoren BOOLEAN,

  -- §394 FamFG (Step 7)
  vermoegensfrei TEXT, -- 'ja', 'nein', 'unsicher'

  -- Satzung
  satzung_url TEXT,
  satzung_filename TEXT,

  -- Pricing (calculated)
  calculated_fee DECIMAL,

  -- Notes
  internal_notes TEXT
);

-- Documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL, -- 'ersteinschaetzung', 'aufloesungsbeschluss', 'kostenangebot', 'satzung'
  filename TEXT NOT NULL,
  url TEXT,
  status TEXT DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'freigegeben', 'versendet')),
  generated_by TEXT DEFAULT 'system' -- 'system' or 'manual'
);

-- Activity log
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  details TEXT,
  actor TEXT DEFAULT 'system'
);
