/**
 * Types for image-aware LinkedIn draft analysis.
 * 
 * This module defines the structured context extraction format
 * and all related interfaces for the image+text fusion pipeline.
 */

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface ImageInput {
  id: string
  mime: string
  /** Base64 encoded image data */
  data?: string
  /** URL to fetch image from */
  url?: string
}

export interface AnalyzeWithImagesRequest {
  draft_text: string
  images: ImageInput[]
}

// ============================================================================
// IMAGE CONTEXT EXTRACTION TYPES
// ============================================================================

export type HighLevelImageType =
  | 'screenshot'
  | 'infographic'
  | 'code'
  | 'product_ui'
  | 'people_photo'
  | 'office_photo'
  | 'event_photo'
  | 'meme'
  | 'document'
  | 'chart'
  | 'other'

export type VisualTone =
  | 'professional'
  | 'casual'
  | 'hype'
  | 'serious'
  | 'playful'
  | 'controversial'
  | 'unknown'

export interface EngineeringSignals {
  contains_code: boolean
  contains_architecture_diagram: boolean
  contains_metrics_or_dashboards: boolean
  contains_dev_tools: boolean
  contains_open_source_markers: boolean
}

export interface RecruitingSignals {
  contains_hiring_language: boolean
  contains_role_titles: string[]
  contains_compensation_or_benefits: boolean
  contains_company_values: string[]
  contains_event_or_booth: boolean
}

export interface RiskSignals {
  contains_political_content: boolean
  contains_sensitive_or_inflammatory_language: boolean
  contains_personal_attack_or_harassment: boolean
  contains_unsafe_or_illegal_activity: boolean
  contains_sexual_content: boolean
}

export interface ImageContext {
  image_id: string
  high_level_type: HighLevelImageType
  primary_subjects: string[]
  setting: string[]
  brand_markers: string[]
  visual_tone: VisualTone
  engineering_signals: EngineeringSignals
  recruiting_signals: RecruitingSignals
  risk_signals: RiskSignals
  image_text_snippets: string[]
  keywords: string[]
  one_line_context_summary: string
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface SignalAttribution {
  text_driven_signals: string[]
  image_driven_signals: string[]
  mixed_signals: string[]
}

export interface AnalyzeWithImagesResponse {
  fused_input_text: string
  image_context_objects: ImageContext[]
  predictions: {
    role_distribution_top5: { role: string; pct: number }[]
    narratives: { name: string; prob: number }[]
    risk: {
      risk_class: 'Harmful' | 'Helpful' | 'Harmless'
      risk_probs: { Harmful: number; Helpful: number; Harmless: number }
      risk_level: string
      primary_risk_reason: string
    }
  }
  attribution: SignalAttribution
}

// ============================================================================
// VISION API ADAPTER INTERFACE
// ============================================================================

/**
 * Abstract interface for vision API providers.
 * Allows swapping between Gemini, OpenAI Vision, Claude, etc.
 */
export interface VisionAPIAdapter {
  extractImageContext(image: ImageInput): Promise<ImageContext>
}

// ============================================================================
// DEFAULT/EMPTY VALUES
// ============================================================================

export const EMPTY_ENGINEERING_SIGNALS: EngineeringSignals = {
  contains_code: false,
  contains_architecture_diagram: false,
  contains_metrics_or_dashboards: false,
  contains_dev_tools: false,
  contains_open_source_markers: false,
}

export const EMPTY_RECRUITING_SIGNALS: RecruitingSignals = {
  contains_hiring_language: false,
  contains_role_titles: [],
  contains_compensation_or_benefits: false,
  contains_company_values: [],
  contains_event_or_booth: false,
}

export const EMPTY_RISK_SIGNALS: RiskSignals = {
  contains_political_content: false,
  contains_sensitive_or_inflammatory_language: false,
  contains_personal_attack_or_harassment: false,
  contains_unsafe_or_illegal_activity: false,
  contains_sexual_content: false,
}

export const EMPTY_IMAGE_CONTEXT: ImageContext = {
  image_id: '',
  high_level_type: 'other',
  primary_subjects: [],
  setting: [],
  brand_markers: [],
  visual_tone: 'unknown',
  engineering_signals: EMPTY_ENGINEERING_SIGNALS,
  recruiting_signals: EMPTY_RECRUITING_SIGNALS,
  risk_signals: EMPTY_RISK_SIGNALS,
  image_text_snippets: [],
  keywords: [],
  one_line_context_summary: '',
}
