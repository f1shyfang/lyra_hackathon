import { createClient } from '@/lib/supabase/server'
import { getPersonaCritique } from '@/lib/google-ai/client'
import { Tables } from '@/types/supabase'

type Persona = Tables<'ai_personas'>
type CouncilFeedback = Tables<'council_feedback'>

export interface CouncilProcessingResult {
  draftId: string
  feedback: CouncilFeedback[]
  avgCringeScore: number
  avgExcitementScore: number
  qualityScore: number
}

/**
 * Run AI Council simulation - all personas critique the LinkedIn post in parallel
 */
export async function runSimulation(
  draftId: string,
  content: string,
  iterationNumber: number = 1
): Promise<CouncilProcessingResult> {
  const supabase = await createClient()

  // 1. Fetch draft to get image URLs
  const { data: draft, error: draftError } = await supabase
    .from('drafts')
    .select('image_urls')
    .eq('id', draftId)
    .single()

  if (draftError) {
    throw new Error(`Failed to fetch draft: ${draftError.message}`)
  }

  // 2. Fetch all active personas
  const { data: personas, error: personasError } = await supabase
    .from('ai_personas')
    .select('*')
    .eq('active', true)

  if (personasError) {
    throw new Error(`Failed to fetch personas: ${personasError.message}`)
  }

  if (!personas || personas.length === 0) {
    throw new Error('No active personas found')
  }

  return runSimulationWithPersonas(draftId, content, personas, draft?.image_urls as string[] | null, iterationNumber)
}

/**
 * Run AI Council simulation with specific personas
 */
export async function runSimulationWithPersonas(
  draftId: string,
  content: string,
  personas: Persona[],
  imageUrls: string[] | null = null,
  iterationNumber: number = 1
): Promise<CouncilProcessingResult> {
  const supabase = await createClient()

  if (!personas || personas.length === 0) {
    throw new Error('No personas provided')
  }

  // 3. Update draft status to processing
  await supabase
    .from('drafts')
    .update({ status: 'processing' })
    .eq('id', draftId)

  // 4. Prepare multimodal content
  const multimodalContent = {
    text: content,
    imageUrls: imageUrls || undefined,
  }

  // 5. Parallel Processing - Call Gemini Nano for each persona
  const critiquePromises = personas.map(async (persona: Persona) => {
    try {
      const critique = await getPersonaCritique(
        persona.system_prompt || '',
        multimodalContent
      )

      // Save feedback to database
      const { data: feedback, error: feedbackError } = await supabase
        .from('council_feedback')
        .insert({
          draft_id: draftId,
          persona_id: persona.id,
          cringe_score: critique.cringe_score,
          excitement_score: critique.excitement_score,
          critique: critique.critique,
          specific_fix: critique.specific_fix,
          iteration_number: iterationNumber,
        })
        .select()
        .single()

      if (feedbackError) {
        console.error(`Error saving feedback for persona ${persona.id}:`, feedbackError)
        throw feedbackError
      }

      return feedback
    } catch (error) {
      console.error(`Error processing persona ${persona.id}:`, error)
      // Continue with other personas even if one fails
      return null
    }
  })

  const feedbackResults = await Promise.all(critiquePromises)
  const validFeedback = feedbackResults.filter((f): f is CouncilFeedback => f !== null)

  if (validFeedback.length === 0) {
    throw new Error('No valid feedback received from personas')
  }

  // 4. Calculate average scores
  const avgCringeScore = Math.round(
    validFeedback.reduce((sum, f) => sum + f.cringe_score, 0) / validFeedback.length
  )
  const avgExcitementScore = Math.round(
    validFeedback.reduce((sum, f) => sum + f.excitement_score, 0) / validFeedback.length
  )

  // Quality score: higher excitement, lower cringe = better
  // Formula: (excitement_score * 0.7) + ((100 - cringe_score) * 0.3)
  const qualityScore = Math.round(
    avgExcitementScore * 0.7 + (100 - avgCringeScore) * 0.3
  )

  // 5. Update the draft with averages and set status to completed
  const { error: updateError } = await supabase
    .from('drafts')
    .update({
      avg_cringe_score: avgCringeScore,
      avg_excitement_score: avgExcitementScore,
      quality_score: qualityScore,
      iteration_count: iterationNumber,
      status: 'completed',
    })
    .eq('id', draftId)

  if (updateError) {
    throw new Error(`Failed to update draft scores: ${updateError.message}`)
  }

  return {
    draftId,
    feedback: validFeedback,
    avgCringeScore,
    avgExcitementScore,
    qualityScore,
  }
}

