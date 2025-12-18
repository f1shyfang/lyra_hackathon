/**
 * Signal Attribution Module
 * 
 * Determines which signals came from text vs images.
 */

import { ImageContext, SignalAttribution } from '@/types/image-analysis'
import { extractTextKeywords, extractImageKeywords } from './fusion'

// ============================================================================
// SIGNAL ATTRIBUTION
// ============================================================================

/**
 * Attribute prediction signals to their source (text, image, or mixed).
 * 
 * Attribution rules:
 * - If a keyword/cue came only from [IMAGE CONTEXT] → image_driven_signals
 * - If only from draft text → text_driven_signals
 * - If both reinforce → mixed_signals
 * 
 * @param draftText - Original draft text
 * @param imageContexts - Extracted image contexts
 * @param predictions - Model predictions to attribute
 * @returns Attribution breakdown
 */
export function attributeSignals(
  draftText: string,
  imageContexts: ImageContext[],
  predictions: {
    role_distribution_top5: { role: string; pct: number }[]
    narratives: { name: string; prob: number }[]
    risk: { risk_class: string; risk_probs: Record<string, number> }
  }
): SignalAttribution {
  const textKeywords = extractTextKeywords(draftText)
  const imageKeywords = extractImageKeywords(imageContexts)

  const textDriven: string[] = []
  const imageDriven: string[] = []
  const mixed: string[] = []

  // Attribute role signals
  for (const role of predictions.role_distribution_top5) {
    const roleWords = role.role.toLowerCase().split(/[\s\/]+/)
    const inText = roleWords.some(w => textKeywords.has(w))
    const inImage = roleWords.some(w => imageKeywords.has(w))

    if (inText && inImage) {
      mixed.push(`role:${role.role}`)
    } else if (inImage) {
      imageDriven.push(`role:${role.role}`)
    } else {
      // Default to text-driven (model learned from text patterns)
      textDriven.push(`role:${role.role}`)
    }
  }

  // Attribute narrative signals
  for (const narrative of predictions.narratives.slice(0, 5)) {
    const narrativeWords = narrative.name.toLowerCase().split('_')
    const inText = narrativeWords.some(w => textKeywords.has(w))
    const inImage = narrativeWords.some(w => imageKeywords.has(w))

    if (inText && inImage) {
      mixed.push(`narrative:${narrative.name}`)
    } else if (inImage) {
      imageDriven.push(`narrative:${narrative.name}`)
    } else {
      textDriven.push(`narrative:${narrative.name}`)
    }
  }

  // Attribute risk signals
  const hasImageRisk = imageContexts.some(ctx => 
    ctx.risk_signals.contains_political_content ||
    ctx.risk_signals.contains_sensitive_or_inflammatory_language ||
    ctx.risk_signals.contains_personal_attack_or_harassment ||
    ctx.risk_signals.contains_unsafe_or_illegal_activity ||
    ctx.risk_signals.contains_sexual_content
  )

  const riskClass = predictions.risk.risk_class
  if (riskClass === 'Harmful') {
    if (hasImageRisk) {
      // Check if text also has risk indicators
      const riskTextPatterns = ['controversial', 'attack', 'hate', 'offensive', 'harmful']
      const textHasRisk = riskTextPatterns.some(p => draftText.toLowerCase().includes(p))
      
      if (textHasRisk) {
        mixed.push(`risk:${riskClass}`)
      } else {
        imageDriven.push(`risk:${riskClass}`)
      }
    } else {
      textDriven.push(`risk:${riskClass}`)
    }
  } else {
    textDriven.push(`risk:${riskClass}`)
  }

  // Add engineering signal attributions
  const hasImageEngineering = imageContexts.some(ctx =>
    ctx.engineering_signals.contains_code ||
    ctx.engineering_signals.contains_architecture_diagram ||
    ctx.engineering_signals.contains_metrics_or_dashboards ||
    ctx.engineering_signals.contains_dev_tools
  )

  if (hasImageEngineering) {
    const engKeywords = ['code', 'architecture', 'metrics', 'dashboard', 'engineering', 'developer']
    const textHasEng = engKeywords.some(k => draftText.toLowerCase().includes(k))
    
    if (textHasEng) {
      mixed.push('signal:engineering-context')
    } else {
      imageDriven.push('signal:engineering-context')
    }
  }

  // Add recruiting signal attributions
  const hasImageRecruiting = imageContexts.some(ctx =>
    ctx.recruiting_signals.contains_hiring_language ||
    ctx.recruiting_signals.contains_role_titles.length > 0 ||
    ctx.recruiting_signals.contains_event_or_booth
  )

  if (hasImageRecruiting) {
    const recKeywords = ['hiring', 'join', 'team', 'opportunity', 'role', 'position', 'career']
    const textHasRec = recKeywords.some(k => draftText.toLowerCase().includes(k))
    
    if (textHasRec) {
      mixed.push('signal:recruiting-context')
    } else {
      imageDriven.push('signal:recruiting-context')
    }
  }

  return {
    text_driven_signals: textDriven,
    image_driven_signals: imageDriven,
    mixed_signals: mixed,
  }
}

// ============================================================================
// IMAGE SIGNAL SUMMARY
// ============================================================================

/**
 * Generate a summary of signals detected in images.
 */
export function summarizeImageSignals(contexts: ImageContext[]): {
  engineering: string[]
  recruiting: string[]
  risk: string[]
  visual: string[]
} {
  const engineering: string[] = []
  const recruiting: string[] = []
  const risk: string[] = []
  const visual: string[] = []

  for (const ctx of contexts) {
    // Engineering
    if (ctx.engineering_signals.contains_code) engineering.push('code')
    if (ctx.engineering_signals.contains_architecture_diagram) engineering.push('architecture')
    if (ctx.engineering_signals.contains_metrics_or_dashboards) engineering.push('metrics')
    if (ctx.engineering_signals.contains_dev_tools) engineering.push('dev-tools')
    if (ctx.engineering_signals.contains_open_source_markers) engineering.push('open-source')

    // Recruiting
    if (ctx.recruiting_signals.contains_hiring_language) recruiting.push('hiring-language')
    recruiting.push(...ctx.recruiting_signals.contains_role_titles)
    if (ctx.recruiting_signals.contains_event_or_booth) recruiting.push('event/booth')

    // Risk
    if (ctx.risk_signals.contains_political_content) risk.push('political')
    if (ctx.risk_signals.contains_sensitive_or_inflammatory_language) risk.push('inflammatory')
    if (ctx.risk_signals.contains_personal_attack_or_harassment) risk.push('harassment')

    // Visual
    visual.push(ctx.high_level_type)
    visual.push(ctx.visual_tone)
  }

  return {
    engineering: [...new Set(engineering)],
    recruiting: [...new Set(recruiting)],
    risk: [...new Set(risk)],
    visual: [...new Set(visual)],
  }
}
