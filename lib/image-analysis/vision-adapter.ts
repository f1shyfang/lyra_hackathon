/**
 * Vision API Adapter for extracting structured context from images.
 * 
 * This module provides a swappable adapter interface for different vision APIs.
 * Currently implements OpenAI Vision (GPT-4o).
 */

import {
  ImageInput,
  ImageContext,
  EMPTY_IMAGE_CONTEXT,
  HighLevelImageType,
  VisualTone,
  EngineeringSignals,
  RecruitingSignals,
  RiskSignals,
} from '@/types/image-analysis'

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = 'gpt-4o'
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_PROMPT = `You are analyzing an image attached to a LinkedIn post for a recruiting intelligence system.

Extract STRUCTURED CONTEXT from this image. Focus on semantics, not raw OCR.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "high_level_type": "screenshot | infographic | code | product_ui | people_photo | office_photo | event_photo | meme | document | chart | other",
  "primary_subjects": ["list of main subjects/objects visible"],
  "setting": ["context clues about location/environment"],
  "brand_markers": ["any visible logos, company names, product names"],
  "visual_tone": "professional | casual | hype | serious | playful | controversial | unknown",
  "engineering_signals": {
    "contains_code": false,
    "contains_architecture_diagram": false,
    "contains_metrics_or_dashboards": false,
    "contains_dev_tools": false,
    "contains_open_source_markers": false
  },
  "recruiting_signals": {
    "contains_hiring_language": false,
    "contains_role_titles": [],
    "contains_compensation_or_benefits": false,
    "contains_company_values": [],
    "contains_event_or_booth": false
  },
  "risk_signals": {
    "contains_political_content": false,
    "contains_sensitive_or_inflammatory_language": false,
    "contains_personal_attack_or_harassment": false,
    "contains_unsafe_or_illegal_activity": false,
    "contains_sexual_content": false
  },
  "image_text_snippets": ["ONLY short key snippets if text is clearly visible, max 3"],
  "keywords": ["5-10 relevant keywords for this image"],
  "one_line_context_summary": "One neutral, factual sentence describing what this image shows"
}

RULES:
- Prefer semantics over raw text extraction
- Do NOT infer private attributes about people (age, ethnicity, etc.)
- Be CONSERVATIVE with risk flags - only set true if CLEARLY present
- Keep one_line_context_summary SHORT, neutral, factual
- Return ONLY the JSON object, nothing else`

// ============================================================================
// OPENAI VISION ADAPTER (GPT-4o)
// ============================================================================

/**
 * Extract structured context from an image using OpenAI Vision API (GPT-4o).
 * 
 * @param image - Image input with base64 data or URL
 * @returns Structured ImageContext object
 */
