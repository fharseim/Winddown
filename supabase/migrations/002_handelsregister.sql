-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_nummer TEXT,
  register_art TEXT, -- 'HRB', 'HRA', etc.
  register_gericht TEXT,
  firma_name TEXT NOT NULL,
  firma_name_normalized TEXT, -- lowercase, trimmed for search
  rechtsform TEXT,
  sitz TEXT,
  status TEXT, -- 'aktiv', 'geloescht'
  letzte_aenderung DATE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_name ON companies USING gin(firma_name_normalized gin_trgm_ops);
CREATE INDEX idx_companies_register ON companies(register_art, register_nummer, register_gericht);
CREATE INDEX idx_companies_sitz ON companies(sitz);
CREATE INDEX idx_companies_rechtsform ON companies(rechtsform);

-- Supported Rechtsformen: GmbH, UG (haftungsbeschränkt), AG, SE, KGaA,
-- GmbH & Co. KG, KG, OHG, PartG, PartG mbB, eG, e.V., Stiftung
COMMENT ON COLUMN companies.rechtsform IS 'German legal form: GmbH, UG (haftungsbeschränkt), AG, SE, KGaA, GmbH & Co. KG, KG, OHG, PartG, PartG mbB, eG, e.V., Stiftung';
