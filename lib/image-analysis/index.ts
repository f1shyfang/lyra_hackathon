/**
 * Image-Aware LinkedIn Draft Analysis
 * 
 * Main orchestration module that combines:
 * 1. Image context extraction (vision API)
 * 2. Text + image fusion
 * 3. ML predictions
 * 4. Signal attribution
 */

import {
  ImageInput,
  ImageContext,
  AnalyzeWithImagesRequest,
  AnalyzeWithImagesResponse,
} from '@/types/image-analysis'
import { extractMultipleImageContexts } from './vision-adapter'
import { buildFusedInputText } from './fusion'
import { attributeSignals } from './attribution'
import { applyPostProcessing } from '@/lib/postprocessing'

// ============================================================================
// CONFIGURATION
// ============================================================================

const ML_API_BASE = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000'

// ============================================================================
// MAIN ORCHESTRATION
// ============================================================================

/**
 * Analyze a LinkedIn draft with optional images.
 * 
 * Pipeline:
 * 1. Extract structured context from each image (parallel)
 * 2. Build fused input text (draft + image contexts)
 * 3. Call ML prediction API with fused text
 * 4. Apply post-processing transformations
 * 5. Attribute signals to text/image sources
 * 
 * @param request - Draft text and optional images
 * @returns Full analysis with attribution
 */
export async function analyzeWithImages(
  request: AnalyzeWithImagesRequest
): Promise<AnalyzeWithImagesResponse> {
  const { draft_text, images } = request

  // Step 1: Extract image contexts (parallel)
  const imageContexts = await extractMultipleImageContexts(images)

  // Step 2: Build fused input text
  const fusedInputText = buildFusedInputText(draft_text, imageContexts)

  // Step 3: Get predictions from ML API
  const predictions = await predictFromFusedText(fusedInputText)

  // Step 4: Attribute signals
  const attribution = attributeSignals(draft_text, imageContexts, predictions)

  return {
    fused_input_text: fusedInputText,
    image_context_objects: imageContexts,
    predictions,
    attribution,
  }
}

// ============================================================================
// ML PREDICTION
// ============================================================================

/**
 * Get predictions from the ML API using fused input text.
 * 
 * Uses the existing /analyze endpoint with the fused text.
 * Applies post-processing for role and risk corrections.
 */
async function predictFromFusedText(fusedText: string): Promise<{
  role_distribution_top5: { role: string; pct: number }[]
  narratives: { name: string; prob: number }[]
  risk: {
    risk_class: 'Harmful' | 'Helpful' | 'Harmless'
    risk_probs: { Harmful: number; Helpful: number; Harmless: number }
    risk_level: string
    primary_risk_reason: string
  }
}> {
  try {
    const response = await fetch(`${ML_API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_text: fusedText }),
    })

    if (!response.ok) {
      throw new Error(`ML API error: ${response.statusText}`)
    }

    const rawResult = await response.json()
    
    // Apply post-processing (variance amplification + harmless prior)
    const processed = applyPostProcessing(rawResult)

    // Convert narratives object to array
    const narrativesArray = Object.entries(processed.narratives?.narrative_probs || {})
      .map(([name, prob]) => ({ name, prob: prob as number }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5)

    return {
      role_distribution_top5: processed.role_distribution_all || [],
      narratives: narrativesArray,
      risk: {
        risk_class: processed.risk.risk_class,
        risk_probs: processed.risk.risk_probs,
        risk_level: processed.risk.risk_level,
        primary_risk_reason: processed.risk.primary_risk_reason,
      },
    }
  } catch (error) {
    console.error('Prediction error:', error)
    
    // Return fallback empty predictions
    return {
      role_distribution_top5: [],
      narratives: [],
      risk: {
        risk_class: 'Harmless',
        risk_probs: { Harmful: 0, Helpful: 0, Harmless: 1 },
        risk_level: 'Low',
        primary_risk_reason: 'Unable to analyze',
      },
    }
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export { extractMultipleImageContexts } from './vision-adapter'
export { buildFusedInputText, extractTextKeywords, extractImageKeywords } from './fusion'
export { attributeSignals, summarizeImageSignals } from './attribution'

// Re-export types
export type {
  ImageInput,
  ImageContext,
  AnalyzeWithImagesRequest,
  AnalyzeWithImagesResponse,
} from '@/types/image-analysis'
