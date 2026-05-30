# Supabase → Neon + Drizzle Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the app's database layer from Supabase to Neon Postgres using Drizzle ORM, load the existing Supabase data into Neon, and keep Supabase Storage untouched.

**Architecture:** A single Drizzle schema (`lib/db/schema.ts`) mirrors the existing Postgres schema exactly. A typed `db` singleton (`lib/db/index.ts`) uses the `neon-http` driver. All server-side Supabase query-builder calls (API routes + services) are rewritten to Drizzle. Browser/client components that queried Supabase directly are re-routed through server API routes (Drizzle can't run client-side). Storage code stays on Supabase.

**Tech Stack:** Next.js 16 (App Router, route handlers), TypeScript, `drizzle-orm` (`neon-http`), `@neondatabase/serverless`, `drizzle-kit`, Neon Postgres.

---

## Conventions used throughout this plan

**Drizzle schema export names (camelCase JS keys → snake_case DB columns):**

| Table | Export | Notable columns (JS key → db column) |
|---|---|---|
| `drafts` | `drafts` | `avgCringeScore→avg_cringe_score`, `avgExcitementScore→avg_excitement_score`, `qualityScore→quality_score`, `iterationCount→iteration_count`, `imageUrls→image_urls` (jsonb), `createdAt`, `updatedAt`, `status` |
| `ai_personas` | `aiPersonas` | `systemPrompt→system_prompt`, `active`, `name` (varchar 50) |
| `council_feedback` | `councilFeedback` | `draftId`, `personaId`, `cringeScore`, `excitementScore`, `critique`, `specificFix→specific_fix`, `iterationNumber→iteration_number`, `createdAt` |
| `ab_tests` | `abTests` | `draftId`, `name`, `status`, `algorithm`, `epsilon` (numeric→string), `createdAt`, `startedAt→started_at`, `endedAt→ended_at` |
| `ab_test_variants` | `abTestVariants` | `abTestId`, `name`, `content`, `totalEvaluations→total_evaluations`, `totalScore→total_score`, `avgScore→avg_score` (GENERATED, read-only), `winRate→win_rate` (numeric→string), `imageUrls→image_urls` (jsonb), `createdAt` |
| `ab_test_evaluations` | `abTestEvaluations` | `abTestId`, `variantId`, `personaId`, `score`, `preferenceRank→preference_rank`, `createdAt` |

**Query-builder → Drizzle mapping (operators imported from `drizzle-orm`):**

```
import { eq, and, inArray, desc, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { drafts, aiPersonas, councilFeedback, abTests, abTestVariants, abTestEvaluations } from '@/lib/db/schema'
```

| Supabase | Drizzle |
|---|---|
| `.from('drafts').select('*').eq('id', id).single()` | `(await db.select().from(drafts).where(eq(drafts.id, id)))[0]` |
| `.insert({...}).select().single()` | `(await db.insert(drafts).values({...}).returning())[0]` |
| `.insert([...]).select()` | `await db.insert(t).values([...]).returning()` |
| `.update({...}).eq('id', id).select().single()` | `(await db.update(drafts).set({...}).where(eq(drafts.id, id)).returning())[0]` |
| `.update({...}).eq('id', id)` (no select) | `await db.update(drafts).set({...}).where(eq(drafts.id, id))` |
| `.delete().eq('id', id)` | `await db.delete(t).where(eq(t.id, id))` |
| `.order('created_at',{ascending:false})` | `.orderBy(desc(t.createdAt))` |
| `.order('name',{ascending:true})` | `.orderBy(asc(t.name))` |
| `.range(offset, offset+limit-1)` | `.limit(limit).offset(offset)` |
| `.in('id', ids)` | `inArray(t.id, ids)` |
| `.eq('a',x).eq('b',y)` | `and(eq(t.a,x), eq(t.b,y))` |
| nested select `'*, drafts(...)'` | relational query `db.query.X.findMany({ with: { ... } })` (see Task 2) |

**Error handling shift:** Supabase returns `{ data, error }`; Drizzle throws on error and returns rows directly. Replace `if (error) { ... }` blocks with `try/catch`, and replace "no row" checks with `if (!row)` after taking `[0]`.

**Numeric columns return strings:** `epsilon`, `win_rate`, `avg_score` are Postgres `numeric` → Drizzle returns `string`. Wrap with `Number(...)` at use sites; when inserting `epsilon`, pass a string (`String(epsilon)`) or `null`.

**Insert objects use camelCase keys** (e.g. `{ draftId: id, imageUrls: [] }`), not the snake_case keys the Supabase code used.

---

## Phase 0 — Setup & data load

### Task 1: Install deps, add DB client, config, env

**Files:**
- Modify: `package.json` (deps)
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`
- Modify: `.env.local`, `env.example`
- Modify: `.gitignore` (ensure `.env*` ignored — verify only)

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv
```
Expected: packages added, no peer-dep errors.

- [ ] **Step 2: Add `DATABASE_URL` to env files**

Add to `.env.local` (value is the Neon pooled connection string provided by the user):
```
DATABASE_URL=postgresql://neondb_owner:npg_I8N7upFqMycx@ep-rapid-dream-a71elhbn-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
Add to `env.example`:
```
# Neon Postgres connection string (pooled)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

- [ ] **Step 3: Create the Drizzle client**

Create `lib/db/index.ts`:
```ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 4: Create drizzle-kit config**

Create `drizzle.config.ts`:
```ts
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 5: Verify `.gitignore` protects secrets**

Run: `grep -E '\.env' .gitignore`
Expected: `.env*` (or `.env.local`) is present. If not, add `.env*` to `.gitignore`.

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json lib/db/index.ts drizzle.config.ts env.example .gitignore
git commit -m "chore: add drizzle + neon deps, db client and config"
```

---

### Task 2: Write the Drizzle schema

**Files:**
- Create: `lib/db/schema.ts`

This schema mirrors the dump exactly (enums, jsonb `image_urls`, generated `avg_score`, checks, FKs all `ON DELETE CASCADE`, unique constraints). Relations are defined so nested-select endpoints can use `db.query`.

- [ ] **Step 1: Write `lib/db/schema.ts`**
```ts
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'
import {
  pgTable, pgEnum, uuid, text, integer, numeric, boolean,
  timestamp, jsonb, varchar, unique, check,
} from 'drizzle-orm/pg-core'

export const draftStatus = pgEnum('draft_status', [
  'pending', 'processing', 'approved', 'rejected', 'shipped',
])
export const abTestStatus = pgEnum('ab_test_status', [
  'draft', 'running', 'paused', 'completed',
])

export const drafts = pgTable('drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  status: draftStatus('status').default('pending').notNull(),
  avgCringeScore: integer('avg_cringe_score'),
  avgExcitementScore: integer('avg_excitement_score'),
  qualityScore: integer('quality_score'),
  iterationCount: integer('iteration_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  imageUrls: jsonb('image_urls').$type<string[]>().default([]),
}, (t) => ({
  cringeChk: check('drafts_avg_cringe_score_check', sql`${t.avgCringeScore} >= 0 AND ${t.avgCringeScore} <= 100`),
  excitementChk: check('drafts_avg_excitement_score_check', sql`${t.avgExcitementScore} >= 0 AND ${t.avgExcitementScore} <= 100`),
  qualityChk: check('drafts_quality_score_check', sql`${t.qualityScore} >= 0 AND ${t.qualityScore} <= 100`),
}))

export const aiPersonas = pgTable('ai_personas', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }),
  systemPrompt: text('system_prompt'),
  active: boolean('active').default(true),
})

