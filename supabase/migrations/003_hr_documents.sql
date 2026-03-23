-- HR document storage
-- Caches documents downloaded from handelsregister.de (SI=XML, AD=PDF, CD=PDF)

CREATE TABLE hr_documents (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_art    TEXT NOT NULL,          -- 'HRB', 'HRA', etc.
  register_nummer TEXT NOT NULL,
  register_gericht TEXT,
  doc_type     TEXT NOT NULL,            -- 'SI', 'AD', 'CD'
  content_type TEXT NOT NULL,            -- MIME type
  file_data    BYTEA NOT NULL,           -- raw document bytes
  file_size    INTEGER,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hr_documents_register
  ON hr_documents(register_art, register_nummer, register_gericht, doc_type);

CREATE INDEX idx_hr_documents_downloaded
  ON hr_documents(downloaded_at DESC);

COMMENT ON TABLE hr_documents IS
  'Documents fetched from handelsregister.de. doc_type: SI=Strukturdaten (XML), AD=Aktueller Abdruck (PDF), CD=Chronologischer Abdruck (PDF)';
