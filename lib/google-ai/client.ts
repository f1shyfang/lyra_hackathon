import { GoogleGenAI } from '@google/genai'
import { withRateLimit } from './rate-limiter'

// Initialize the Google AI client
// API key is read from GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({})

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

/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // Determine MIME type from response or URL
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim()

    return { data: base64, mimeType }
  } catch (error) {
    throw new Error(`Error processing image ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Build multimodal content parts for Gemini API
 */
async function buildMultimodalParts(content: MultimodalContent): Promise<Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>> {
  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = []

  // Add text part if present
  if (content.text) {
    parts.push({ text: content.text })
  }

  // Add image parts if present
  if (content.imageUrls && content.imageUrls.length > 0) {
    const imagePromises = content.imageUrls.map(url => fetchImageAsBase64(url))
    const images = await Promise.all(imagePromises)
    
    for (const image of images) {
      parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      })
    }
  }

  return parts
}

/**
 * Get critique from a persona for a LinkedIn post
 * Supports both text and images (multimodal)
 */
export async function getPersonaCritique(
  systemPrompt: string,
  content: string | MultimodalContent,
  model: string = 'gemini-2.0-flash-exp'
): Promise<CritiqueResponse> {
  // Handle backward compatibility: string content
  const multimodalContent: MultimodalContent = typeof content === 'string'
    ? { text: content }
    : content

  // Build prompt text
  const contentDescription = multimodalContent.imageUrls && multimodalContent.imageUrls.length > 0
    ? 'this LinkedIn post (including any images)'
    : 'this LinkedIn post'

  const promptText = `You are a LinkedIn content critic. Your role is defined by this persona: ${systemPrompt}

Critique ${contentDescription}${multimodalContent.text ? `: "${multimodalContent.text}"` : ''}

${multimodalContent.imageUrls && multimodalContent.imageUrls.length > 0
    ? `The post includes ${multimodalContent.imageUrls.length} image(s). Evaluate both the text and visual content, considering how they work together.`
    : ''}

Provide your critique in the following JSON format:
{
  "cringe_score": <number 0-100, where 0 is not cringe at all and 100 is extremely cringe>,
  "excitement_score": <number 0-100, where 0 is boring and 100 is extremely exciting>,
  "critique": "<your detailed critique of the post>",
  "specific_fix": "<a specific suggestion to improve the post, or null if no fix needed>"
}

Respond ONLY with valid JSON, no additional text.`

  try {
    // Build multimodal parts
    const parts = await buildMultimodalParts({
      text: promptText,
      imageUrls: multimodalContent.imageUrls,
    })

    // Make API call with rate limiting
    const response = await withRateLimit(
      () => ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
      }),
      'getPersonaCritique'
    )

    if (!response.text) {
      throw new Error('No response text from AI model')
    }

    const text = response.text.trim()
    
    // Try to extract JSON from the response
    let jsonText = text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const result = JSON.parse(jsonText) as CritiqueResponse

    // Validate and clamp scores
    result.cringe_score = Math.max(0, Math.min(100, Math.round(result.cringe_score)))
    result.excitement_score = Math.max(0, Math.min(100, Math.round(result.excitement_score)))

    return result
  } catch (error) {
    console.error('Error getting persona critique:', error)
    throw new Error(`Failed to get critique: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get variant evaluation from a persona for A/B testing
 * Supports both text and images (multimodal)
 */
export async function getPersonaVariantEvaluation(
  systemPrompt: string,
  variantContent: string | MultimodalContent,
  model: string = 'gemini-2.0-flash-exp'
): Promise<VariantEvaluationResponse> {
  // Handle backward compatibility: string content
  const multimodalContent: MultimodalContent = typeof variantContent === 'string'
    ? { text: variantContent }
    : variantContent

  // Build prompt text
  const contentDescription = multimodalContent.imageUrls && multimodalContent.imageUrls.length > 0
    ? 'this LinkedIn post variant (including any images)'
    : 'this LinkedIn post variant'

  const promptText = `You are evaluating LinkedIn post variants. Your role is defined by this persona: ${systemPrompt}

Rate ${contentDescription} on a scale of 0-100, where 0 is terrible and 100 is excellent${multimodalContent.text ? `: "${multimodalContent.text}"` : ''}

${multimodalContent.imageUrls && multimodalContent.imageUrls.length > 0
    ? `The variant includes ${multimodalContent.imageUrls.length} image(s). Evaluate both the text and visual content.`
    : ''}

Provide your evaluation in the following JSON format:
{
  "score": <number 0-100>,
  "feedback": "<optional brief feedback about this variant>"
}

Respond ONLY with valid JSON, no additional text.`

  try {
    // Build multimodal parts
    const parts = await buildMultimodalParts({
      text: promptText,
      imageUrls: multimodalContent.imageUrls,
    })

    // Make API call with rate limiting
    const response = await withRateLimit(
      () => ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
      }),
      'getPersonaVariantEvaluation'
    )

    if (!response.text) {
      throw new Error('No response text from AI model')
    }

    const text = response.text.trim()
    
    // Try to extract JSON from the response
    let jsonText = text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const result = JSON.parse(jsonText) as VariantEvaluationResponse

    // Validate and clamp score
    result.score = Math.max(0, Math.min(100, Math.round(result.score)))

    return result
  } catch (error) {
    console.error('Error getting variant evaluation:', error)
    throw new Error(`Failed to get variant evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export default ai

