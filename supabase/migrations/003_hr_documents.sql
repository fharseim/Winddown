-- HR document storage: cached downloads from handelsregister.de

CREATE TABLE hr_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Company identifier (mirrors the search params)
  register_art     TEXT NOT NULL,
  register_nummer  TEXT NOT NULL,
  register_gericht TEXT NOT NULL,

  -- Document classification
  doc_type    TEXT NOT NULL, -- 'SI', 'AD', 'CD', 'DK'
  doc_name    TEXT,          -- human-readable name / DK document title
  doc_date    DATE,          -- date of the document if known

  -- Case linkage (optional — documents can exist before a case is created)
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,

  -- Content
  content_type TEXT,    -- 'application/pdf' | 'application/xml'
  file_size    INTEGER,
  storage_url  TEXT,    -- future: Supabase Storage / Vercel Blob URL
  raw_content  BYTEA,   -- temporary: small docs stored directly (< 1 MB)

  -- Parsed data (from SI XML)
  parsed_data JSONB,    -- { firma, stammkapital, adresse, gesellschafter[], geschaeftsfuehrer[] }

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  fetched_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (register_art, register_nummer, register_gericht, doc_type, COALESCE(doc_name, ''))
);

CREATE INDEX idx_hr_documents_company
  ON hr_documents (register_art, register_nummer, register_gericht);

CREATE INDEX idx_hr_documents_case
  ON hr_documents (case_id)
  WHERE case_id IS NOT NULL;

CREATE INDEX idx_hr_documents_type
  ON hr_documents (doc_type);

COMMENT ON TABLE hr_documents IS
  'Cached documents fetched from handelsregister.de. SI = structured XML, AD = current register extract PDF, DK = specific document from the document tree.';

COMMENT ON COLUMN hr_documents.parsed_data IS
  'Structured data extracted from SI (XML) documents: Gesellschafter, Geschäftsführer, Stammkapital, Adresse.';
