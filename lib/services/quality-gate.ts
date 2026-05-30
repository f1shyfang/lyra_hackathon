import { db } from '@/lib/db'
import { drafts, type Draft } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface QualityGateResult {
  passed: boolean
  reason?: string
  draft: Draft
}

/**
 * Evaluate if a draft meets quality thresholds
 */
export async function evaluateQuality(draftId: string): Promise<QualityGateResult> {
  // Get quality thresholds from environment or use defaults
  const excitementThreshold = parseInt(
    process.env.QUALITY_THRESHOLD_EXCITEMENT || '70',
    10
  )
  const cringeThreshold = parseInt(
    process.env.QUALITY_THRESHOLD_CRINGE || '30',
    10
  )

  // Fetch draft
  const draft = (await db.select().from(drafts).where(eq(drafts.id, draftId)))[0]
  if (!draft) {
    throw new Error('Failed to fetch draft: Draft not found')
  }

  // Check if draft has been processed
  if (
    draft.avgExcitementScore === null ||
    draft.avgCringeScore === null
  ) {
    return {
      passed: false,
      reason: 'Draft has not been processed by the AI Council yet',
      draft,
    }
  }

  // Evaluate quality thresholds
  const passed =
    draft.avgExcitementScore >= excitementThreshold &&
    draft.avgCringeScore <= cringeThreshold

  let reason: string | undefined
  if (!passed) {
    const issues: string[] = []
    if (draft.avgExcitementScore < excitementThreshold) {
      issues.push(
        `Excitement score ${draft.avgExcitementScore} is below threshold ${excitementThreshold}`
      )
    }
    if (draft.avgCringeScore > cringeThreshold) {
      issues.push(
        `Cringe score ${draft.avgCringeScore} is above threshold ${cringeThreshold}`
      )
    }
    reason = issues.join('; ')
  }

  // Auto-update status based on quality gate result
  const newStatus = passed ? 'approved' : 'rejected'
  if (draft.status !== newStatus) {
    await db.update(drafts).set({ status: newStatus }).where(eq(drafts.id, draftId))
    draft.status = newStatus
  }

  return {
    passed,
    reason,
    draft,
  }
}

/**
 * Check if draft should be refined (re-run council processing)
 */
export async function shouldRefine(draftId: string): Promise<boolean> {
  const result = await evaluateQuality(draftId)
  return !result.passed && (result.draft.iterationCount || 0) < 3 // Max 3 iterations
}