export const councilFeedback = pgTable('council_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftId: uuid('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').notNull().references(() => aiPersonas.id, { onDelete: 'cascade' }),
  cringeScore: integer('cringe_score').notNull(),
  excitementScore: integer('excitement_score').notNull(),
  critique: text('critique').notNull(),
  specificFix: text('specific_fix'),
  iterationNumber: integer('iteration_number').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: unique('council_feedback_draft_id_persona_id_iteration_number_key').on(t.draftId, t.personaId, t.iterationNumber),
  cringeChk: check('council_feedback_cringe_score_check', sql`${t.cringeScore} >= 0 AND ${t.cringeScore} <= 100`),
  excitementChk: check('council_feedback_excitement_score_check', sql`${t.excitementScore} >= 0 AND ${t.excitementScore} <= 100`),
}))

export const abTests = pgTable('ab_tests', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftId: uuid('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: abTestStatus('status').default('draft').notNull(),
  algorithm: text('algorithm').default('epsilon_greedy').notNull(),
  epsilon: numeric('epsilon', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
}, (t) => ({
  algoChk: check('ab_tests_algorithm_check', sql`${t.algorithm} = ANY (ARRAY['epsilon_greedy'::text, 'ucb'::text, 'thompson_sampling'::text, 'fixed_split'::text])`),
  epsilonChk: check('ab_tests_epsilon_check', sql`${t.epsilon} >= 0 AND ${t.epsilon} <= 1`),
}))

export const abTestVariants = pgTable('ab_test_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  abTestId: uuid('ab_test_id').notNull().references(() => abTests.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  content: text('content').notNull(),
  totalEvaluations: integer('total_evaluations').default(0).notNull(),
  totalScore: integer('total_score').default(0).notNull(),
  avgScore: numeric('avg_score', { precision: 5, scale: 2 }).generatedAlwaysAs(
    sql`CASE WHEN total_evaluations > 0 THEN ((total_score)::numeric / (total_evaluations)::numeric) ELSE (0)::numeric END`
  ),
  winRate: numeric('win_rate', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  imageUrls: jsonb('image_urls').$type<string[]>().default([]),
}, (t) => ({
  uniq: unique('ab_test_variants_ab_test_id_name_key').on(t.abTestId, t.name),
}))

export const abTestEvaluations = pgTable('ab_test_evaluations', {
  id: uuid('id').defaultRandom().primaryKey(),
  abTestId: uuid('ab_test_id').notNull().references(() => abTests.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => abTestVariants.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').notNull().references(() => aiPersonas.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  preferenceRank: integer('preference_rank'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: unique('ab_test_evaluations_ab_test_id_variant_id_persona_id_key').on(t.abTestId, t.variantId, t.personaId),
  scoreChk: check('ab_test_evaluations_score_check', sql`${t.score} >= 0 AND ${t.score} <= 100`),
}))

// Relations (for nested-select endpoints via db.query)
export const draftsRelations = relations(drafts, ({ many }) => ({
  feedback: many(councilFeedback),
  abTests: many(abTests),
}))
export const aiPersonasRelations = relations(aiPersonas, ({ many }) => ({
  feedback: many(councilFeedback),
  evaluations: many(abTestEvaluations),
}))
export const councilFeedbackRelations = relations(councilFeedback, ({ one }) => ({
  draft: one(drafts, { fields: [councilFeedback.draftId], references: [drafts.id] }),
  persona: one(aiPersonas, { fields: [councilFeedback.personaId], references: [aiPersonas.id] }),
}))
export const abTestsRelations = relations(abTests, ({ one, many }) => ({
  draft: one(drafts, { fields: [abTests.draftId], references: [drafts.id] }),
  variants: many(abTestVariants),
  evaluations: many(abTestEvaluations),
}))
export const abTestVariantsRelations = relations(abTestVariants, ({ one, many }) => ({
  abTest: one(abTests, { fields: [abTestVariants.abTestId], references: [abTests.id] }),
  evaluations: many(abTestEvaluations),
}))
export const abTestEvaluationsRelations = relations(abTestEvaluations, ({ one }) => ({
  abTest: one(abTests, { fields: [abTestEvaluations.abTestId], references: [abTests.id] }),
  variant: one(abTestVariants, { fields: [abTestEvaluations.variantId], references: [abTestVariants.id] }),
  persona: one(aiPersonas, { fields: [abTestEvaluations.personaId], references: [aiPersonas.id] }),
}))

// Inferred types (replace `Tables<'x'>` from types/supabase.ts)
export type Draft = typeof drafts.$inferSelect
export type AiPersona = typeof aiPersonas.$inferSelect
export type CouncilFeedback = typeof councilFeedback.$inferSelect
export type ABTest = typeof abTests.$inferSelect
export type ABTestVariant = typeof abTestVariants.$inferSelect
export type ABTestEvaluation = typeof abTestEvaluations.$inferSelect
```

- [ ] **Step 2: Typecheck the schema compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'lib/db/schema' || echo "schema OK"`
Expected: `schema OK` (no type errors originating in schema.ts).

- [ ] **Step 3: Commit**
```bash
git add lib/db/schema.ts
git commit -m "feat: add drizzle schema mirroring supabase public schema"
```

---

### Task 3: Build the public-only SQL extract and load it into Neon

**Files:**
- Create: `db/neon_import.sql`

The dump is at:
`/mnt/c/Users/micha/Downloads/db_cluster-25-12-2025@16-10-19.backup/db_cluster-25-12-2025@16-10-19.backup`

- [ ] **Step 1: Install the Postgres client**

Run: `sudo apt-get update && sudo apt-get install -y postgresql-client`
Verify: `psql --version` prints a version.

- [ ] **Step 2: Confirm Neon connectivity**

Run:
```bash
psql "$(grep ^DATABASE_URL .env.local | cut -d= -f2-)" -c "select current_database();"
```
Expected: returns `neondb`. (If `channel_binding=require` causes a client error, drop that param for the psql call only.)

- [ ] **Step 3: Assemble `db/neon_import.sql`**

Create `db/neon_import.sql` with: the two `CREATE TYPE` enums, the six `CREATE TABLE public.*` statements (copy them verbatim from the dump, lines 467–490 for types and 3334–3460 for tables — keep the `public.` schema prefix, KEEP the generated `avg_score` and all CHECK constraints, DROP every `ALTER ... OWNER TO postgres;` line), then the six `COPY public.* (...) FROM stdin;` data blocks copied verbatim from the dump (lines ~3948–4080, each terminated by its `\.` line), then the PK / UNIQUE / FK `ALTER TABLE ONLY public.* ADD CONSTRAINT ...` statements for the six tables (from the dump's constraint section). Wrap the whole file in a single transaction:

```sql
BEGIN;
-- enums
CREATE TYPE public.ab_test_status AS ENUM ('draft','running','paused','completed');
CREATE TYPE public.draft_status  AS ENUM ('pending','processing','approved','rejected','shipped');
-- tables (verbatim from dump, OWNER lines removed) ...
-- COPY data blocks (verbatim from dump) ...
-- PK/UNIQUE/FK constraints (verbatim from dump) ...
COMMIT;
```

Extract the COPY blocks programmatically to avoid transcription errors:
```bash
DUMP="/mnt/c/Users/micha/Downloads/db_cluster-25-12-2025@16-10-19.backup/db_cluster-25-12-2025@16-10-19.backup"
# Print each COPY block (header line through its terminating \.) for inspection:
awk '/^COPY public\./{p=1} p{print} /^\\\.$/{if(p)print ""; p=0}' "$DUMP"
```
Paste those blocks into `db/neon_import.sql` after the table DDL. (FK constraints come last so data loads before they are enforced; data is internally consistent so order within tables does not matter, but keep `ai_personas` and `drafts` COPY blocks before `council_feedback`.)

- [ ] **Step 4: Load into Neon**

Run:
```bash
psql "$(grep ^DATABASE_URL .env.local | cut -d= -f2- | sed 's/&channel_binding=require//')" -v ON_ERROR_STOP=1 -f db/neon_import.sql
```
Expected: `BEGIN ... CREATE TYPE ... CREATE TABLE ... COPY 9 ... COPY 24 ... COPY 57 ... COMMIT` with no errors.

- [ ] **Step 5: Verify row counts**

Run:
```bash
psql "$(grep ^DATABASE_URL .env.local | cut -d= -f2- | sed 's/&channel_binding=require//')" -c \
"select 'ai_personas' t,count(*) from public.ai_personas union all select 'drafts',count(*) from public.drafts union all select 'council_feedback',count(*) from public.council_feedback union all select 'ab_tests',count(*) from public.ab_tests union all select 'ab_test_variants',count(*) from public.ab_test_variants union all select 'ab_test_evaluations',count(*) from public.ab_test_evaluations;"
```
Expected: `ai_personas=9, drafts=24, council_feedback=57, ab_tests=0, ab_test_variants=0, ab_test_evaluations=0`.

- [ ] **Step 6: Cross-check schema matches Drizzle**

Run: `npx drizzle-kit introspect`
Then: `git diff --stat` and inspect `lib/db/migrations/` introspected output. Compare against `lib/db/schema.ts`. Expected: no structural differences (column types, enums, generated column, constraints). If differences appear, fix `lib/db/schema.ts` to match the live DB, then delete the introspected artifacts.

- [ ] **Step 7: Commit**
```bash
git add db/neon_import.sql
git commit -m "chore: public-only SQL extract for Neon data load"
```

---

## Phase 1 — Server-side query rewrite (services first; routes depend on them)

### Task 4: Rewrite `lib/services/quality-gate.ts`

**Files:**
- Modify: `lib/services/quality-gate.ts`

- [ ] **Step 1: Replace imports and the two queries**

Replace the top imports:
```ts
import { db } from '@/lib/db'
import { drafts, type Draft } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
```
(Remove `import { createClient } ...` and `import { Tables } ...`; remove `type Draft = Tables<'drafts'>`.)

In `evaluateQuality`, remove `const supabase = await createClient()`. Replace the fetch:
```ts
const draft = (await db.select().from(drafts).where(eq(drafts.id, draftId)))[0]
if (!draft) {
  throw new Error('Failed to fetch draft: Draft not found')
}
```
Replace the auto-update block:
```ts
const newStatus = passed ? 'approved' : 'rejected'
if (draft.status !== newStatus) {
  await db.update(drafts).set({ status: newStatus }).where(eq(drafts.id, draftId))
  draft.status = newStatus
}
```
`shouldRefine` uses `result.draft.iterationCount` (was `iteration_count`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep 'quality-gate' || echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**
```bash
git add lib/services/quality-gate.ts && git commit -m "refactor: quality-gate uses drizzle"
```

---

### Task 5: Rewrite `lib/services/council-processor.ts`

**Files:**
- Modify: `lib/services/council-processor.ts`

- [ ] **Step 1: Replace imports and queries**

Top imports:
```ts
import { db } from '@/lib/db'
import { drafts, aiPersonas, councilFeedback, type AiPersona, type CouncilFeedback } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
```
(Remove `createClient` and `Tables` imports and the `type Persona`/`type CouncilFeedback` aliases; use `AiPersona` in place of `Persona`.)

In `runSimulation`: remove `const supabase = ...`. Fetch draft + personas:
```ts
const draft = (await db.select({ imageUrls: drafts.imageUrls }).from(drafts).where(eq(drafts.id, draftId)))[0]
if (!draft) throw new Error('Failed to fetch draft')
const personas = await db.select().from(aiPersonas).where(eq(aiPersonas.active, true))
if (!personas.length) throw new Error('No active personas found')
return runSimulationWithPersonas(draftId, content, personas, draft?.imageUrls ?? null, iterationNumber)
```

In `runSimulationWithPersonas`: remove `const supabase = ...`; change the `personas.map` param type to `AiPersona`. Update status:
```ts
await db.update(drafts).set({ status: 'processing' }).where(eq(drafts.id, draftId))
```
Insert feedback (returns row; throws on error):
```ts
const feedback = (await db.insert(councilFeedback).values({
  draftId,
  personaId: persona.id,
  cringeScore: critique.cringe_score,
  excitementScore: critique.excitement_score,
  critique: critique.critique,
  specificFix: critique.specific_fix,
  iterationNumber,
}).returning())[0]
return feedback
```
(The surrounding `try/catch` that returns `null` on failure stays.) Field reads later use `f.cringeScore` / `f.excitementScore` (camelCase). Final draft update:
```ts
await db.update(drafts).set({
  avgCringeScore: avgCringeScore,
  avgExcitementScore: avgExcitementScore,
  qualityScore: qualityScore,
  iterationCount: iterationNumber,
}).where(eq(drafts.id, draftId))
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep 'council-processor' || echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**
```bash
git add lib/services/council-processor.ts && git commit -m "refactor: council-processor uses drizzle"
```

---

### Task 6: Rewrite `lib/services/ab-test-engine.ts`

**Files:**
- Modify: `lib/services/ab-test-engine.ts`

This file passes `supabase` into helper functions. With Drizzle, `db` is a singleton — **remove the `supabase` parameter from `runEpsilonGreedy`, `runFixedSplit`, `runFullEvaluation`, `getCurrentVariantStats`** and their call sites.

- [ ] **Step 1: Replace imports and types**
```ts
import { db } from '@/lib/db'
import { abTests, abTestVariants, abTestEvaluations, aiPersonas,
  type AiPersona, type ABTestVariant, type ABTest } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getPersonaVariantEvaluation } from '@/lib/google-ai/client'
```
Replace the three local `type` aliases with `AiPersona`/`ABTestVariant`/`ABTest` usages (`Persona`→`AiPersona`, `Variant`→`ABTestVariant`).

- [ ] **Step 2: Rewrite `runABTest` queries**
```ts
const abTest = (await db.select().from(abTests).where(eq(abTests.id, abTestId)))[0]
if (!abTest) throw new Error('A/B test not found')

const variants = await db.select().from(abTestVariants)
  .where(eq(abTestVariants.abTestId, abTestId)).orderBy(asc(abTestVariants.name))
if (!variants.length) throw new Error('No variants found for A/B test')

const personas = await db.select().from(aiPersonas).where(eq(aiPersonas.active, true))
if (!personas.length) throw new Error('No active personas found')

if (abTest.status === 'draft') {
  await db.update(abTests).set({ status: 'running', startedAt: new Date() })
    .where(eq(abTests.id, abTestId))
}

if (abTest.algorithm === 'epsilon_greedy') {
  await runEpsilonGreedy(abTest, variants, personas, evaluations)
} else if (abTest.algorithm === 'fixed_split') {
  await runFixedSplit(abTest, variants, personas, evaluations)
} else {
  await runFullEvaluation(variants, personas, evaluations, abTestId)
}
```
Note: `startedAt`/`endedAt` take a JS `Date` (not `.toISOString()`). The variant-stats update loop:
```ts
for (const stat of variantStats) {
  const variant = variants.find(v => v.id === stat.variantId)
  if (variant) {
    await db.update(abTestVariants).set({
      totalEvaluations: stat.totalEvaluations,
      totalScore: Math.round(stat.avgScore * stat.totalEvaluations),
    }).where(eq(abTestVariants.id, stat.variantId))
  }
}
```
(`totalScore` is an integer column — `Math.round`.)

- [ ] **Step 3: Rewrite the helper functions (drop `supabase` param)**

`runEpsilonGreedy(abTest, variants, personas, evaluations)` — `epsilon` is now a string; use `const epsilon = Number(abTest.epsilon ?? 0.1)`. `multimodalContent.imageUrls` uses `selectedVariant.imageUrls ?? undefined`. Save eval:
```ts
const savedEval = (await db.insert(abTestEvaluations).values({
  abTestId: abTest.id, variantId: selectedVariant.id, personaId: persona.id, score: evaluation.score,
}).returning())[0]
if (savedEval) { evaluations.push({ ... }) }
```
`runFixedSplit(abTest, variants, personas, evaluations)` — insert:
```ts
await db.insert(abTestEvaluations).values({
  abTestId: abTest.id, variantId: variant.id, personaId: persona.id, score: evaluation.score,
})
```
`runFullEvaluation(variants, personas, evaluations, abTestId)` — insert as above with `abTestId`. Preference rank update:
```ts
await db.update(abTestEvaluations).set({ preferenceRank: i + 1 })
  .where(and(
    eq(abTestEvaluations.abTestId, abTestId),
    eq(abTestEvaluations.variantId, personaEvaluations[i].variant.id),
    eq(abTestEvaluations.personaId, persona.id),
  ))
```
`getCurrentVariantStats(abTestId)` — `db.select(...).from(abTestVariants).where(eq(abTestVariants.abTestId, abTestId))`; map `avg_score`→`Number(v.avgScore ?? 0)`, `total_score`→`v.totalScore`, etc.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep 'ab-test-engine' || echo OK`
Expected: `OK`.

- [ ] **Step 5: Commit**
```bash
git add lib/services/ab-test-engine.ts && git commit -m "refactor: ab-test-engine uses drizzle"
```

---

### Task 7: Rewrite `app/api/drafts/route.ts`

**Files:**
- Modify: `app/api/drafts/route.ts`

- [ ] **Step 1: Swap imports and queries**

Imports: drop `createClient`; add
```ts
import { db } from '@/lib/db'
import { drafts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
```
`uploadImages` import stays (storage). In `POST`: remove `createClient`; create draft:
```ts
const draft = (await db.insert(drafts).values({
  content: content.trim(), status: 'pending', imageUrls: [],
}).returning())[0]
```
Wrap in try/catch; on throw return the 500 with the error message. Update with image URLs:
```ts
await db.update(drafts).set({ imageUrls }).where(eq(drafts.id, draft.id))
```
Fetch updated:
```ts
const updatedDraft = (await db.select().from(drafts).where(eq(drafts.id, draft.id)))[0]
```
In `GET`:
```ts
const rows = await db.select().from(drafts)
  .where(status ? eq(drafts.status, status as any) : undefined)
  .orderBy(desc(drafts.createdAt)).limit(limit).offset(offset)
return NextResponse.json({ success: true, drafts: rows })
```
(`.where(undefined)` is valid in Drizzle — returns all rows.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep 'api/drafts/route' || echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**
```bash
git add app/api/drafts/route.ts && git commit -m "refactor: /api/drafts uses drizzle"
```

---

### Task 8: Rewrite `app/api/drafts/[id]/route.ts`

**Files:**
- Modify: `app/api/drafts/[id]/route.ts`

- [ ] **Step 1: Swap imports and queries**

Imports: drop `createClient`; add
```ts
import { db } from '@/lib/db'
import { drafts, councilFeedback, aiPersonas } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
```
GET draft:
```ts
const draft = (await db.select().from(drafts).where(eq(drafts.id, id)))[0]
if (!draft) return NextResponse.json({ error: 'Draft not found', id }, { status: 404 })
```
GET feedback with persona (nested select → relational query):
```ts
const feedback = await db.query.councilFeedback.findMany({
  where: eq(councilFeedback.draftId, id),
  orderBy: desc(councilFeedback.createdAt),
  with: { persona: { columns: { id: true, name: true, systemPrompt: true } } },
})
```
(Returns each row with a `persona` object — the client shape changes from `ai_personas` to `persona`; update any consumer accordingly, see Task 12.)

PATCH (both multipart and JSON branches): the "get current draft image_urls" read:
```ts
const currentDraft = (await db.select({ imageUrls: drafts.imageUrls }).from(drafts).where(eq(drafts.id, id)))[0]
let imageUrls: string[] = currentDraft?.imageUrls ?? []
```
The update builds a camelCase `updates` object (`{ content?, status?, imageUrls? }`); apply:
```ts
const draft = (await db.update(drafts).set(updates).where(eq(drafts.id, id)).returning())[0]
if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
```
For the JSON branch, map the allowed body fields to camelCase keys (`content`, `status`, `image_urls`→`imageUrls`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep 'api/drafts/\[id\]/route' || echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**
```bash
git add "app/api/drafts/[id]/route.ts" && git commit -m "refactor: /api/drafts/[id] uses drizzle"
```

---

### Task 9: Rewrite `app/api/drafts/[id]/process/route.ts` and `app/api/drafts/[id]/ship/route.ts`

**Files:**
- Modify: `app/api/drafts/[id]/process/route.ts`
- Modify: `app/api/drafts/[id]/ship/route.ts`

- [ ] **Step 1: process route**

Imports: drop `createClient`; add `import { db } from '@/lib/db'`, `import { drafts } from '@/lib/db/schema'`, `import { eq } from 'drizzle-orm'`. Replace the draft fetch:
```ts
const draft = (await db.select().from(drafts).where(eq(drafts.id, id)))[0]
if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
```
`draft.iteration_count` → `draft.iterationCount`.

- [ ] **Step 2: ship route**

Imports: drop `createClient`; add
```ts
import { db } from '@/lib/db'
import { drafts, abTests, abTestVariants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
```
Draft fetch as above. Create A/B test:
```ts
const abTest = (await db.insert(abTests).values({
  draftId: id,
  name: name || `A/B Test for Draft ${id.substring(0, 8)}`,
  status: 'draft',
  algorithm,
  epsilon: algorithm === 'epsilon_greedy' ? String(epsilon) : null,
}).returning())[0]
```
Variant inserts (camelCase keys):
```ts
const variantInserts = variants.map((variant, index) => ({
  abTestId: abTest.id,
  name: `variant_${String.fromCharCode(97 + index)}`,
  content: variant.content,
  imageUrls: variant.imageUrls || [],
}))
const createdVariants = await db.insert(abTestVariants).values(variantInserts).returning()
```
Cleanup-on-failure (wrap variant insert in try/catch):
```ts
await db.delete(abTests).where(eq(abTests.id, abTest.id))
```
Update draft status:
```ts
await db.update(drafts).set({ status: 'shipped' }).where(eq(drafts.id, id))
```

- [ ] **Step 3: Typecheck both**

Run: `npx tsc --noEmit 2>&1 | grep -E 'process/route|ship/route' || echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**
```bash
git add "app/api/drafts/[id]/process/route.ts" "app/api/drafts/[id]/ship/route.ts"
git commit -m "refactor: draft process & ship routes use drizzle"
```

---

### Task 10: Rewrite `app/api/ab-tests/route.ts` and `app/api/ab-tests/[id]/route.ts`

**Files:**
- Modify: `app/api/ab-tests/route.ts`
- Modify: `app/api/ab-tests/[id]/route.ts`

- [ ] **Step 1: ab-tests collection route**

Imports: drop `createClient`; add `db`, `{ abTests }`, `{ eq, desc }`. GET (nested draft → relational query):
```ts
const rows = await db.query.abTests.findMany({
  where: status ? eq(abTests.status, status as any) : undefined,
  orderBy: desc(abTests.createdAt),
  limit, offset,
  with: { draft: { columns: { id: true, content: true, status: true } } },
})
return NextResponse.json({ success: true, abTests: rows })
```
POST:
```ts
const abTest = (await db.insert(abTests).values({
  draftId: draft_id, name, status: 'draft', algorithm,
  epsilon: algorithm === 'epsilon_greedy' ? String(epsilon) : null,
}).returning())[0]
```

- [ ] **Step 2: ab-tests [id] route**

Imports: add `db`, `{ abTests, abTestVariants, abTestEvaluations }`, `{ eq, desc, asc }`. GET test+draft:
```ts
const abTest = await db.query.abTests.findFirst({
  where: eq(abTests.id, id),
  with: { draft: { columns: { id: true, content: true, status: true } } },
})
if (!abTest) return NextResponse.json({ error: 'A/B test not found' }, { status: 404 })
```
Variants:
```ts
const variants = await db.select().from(abTestVariants)
  .where(eq(abTestVariants.abTestId, id)).orderBy(asc(abTestVariants.name))
```
Evaluations (nested variant + persona):
```ts
const evaluations = await db.query.abTestEvaluations.findMany({
  where: eq(abTestEvaluations.abTestId, id),
  orderBy: desc(abTestEvaluations.createdAt),
  with: {
    variant: { columns: { id: true, name: true } },
    persona: { columns: { id: true, name: true } },
  },
})
```
PATCH: build camelCase `updates` from allowed fields (`name`, `status`, `algorithm`, `epsilon`→`String(...)`); if `status === 'completed'` set `updates.endedAt = new Date()`. Then:
```ts
const abTest = (await db.update(abTests).set(updates).where(eq(abTests.id, id)).returning())[0]
if (!abTest) return NextResponse.json({ error: 'A/B test not found' }, { status: 404 })
```

- [ ] **Step 3: Typecheck both**

Run: `npx tsc --noEmit 2>&1 | grep 'ab-tests' || echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**
```bash
git add app/api/ab-tests/route.ts "app/api/ab-tests/[id]/route.ts"
git commit -m "refactor: ab-tests routes use drizzle"
```

---

### Task 11: Rewrite `app/api/simulation/run/route.ts`

**Files:**
- Modify: `app/api/simulation/run/route.ts`

- [ ] **Step 1: Swap imports and queries**

Imports: drop `createClient`; add `db`, `{ drafts, aiPersonas }`, `{ eq, and, inArray }`. `uploadImages` and `runSimulationWithPersonas` imports stay. Create draft:
```ts
const draft = (await db.insert(drafts).values({
  content: content.trim(), status: 'pending', imageUrls: [],
}).returning())[0]
```
Update with image urls:
```ts
await db.update(drafts).set({ imageUrls }).where(eq(drafts.id, draft.id))
```
Fetch personas:
```ts
const personas = await db.select().from(aiPersonas)
  .where(and(inArray(aiPersonas.id, personaIds), eq(aiPersonas.active, true)))
if (!personas.length) return NextResponse.json({ error: 'No valid personas found for the selected IDs' }, { status: 400 })
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep 'simulation/run' || echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**
```bash
git add app/api/simulation/run/route.ts && git commit -m "refactor: /api/simulation/run uses drizzle"
```

---

## Phase 2 — Client pages & cleanup

### Task 12: Add read endpoints and convert client pages off the browser Supabase client

**Background:** `app/examples/database/page.tsx`, `app/examples/ai-personas/page.tsx`, `app/examples/simulation/page.tsx`, and `app/test/page.tsx` are `'use client'` components that call `createClient()` (browser) and query Supabase directly. Drizzle cannot run in the browser. Each direct query must be replaced with a `fetch()` to a server route.

**Files:**
- Create: `app/api/personas/route.ts` (GET list of active personas — needed by ai-personas/simulation pages)
- Modify: `app/examples/database/page.tsx`
- Modify: `app/examples/ai-personas/page.tsx`
- Modify: `app/examples/simulation/page.tsx`
- Modify: `app/test/page.tsx`

- [ ] **Step 1: Create the personas read endpoint**

Create `app/api/personas/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiPersonas } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const personas = await db.select().from(aiPersonas).where(eq(aiPersonas.active, true))
    return NextResponse.json({ success: true, personas })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Convert each client page**

For each page, remove `import { createClient } from '@/lib/supabase/client'` and the `const supabase = createClient()` line. Replace each `supabase.from('X').select(...)` with a `fetch` to the matching route and read the JSON:
- drafts list → `fetch('/api/drafts').then(r => r.json())` → `data.drafts`
- single draft + feedback → `fetch(\`/api/drafts/${id}\`)` → `data.draft`, `data.feedback`
- personas → `fetch('/api/personas')` → `data.personas`
- ab-tests → `fetch('/api/ab-tests')` → `data.abTests`

Replace `import { Tables } from '@/types/supabase'` with `import type { Draft, AiPersona } from '@/lib/db/schema'` and swap `Tables<'drafts'>`→`Draft`, `Tables<'ai_personas'>`→`AiPersona`. Where a page consumed the nested `ai_personas` object from feedback, rename to `persona` (matches Task 8's relational output).

Inserts/updates done from these pages (e.g. ai-personas page creating personas) must POST to an API route. If a page writes personas and no write route exists, add the corresponding handler to `app/api/personas/route.ts` (POST) following the pattern in Task 7. Keep scope minimal: only add endpoints the pages actually call.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E 'examples/|test/page|api/personas' || echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**
```bash
git add app/api/personas/route.ts app/examples app/test/page.tsx
git commit -m "refactor: client pages fetch via API routes instead of supabase browser client"
```

---

### Task 13: Swap remaining `types/supabase` references in `app/manufacturing/*`

**Files:**
- Modify: `app/manufacturing/page.tsx`
- Modify: `app/manufacturing/drafts/[id]/page.tsx`

These already use `fetch()`, so only the type import changes.

- [ ] **Step 1: Replace type imports**

Replace `import { Tables } from '@/types/supabase'` with `import type { Draft, ABTest, CouncilFeedback } from '@/lib/db/schema'` (import only the types each file uses). Swap `Tables<'drafts'>`→`Draft`, `Tables<'ab_tests'>`→`ABTest`, `Tables<'council_feedback'>`→`CouncilFeedback`. Note `imageUrls`/`createdAt` etc. are camelCase now — fix any field accesses that referenced snake_case shapes returned by the old endpoints (the rewritten endpoints return Drizzle row shapes with camelCase keys).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep 'manufacturing' || echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**
```bash
git add app/manufacturing && git commit -m "refactor: manufacturing pages use drizzle-inferred types"
```

---

### Task 14: Remove `types/supabase.ts` and final verification

**Files:**
- Delete: `types/supabase.ts`
- Verify: whole project builds and key flows work against Neon

- [ ] **Step 1: Confirm nothing imports the old types**

Run: `grep -rn "@/types/supabase" --include="*.ts" --include="*.tsx" app lib`
Expected: no matches. (If any remain, fix them per Tasks 12/13 before deleting.)

- [ ] **Step 2: Delete the file**

Run: `git rm types/supabase.ts`

- [ ] **Step 3: Confirm storage still references Supabase (intentional)**

Run: `grep -rln "@/lib/supabase" app lib`
Expected: `lib/storage/image-upload.ts`, `app/examples/storage/page.tsx`, `lib/supabase/client.ts`, `lib/supabase/server.ts` — and nothing else. These stay on Supabase by design.

- [ ] **Step 4: Full typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Smoke-test a read and a write against Neon**

Run (in one terminal): `npm run dev`
Then:
```bash
curl -s localhost:3000/api/drafts | head -c 400          # expect success:true with 24 drafts
curl -s -X POST localhost:3000/api/drafts -F "content=Neon migration smoke test" | head -c 400  # expect a new draft row
curl -s localhost:3000/api/personas | head -c 400        # expect 9 personas
```
Expected: JSON `success: true` responses backed by Neon data; the POST returns a draft with a uuid `id` and camelCase fields.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "chore: remove supabase types; complete neon+drizzle migration"
```

---

## Notes / risks

- **Numeric → string:** `epsilon`, `winRate`, `avgScore` come back as strings. Insert `epsilon` as `String(...)`; read with `Number(...)`. Already handled in the relevant tasks.
- **Generated `avgScore`:** never appears in inserts/updates (Drizzle omits generated columns). The engine updates `totalScore`/`totalEvaluations`; `avgScore` recomputes automatically.
- **`status` typing in `GET` filters:** the raw query-string `status` is cast `as any` into `eq(...)`; optionally validate it against the enum's values before querying.
- **Storage untouched:** `lib/supabase/*` and `lib/storage/image-upload.ts` stay. The Supabase env vars remain in `.env.local` for storage only.
- **Credential hygiene:** the Neon connection string was shared in chat; rotate it in the Neon console after migration and update `.env.local`.
