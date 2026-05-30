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
