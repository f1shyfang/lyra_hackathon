import { db } from '@/lib/db'
import { drafts, aiPersonas, councilFeedback, type AiPersona, type CouncilFeedback } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getPersonaCritique } from '@/lib/google-ai/client'

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
  // 1. Fetch draft to get image URLs
  const draft = (await db.select({ imageUrls: drafts.imageUrls }).from(drafts).where(eq(drafts.id, draftId)))[0]
  if (!draft) throw new Error('Failed to fetch draft')

  // 2. Fetch all active personas
  const personas = await db.select().from(aiPersonas).where(eq(aiPersonas.active, true))
  if (!personas.length) throw new Error('No active personas found')

  return runSimulationWithPersonas(draftId, content, personas, draft?.imageUrls ?? null, iterationNumber)
}

/**
 * Run AI Council simulation with specific personas
 */
export async function runSimulationWithPersonas(
  draftId: string,
  content: string,
  personas: AiPersona[],
  imageUrls: string[] | null = null,
  iterationNumber: number = 1
): Promise<CouncilProcessingResult> {
  if (!personas || personas.length === 0) {
    throw new Error('No personas provided')
  }

  // 3. Update draft status to processing
  await db.update(drafts).set({ status: 'processing' }).where(eq(drafts.id, draftId))

  // 4. Prepare multimodal content
  const multimodalContent = {
    text: content,
    imageUrls: imageUrls || undefined,
  }

  // 5. Parallel Processing - Call Gemini Nano for each persona
  const critiquePromises = personas.map(async (persona: AiPersona) => {
    try {
      const critique = await getPersonaCritique(
        persona.systemPrompt || '',
        multimodalContent
      )

      // Save feedback to database
      const feedback = (await db.insert(councilFeedback).values({
        draftId,
        personaId: persona.id,
        cringeScore: critique.cringe_score,
        excitementScore: critique.excitement_score,
        critique: critique.critique,
        specificFix: critique.specific_fix,
        iterationNumber,
      }).returning())[0]

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
    validFeedback.reduce((sum, f) => sum + f.cringeScore, 0) / validFeedback.length
  )
  const avgExcitementScore = Math.round(
    validFeedback.reduce((sum, f) => sum + f.excitementScore, 0) / validFeedback.length
  )

  // Quality score: higher excitement, lower cringe = better
  // Formula: (excitement_score * 0.7) + ((100 - cringe_score) * 0.3)
  const qualityScore = Math.round(
    avgExcitementScore * 0.7 + (100 - avgCringeScore) * 0.3
  )

  // 5. Update the draft with averages
  // Note: Status remains as 'processing' since 'completed' is not a valid enum value
  // The draft has been processed and results are available
  await db.update(drafts).set({
    avgCringeScore: avgCringeScore,
    avgExcitementScore: avgExcitementScore,
    qualityScore: qualityScore,
    iterationCount: iterationNumber,
  }).where(eq(drafts.id, draftId))

  return {
    draftId,
    feedback: validFeedback,
    avgCringeScore,
    avgExcitementScore,
    qualityScore,
  }
}
