import { createClient } from '@/lib/supabase/server'
import { Tables } from '@/types/supabase'

type Draft = Tables<'drafts'>

export interface QualityGateResult {
  passed: boolean
  reason?: string
  draft: Draft
}

/**
 * Evaluate if a draft meets quality thresholds
 */
export async function evaluateQuality(draftId: string): Promise<QualityGateResult> {
  const supabase = await createClient()

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
  const { data: draft, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('id', draftId)
    .single()

  if (error || !draft) {
    throw new Error(`Failed to fetch draft: ${error?.message || 'Draft not found'}`)
  }

  // Check if draft has been processed
  if (
    draft.avg_excitement_score === null ||
    draft.avg_cringe_score === null
  ) {
    return {
      passed: false,
      reason: 'Draft has not been processed by the AI Council yet',
      draft,
    }
  }

  // Evaluate quality thresholds
  const passed =
    draft.avg_excitement_score >= excitementThreshold &&
    draft.avg_cringe_score <= cringeThreshold

  let reason: string | undefined
  if (!passed) {
    const issues: string[] = []
    if (draft.avg_excitement_score < excitementThreshold) {
      issues.push(
        `Excitement score ${draft.avg_excitement_score} is below threshold ${excitementThreshold}`
      )
    }
    if (draft.avg_cringe_score > cringeThreshold) {
      issues.push(
        `Cringe score ${draft.avg_cringe_score} is above threshold ${cringeThreshold}`
      )
    }
    reason = issues.join('; ')
  }

  // Auto-update status based on quality gate result
  const newStatus = passed ? 'approved' : 'rejected'
  if (draft.status !== newStatus) {
    await supabase
      .from('drafts')
      .update({ status: newStatus })
      .eq('id', draftId)
    
    // Update draft object
    draft.status = newStatus as typeof draft.status
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
  return !result.passed && (result.draft.iteration_count || 0) < 3 // Max 3 iterations
}



