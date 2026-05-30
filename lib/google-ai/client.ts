/**
 * Persona AI client — now backed by the Vercel AI SDK (provider-swappable).
 *
 * Structured outputs are produced with `generateObject` + zod schemas, which
 * replaces the previous brittle regex JSON extraction. The model is resolved
 * via `getModel()` so the provider can be swapped with one env var (`AI_MODEL`).
 *
 * The exported function signatures and return types are unchanged so existing
 * consumers (council-processor, ab-test-engine) keep working untouched.
 *
 * The optional `model` argument overrides the provider/model for a single call;
 * when omitted, the resolved model comes from `getModel()` (i.e. the `AI_MODEL`
 * env var, default openai/gpt-4o-mini). Pass a Gateway-style "provider/model"
 * string to override (e.g. "openai/gpt-4o").
 *
 * NOTE: this directory is named `google-ai/` for historical reasons; it is now
 * provider-agnostic (OpenAI by default).
 */
import { generateObject } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai/provider'
import { withRateLimit } from './rate-limiter'

export interface CritiqueResponse {
  cringe_score: number
  excitement_score: number
  critique: string
  specific_fix: string | null
}

export interface VariantEvaluationResponse {
  score: number
  preference_rank?: number
  feedback?: string
}

export interface MultimodalContent {
  text?: string
  imageUrls?: string[]
}

// Zod schemas drive structured generation (no more manual JSON parsing).
const critiqueSchema = z.object({
  cringe_score: z
    .number()
    .describe('0-100, where 0 is not cringe at all and 100 is extremely cringe'),
  excitement_score: z
    .number()
    .describe('0-100, where 0 is boring and 100 is extremely exciting'),
  critique: z.string().describe('Detailed critique of the post'),
  specific_fix: z
    .string()
    .nullable()
    .describe('A specific suggestion to improve the post, or null if none needed'),
})

const variantEvaluationSchema = z.object({
  score: z.number().describe('0-100, where 0 is terrible and 100 is excellent'),
  preference_rank: z
    .number()
    .optional()
    .describe('Optional preference ranking among variants'),
  feedback: z.string().optional().describe('Optional brief feedback about this variant'),
})

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * Build AI SDK message content parts (text + image) for a multimodal prompt.
 * Image URLs are passed through directly as AI SDK image parts — the SDK/model
 * handles fetching, so we no longer base64-inline them manually.
 */
function buildContentParts(
  promptText: string,
  imageUrls?: string[]
): Array<{ type: 'text'; text: string } | { type: 'image'; image: URL }> {
  const parts: Array<
    { type: 'text'; text: string } | { type: 'image'; image: URL }
  > = [{ type: 'text', text: promptText }]

  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      parts.push({ type: 'image', image: new URL(url) })
    }
  }

  return parts
}

/**
 * Get critique from a persona for a LinkedIn post.
 * Supports both text and images (multimodal).
 */
export async function getPersonaCritique(
  systemPrompt: string,
  content: string | MultimodalContent,
  model?: string
): Promise<CritiqueResponse> {
  const multimodalContent: MultimodalContent =
    typeof content === 'string' ? { text: content } : content

  const hasImages = Boolean(multimodalContent.imageUrls?.length)
  const contentDescription = hasImages
    ? 'this LinkedIn post (including any images)'
    : 'this LinkedIn post'

  const promptText = `You are a LinkedIn content critic. Your role is defined by this persona: ${systemPrompt}

Critique ${contentDescription}${multimodalContent.text ? `: "${multimodalContent.text}"` : ''}

${
  hasImages
    ? `The post includes ${multimodalContent.imageUrls!.length} image(s). Evaluate both the text and visual content, considering how they work together.`
    : ''
}

Provide a cringe_score (0-100), an excitement_score (0-100), a detailed critique, and a specific_fix suggestion (or null if no fix is needed).`

  try {
    const { object } = await withRateLimit(
      () =>
        generateObject({
          model: getModel(model),
          schema: critiqueSchema,
          messages: [
            {
              role: 'user',
              content: buildContentParts(promptText, multimodalContent.imageUrls),
            },
          ],
        }),
      'getPersonaCritique'
    )

    return {
      cringe_score: clamp(object.cringe_score),
      excitement_score: clamp(object.excitement_score),
      critique: object.critique,
      specific_fix: object.specific_fix,
    }
  } catch (error) {
    console.error('Error getting persona critique:', error)
    throw new Error(
      `Failed to get critique: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get variant evaluation from a persona for A/B testing.
 * Supports both text and images (multimodal).
 */
export async function getPersonaVariantEvaluation(
  systemPrompt: string,
  variantContent: string | MultimodalContent,
  model?: string
): Promise<VariantEvaluationResponse> {
  const multimodalContent: MultimodalContent =
    typeof variantContent === 'string' ? { text: variantContent } : variantContent

  const hasImages = Boolean(multimodalContent.imageUrls?.length)
  const contentDescription = hasImages
    ? 'this LinkedIn post variant (including any images)'
    : 'this LinkedIn post variant'

  const promptText = `You are evaluating LinkedIn post variants. Your role is defined by this persona: ${systemPrompt}

Rate ${contentDescription} on a scale of 0-100, where 0 is terrible and 100 is excellent${multimodalContent.text ? `: "${multimodalContent.text}"` : ''}

${
  hasImages
    ? `The variant includes ${multimodalContent.imageUrls!.length} image(s). Evaluate both the text and visual content.`
    : ''
}

Provide a score (0-100) and optional brief feedback about this variant.`

  try {
    const { object } = await withRateLimit(
      () =>
        generateObject({
          model: getModel(model),
          schema: variantEvaluationSchema,
          messages: [
            {
              role: 'user',
              content: buildContentParts(promptText, multimodalContent.imageUrls),
            },
          ],
        }),
      'getPersonaVariantEvaluation'
    )

    return {
      score: clamp(object.score),
      preference_rank: object.preference_rank,
      feedback: object.feedback,
    }
  } catch (error) {
    console.error('Error getting variant evaluation:', error)
    throw new Error(
      `Failed to get variant evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
