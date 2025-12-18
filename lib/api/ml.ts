import { AnalyzeResponse, CompareResponse } from '@/types/ml'
import { applyPostProcessing } from '@/lib/postprocessing'

const ML_API_BASE = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000'

export async function analyzeText(text: string): Promise<AnalyzeResponse> {
  const response = await fetch(`${ML_API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_text: text }),
  })

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`)
  }

  const rawResult = await response.json()
  
  // Apply post-processing to correct for ridge regression compression
  // and over-detection of harmful content
  return applyPostProcessing(rawResult)
}

export async function compareTexts(
  textA: string,
  textB: string
): Promise<CompareResponse> {
  try {
    const response = await fetch(`${ML_API_BASE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline_text: textA, variant_text: textB }),
    })

    if (response.ok) {
      return response.json()
    }
  } catch (error) {
    console.warn('Backend /compare not available, computing client-side')
  }

  const [baseline, variant] = await Promise.all([
    analyzeText(textA),
    analyzeText(textB),
  ])

  const allRoles = new Set([
    ...baseline.role_distribution_all.map((r) => r.role),
    ...variant.role_distribution_all.map((r) => r.role),
  ])

  const role_deltas: Record<string, number> = {}
  allRoles.forEach((role) => {
    const baselinePct =
      baseline.role_distribution_all.find((r) => r.role === role)?.pct || 0
    const variantPct =
      variant.role_distribution_all.find((r) => r.role === role)?.pct || 0
    role_deltas[role] = variantPct - baselinePct
  })

  const risk_prob_deltas = {
    Helpful: variant.risk.risk_probs.Helpful - baseline.risk.risk_probs.Helpful,
    Harmless: variant.risk.risk_probs.Harmless - baseline.risk.risk_probs.Harmless,
    Harmful: variant.risk.risk_probs.Harmful - baseline.risk.risk_probs.Harmful,
  }

  const allNarratives = new Set([
    ...Object.keys(baseline.narratives.narrative_probs),
    ...Object.keys(variant.narratives.narrative_probs),
  ])

  const narrative_deltas: Record<string, number> = {}
  allNarratives.forEach((name) => {
    const baselineProb = baseline.narratives.narrative_probs[name] || 0
    const variantProb = variant.narratives.narrative_probs[name] || 0
    narrative_deltas[name] = variantProb - baselineProb
  })

  return {
    baseline,
    variant,
    delta: {
      role_deltas,
      risk_prob_deltas,
      narrative_deltas,
    },
  }
}
