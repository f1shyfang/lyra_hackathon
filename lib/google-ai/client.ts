import { GoogleGenAI } from '@google/genai'

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

/**
 * Get critique from a persona for a LinkedIn post
 */
export async function getPersonaCritique(
  systemPrompt: string,
  content: string,
  model: string = 'gemini-2.0-flash-exp'
): Promise<CritiqueResponse> {
  const prompt = `You are a LinkedIn content critic. Your role is defined by this persona: ${systemPrompt}

Critique this LinkedIn post: "${content}"

Provide your critique in the following JSON format:
{
  "cringe_score": <number 0-100, where 0 is not cringe at all and 100 is extremely cringe>,
  "excitement_score": <number 0-100, where 0 is boring and 100 is extremely exciting>,
  "critique": "<your detailed critique of the post>",
  "specific_fix": "<a specific suggestion to improve the post, or null if no fix needed>"
}

Respond ONLY with valid JSON, no additional text.`

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    })

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
 */
export async function getPersonaVariantEvaluation(
  systemPrompt: string,
  variantContent: string,
  model: string = 'gemini-2.0-flash-exp'
): Promise<VariantEvaluationResponse> {
  const prompt = `You are evaluating LinkedIn post variants. Your role is defined by this persona: ${systemPrompt}

Rate this LinkedIn post variant on a scale of 0-100, where 0 is terrible and 100 is excellent: "${variantContent}"

Provide your evaluation in the following JSON format:
{
  "score": <number 0-100>,
  "feedback": "<optional brief feedback about this variant>"
}

Respond ONLY with valid JSON, no additional text.`

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    })

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

