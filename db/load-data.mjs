// One-off loader: parse the public-schema COPY blocks from the Supabase cluster
// dump and insert them into Neon over HTTP. Run with: node db/load-data.mjs
//
// Why this exists: the dump is a full pg_dumpall cluster dump (Supabase roles +
// internal schemas) and `psql`/`pg_restore` are unavailable in this environment.
// The Drizzle schema is created separately via `drizzle-kit push`; this script
// only loads the row data for the public app tables.
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

const DUMP = process.env.DUMP_PATH
  || '/mnt/c/Users/micha/Downloads/db_cluster-25-12-2025@16-10-19.backup/db_cluster-25-12-2025@16-10-19.backup'

const sql = neon(process.env.DATABASE_URL)
const dump = readFileSync(DUMP, 'utf8')
const lines = dump.split('\n')

// Unescape a single field from pg COPY text format. `\N` => null.
function unescape(field) {
  if (field === '\\N') return null
  return field.replace(/\\(.)/g, (_, c) => {
    switch (c) {
      case 'n': return '\n'
      case 't': return '\t'
      case 'r': return '\r'
      case '\\': return '\\'
      default: return c
    }
  })
}

// Extract the rows of a `COPY public.<table> (cols) FROM stdin;` block.
function extractBlock(table) {
  const start = lines.findIndex((l) => l.startsWith(`COPY public.${table} `))
  if (start === -1) throw new Error(`COPY block for ${table} not found`)
  const header = lines[start]
  const cols = header.slice(header.indexOf('(') + 1, header.indexOf(')')).split(',').map((c) => c.trim())
  const rows = []
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === '\\.') break
    if (lines[i] === '') continue
    rows.push(lines[i].split('\t').map(unescape))
  }
  return { cols, rows }
}

// Insert rows for a table. `jsonbCols` get a ::jsonb cast; `boolCols` map t/f.
async function load(table, { jsonbCols = [], boolCols = [] } = {}) {
  const { cols, rows } = extractBlock(table)
  for (const row of rows) {
    const values = row.map((v, i) => {
      if (v === null) return null
      if (boolCols.includes(cols[i])) return v === 't'
      return v
    })
    const placeholders = cols.map((c, i) => (jsonbCols.includes(c) ? `$${i + 1}::jsonb` : `$${i + 1}`))
    const text = `INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`
    await sql.query(text, values)
  }
  return rows.length
}

const n1 = await load('ai_personas', { boolCols: ['active'] })
console.log(`ai_personas: inserted ${n1}`)
const n2 = await load('drafts', { jsonbCols: ['image_urls'] })
console.log(`drafts: inserted ${n2}`)
const n3 = await load('council_feedback')
console.log(`council_feedback: inserted ${n3}`)

// Verify final counts.
const counts = await sql`
  select 'ai_personas' t, count(*)::int n from public.ai_personas
  union all select 'drafts', count(*)::int from public.drafts
  union all select 'council_feedback', count(*)::int from public.council_feedback
  union all select 'ab_tests', count(*)::int from public.ab_tests
  union all select 'ab_test_variants', count(*)::int from public.ab_test_variants
  union all select 'ab_test_evaluations', count(*)::int from public.ab_test_evaluations
  order by t`
console.log('\nfinal row counts:')
for (const r of counts) console.log(`  ${r.t}: ${r.n}`)
