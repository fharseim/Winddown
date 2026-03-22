#!/usr/bin/env node
/**
 * Import Handelsregister data from OffeneRegister.de into Supabase.
 *
 * Data source: https://offeneregister.de (CC BY 4.0)
 * The full dataset is available as a JSON lines (.jsonl) file.
 *
 * ## Setup
 *
 * 1. Install dependencies (from repo root):
 *    npm install @supabase/supabase-js
 *
 * 2. Set environment variables:
 *    export VITE_SUPABASE_URL=https://your-project.supabase.co
 *    export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *
 * 3. Download the dataset:
 *    curl -L -o /tmp/offeneregister.jsonl.gz \
 *      "https://db.offeneregister.de/offeneregister.jsonl.gz"
 *    gunzip /tmp/offeneregister.jsonl.gz
 *
 * 4. Run this script:
 *    node scripts/import-handelsregister.js --file /tmp/offeneregister.jsonl
 *
 * ## Options
 *
 *   --file <path>     Path to the .jsonl file (required)
 *   --limit <n>       Import only first N records (useful for testing)
 *   --batch <n>       Batch size for upserts (default: 500)
 *
 * ## Notes
 *
 * - Duplicates are handled via ON CONFLICT on (register_art, register_nummer, register_gericht).
 * - This script can be run repeatedly — existing records are updated.
 * - Expected runtime for the full dataset (~5M records): ~60–90 minutes.
 */

import { createClient } from '@supabase/supabase-js'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { createGunzip } from 'zlib'
import { parseArgs } from 'util'
import path from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    file:  { type: 'string' },
    limit: { type: 'string' },
    batch: { type: 'string' },
  },
  strict: false,
})

const FILE_PATH  = args.file
const LIMIT      = args.limit ? parseInt(args.limit, 10) : Infinity
const BATCH_SIZE = args.batch ? parseInt(args.batch, 10) : 500

if (!FILE_PATH) {
  console.error('Usage: node scripts/import-handelsregister.js --file <path-to.jsonl>')
  process.exit(1)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(str) {
  if (!str) return null
  return str.toLowerCase().trim().replace(/\s+/g, ' ')
}

function parseRecord(line) {
  try {
    const raw = JSON.parse(line)

    // OffeneRegister.de field mapping
    const registerArt    = raw.Registerart || null
    const registerNummer = raw.Registernummer || null
    const registerGericht = raw.Registergericht || null
    const firmaName      = raw.Name || raw.Firma || null

    if (!firmaName) return null

    return {
      register_art:          registerArt,
      register_nummer:       registerNummer,
      register_gericht:      registerGericht,
      firma_name:            firmaName,
      firma_name_normalized: normalize(firmaName),
      rechtsform:            raw.Rechtsform || null,
      sitz:                  raw.Ort || raw.Sitz || null,
      status:                raw.deleted ? 'geloescht' : 'aktiv',
      letzte_aenderung:      raw.zuletzt_geaendert ? raw.zuletzt_geaendert.slice(0, 10) : null,
      raw_data:              raw,
    }
  } catch {
    return null
  }
}

async function upsertBatch(batch) {
  const { error } = await supabase
    .from('companies')
    .upsert(batch, {
      onConflict: 'register_art,register_nummer,register_gericht',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('Upsert error:', error.message)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Importing from: ${FILE_PATH}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  if (LIMIT !== Infinity) console.log(`Limit: ${LIMIT} records`)

  const isGzipped = FILE_PATH.endsWith('.gz')
  let stream = createReadStream(path.resolve(FILE_PATH))
  if (isGzipped) stream = stream.pipe(createGunzip())

  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  let batch = []
  let total = 0
  let errors = 0
  let lineNum = 0

  for await (const line of rl) {
    lineNum++
    if (!line.trim()) continue
    if (total >= LIMIT) break

    const record = parseRecord(line)
    if (!record) {
      errors++
      continue
    }

    batch.push(record)
    total++

    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch)
      batch = []
      process.stdout.write(`\r  Processed: ${total.toLocaleString()} records`)
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await upsertBatch(batch)
  }

  console.log(`\n\nDone.`)
  console.log(`  Total imported: ${total.toLocaleString()}`)
  console.log(`  Parse errors:   ${errors.toLocaleString()}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
