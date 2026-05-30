/**
 * Text + Image Context Fusion Module
 * 
 * Builds a single fused input text from draft text and image contexts
 * for consumption by ML models.
 */

import { ImageContext } from '@/types/image-analysis'

// ============================================================================
// FUSED INPUT TEXT BUILDER
// ============================================================================

/**
 * Build a fused input text combining draft text with image context summaries.
 * 
 * Format:
 * [DRAFT TEXT]
 * {draft_text}
 * 
 * [IMAGE CONTEXT]
 * - Image {id}: {one_line_context_summary}
 *   - type: {high_level_type}
 *   - engineering: {key engineering signals}
 *   - recruiting: {key recruiting signals}
 *   - risk: {key risk signals}
 *   - keywords: {top keywords}
 * 
 * @param draftText - Original LinkedIn draft text
 * @param imageContexts - Extracted context objects from images
 * @returns Fused input text for ML models
 */
export function buildFusedInputText(
  draftText: string,
  imageContexts: ImageContext[]
): string {
  const parts: string[] = []

  // Draft text section
  parts.push('[DRAFT TEXT]')
  parts.push(draftText.trim())

  // Image context section (only if images exist)
  if (imageContexts.length > 0) {
    parts.push('')
    parts.push('[IMAGE CONTEXT]')

    for (const ctx of imageContexts) {
      parts.push(formatImageContext(ctx))
    }
  }

  return parts.join('\n')
}

/**
 * Format a single image context for the fused text.
 */
function formatImageContext(ctx: ImageContext): string {
  const lines: string[] = []

  // Header line
  lines.push(`- Image ${ctx.image_id}: ${ctx.one_line_context_summary}`)

  // Type
  lines.push(`  - type: ${ctx.high_level_type}`)

  // Engineering signals (only non-empty)
  const engSignals = formatEngineeringSignals(ctx.engineering_signals)
  if (engSignals) {
    lines.push(`  - engineering: ${engSignals}`)
  }

  // Recruiting signals (only non-empty)
  const recSignals = formatRecruitingSignals(ctx.recruiting_signals)
  if (recSignals) {
    lines.push(`  - recruiting: ${recSignals}`)
  }

  // Risk signals (only non-empty)
  const riskSignals = formatRiskSignals(ctx.risk_signals)
  if (riskSignals) {
    lines.push(`  - risk: ${riskSignals}`)
  }

  // Keywords
  if (ctx.keywords.length > 0) {
    lines.push(`  - keywords: ${ctx.keywords.slice(0, 5).join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Format engineering signals as a compact string.
 */
function formatEngineeringSignals(signals: ImageContext['engineering_signals']): string {
  const parts: string[] = []

  if (signals.contains_code) parts.push('code')
  if (signals.contains_architecture_diagram) parts.push('architecture')
  if (signals.contains_metrics_or_dashboards) parts.push('metrics/dashboards')
  if (signals.contains_dev_tools) parts.push('dev-tools')
  if (signals.contains_open_source_markers) parts.push('open-source')

  return parts.join(', ')
}

/**
 * Format recruiting signals as a compact string.
 */
function formatRecruitingSignals(signals: ImageContext['recruiting_signals']): string {
  const parts: string[] = []

  if (signals.contains_hiring_language) parts.push('hiring')
  if (signals.contains_role_titles.length > 0) {
    parts.push(`roles: ${signals.contains_role_titles.slice(0, 3).join('/')}`)
  }
  if (signals.contains_compensation_or_benefits) parts.push('compensation')
  if (signals.contains_company_values.length > 0) {
    parts.push(`values: ${signals.contains_company_values.slice(0, 2).join('/')}`)
  }
  if (signals.contains_event_or_booth) parts.push('event/booth')

  return parts.join(', ')
}

/**
 * Format risk signals as a compact string.
 */
function formatRiskSignals(signals: ImageContext['risk_signals']): string {
  const parts: string[] = []

  if (signals.contains_political_content) parts.push('political')
  if (signals.contains_sensitive_or_inflammatory_language) parts.push('inflammatory')
  if (signals.contains_personal_attack_or_harassment) parts.push('harassment')
  if (signals.contains_unsafe_or_illegal_activity) parts.push('unsafe')
  if (signals.contains_sexual_content) parts.push('sexual')

  return parts.join(', ')
}

// ============================================================================
// KEYWORD EXTRACTION (for attribution)
// ============================================================================

/**
 * Extract keywords from draft text for attribution comparison.
 * Simple approach: extract significant words.
 */
export function extractTextKeywords(text: string): Set<string> {
  // Common words to ignore
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
    'there', 'then', 'if', 'about', 'into', 'over', 'after', 'before',
  ])

  // Extract words (alphanumeric, min 3 chars)
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w))

  return new Set(words)
}

/**
 * Extract all keywords from image contexts.
 */
export function extractImageKeywords(contexts: ImageContext[]): Set<string> {
  const keywords = new Set<string>()

  for (const ctx of contexts) {
    // Add explicit keywords
    for (const kw of ctx.keywords) {
      keywords.add(kw.toLowerCase())
    }

    // Add role titles
    for (const role of ctx.recruiting_signals.contains_role_titles) {
      keywords.add(role.toLowerCase())
    }

    // Add company values
    for (const value of ctx.recruiting_signals.contains_company_values) {
      keywords.add(value.toLowerCase())
    }

    // Add primary subjects
    for (const subject of ctx.primary_subjects) {
      keywords.add(subject.toLowerCase())
    }

    // Add brand markers
    for (const brand of ctx.brand_markers) {
      keywords.add(brand.toLowerCase())
    }
  }

  return keywords
}