export async function extractImageContext(image: ImageInput): Promise<ImageContext> {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set, returning empty context')
    return { ...EMPTY_IMAGE_CONTEXT, image_id: image.id }
  }

  try {
    // Prepare image data for OpenAI
    const imageData = await prepareImageData(image)
    
    // Build request body for OpenAI Chat Completions with vision
    const requestBody = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.mime};base64,${imageData}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    }

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      return { ...EMPTY_IMAGE_CONTEXT, image_id: image.id }
    }

    const result = await response.json()
    
    // Extract text from OpenAI response
    const text = result.choices?.[0]?.message?.content
    if (!text) {
      console.warn('No text in OpenAI response')
      return { ...EMPTY_IMAGE_CONTEXT, image_id: image.id }
    }

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonText = extractJsonFromText(text)
    const parsed = JSON.parse(jsonText)

    // Validate and normalize the response
    return normalizeImageContext(image.id, parsed)
  } catch (error) {
    console.error('Error extracting image context:', error)
    return { ...EMPTY_IMAGE_CONTEXT, image_id: image.id }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Prepare image data for API consumption.
 * If URL provided, fetch and convert to base64.
 */
async function prepareImageData(image: ImageInput): Promise<string> {
  if (image.data) {
    // Already base64
    return image.data
  }

  if (image.url) {
    // Fetch and convert to base64
    const response = await fetch(image.url)
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  }

  throw new Error(`Image ${image.id} has no data or url`)
}

/**
 * Extract JSON from text that may be wrapped in markdown code blocks.
 */
function extractJsonFromText(text: string): string {
  // Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  return text.trim()
}

/**
 * Normalize and validate parsed image context.
 */
function normalizeImageContext(imageId: string, parsed: any): ImageContext {
  return {
    image_id: imageId,
    high_level_type: validateEnum<HighLevelImageType>(
      parsed.high_level_type,
      ['screenshot', 'infographic', 'code', 'product_ui', 'people_photo', 
       'office_photo', 'event_photo', 'meme', 'document', 'chart', 'other'],
      'other'
    ),
    primary_subjects: ensureStringArray(parsed.primary_subjects),
    setting: ensureStringArray(parsed.setting),
    brand_markers: ensureStringArray(parsed.brand_markers),
    visual_tone: validateEnum<VisualTone>(
      parsed.visual_tone,
      ['professional', 'casual', 'hype', 'serious', 'playful', 'controversial', 'unknown'],
      'unknown'
    ),
    engineering_signals: normalizeEngineeringSignals(parsed.engineering_signals),
    recruiting_signals: normalizeRecruitingSignals(parsed.recruiting_signals),
    risk_signals: normalizeRiskSignals(parsed.risk_signals),
    image_text_snippets: ensureStringArray(parsed.image_text_snippets).slice(0, 3),
    keywords: ensureStringArray(parsed.keywords).slice(0, 10),
    one_line_context_summary: String(parsed.one_line_context_summary || '').slice(0, 200),
  }
}

function validateEnum<T extends string>(value: any, validValues: T[], defaultValue: T): T {
  if (typeof value === 'string' && validValues.includes(value as T)) {
    return value as T
  }
  return defaultValue
}

function ensureStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter(v => typeof v === 'string').map(v => String(v))
  }
  return []
}

function normalizeEngineeringSignals(signals: any): EngineeringSignals {
  return {
    contains_code: Boolean(signals?.contains_code),
    contains_architecture_diagram: Boolean(signals?.contains_architecture_diagram),
    contains_metrics_or_dashboards: Boolean(signals?.contains_metrics_or_dashboards),
    contains_dev_tools: Boolean(signals?.contains_dev_tools),
    contains_open_source_markers: Boolean(signals?.contains_open_source_markers),
  }
}

function normalizeRecruitingSignals(signals: any): RecruitingSignals {
  return {
    contains_hiring_language: Boolean(signals?.contains_hiring_language),
    contains_role_titles: ensureStringArray(signals?.contains_role_titles),
    contains_compensation_or_benefits: Boolean(signals?.contains_compensation_or_benefits),
    contains_company_values: ensureStringArray(signals?.contains_company_values),
    contains_event_or_booth: Boolean(signals?.contains_event_or_booth),
  }
}

function normalizeRiskSignals(signals: any): RiskSignals {
  return {
    contains_political_content: Boolean(signals?.contains_political_content),
    contains_sensitive_or_inflammatory_language: Boolean(signals?.contains_sensitive_or_inflammatory_language),
    contains_personal_attack_or_harassment: Boolean(signals?.contains_personal_attack_or_harassment),
    contains_unsafe_or_illegal_activity: Boolean(signals?.contains_unsafe_or_illegal_activity),
    contains_sexual_content: Boolean(signals?.contains_sexual_content),
  }
}

// ============================================================================
// BATCH EXTRACTION
// ============================================================================

/**
 * Extract context from multiple images in parallel.
 * 
 * @param images - Array of image inputs
 * @returns Array of ImageContext objects (same order as input)
 */
export async function extractMultipleImageContexts(
  images: ImageInput[]
): Promise<ImageContext[]> {
  if (images.length === 0) return []

  // Process in parallel with concurrency limit
  const CONCURRENCY = 3
  const results: ImageContext[] = []

  for (let i = 0; i < images.length; i += CONCURRENCY) {
    const batch = images.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(extractImageContext))
    results.push(...batchResults)
  }

  return results
}
