import { db } from '@/lib/db'
import { abTests, abTestVariants, abTestEvaluations, aiPersonas,
  type AiPersona, type ABTestVariant, type ABTest } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getPersonaVariantEvaluation } from '@/lib/google-ai/client'

export interface ABTestRunResult {
  abTestId: string
  evaluations: Array<{
    variantId: string
    variantName: string
    personaId: string
    personaName: string
    score: number
  }>
  variantStats: Array<{
    variantId: string
    variantName: string
    avgScore: number
    totalEvaluations: number
  }>
  winner?: {
    variantId: string
    variantName: string
    avgScore: number
  }
}

/**
 * Run A/B test using personas as simulated users
 */
export async function runABTest(abTestId: string): Promise<ABTestRunResult> {
  // Get A/B test
  const abTest = (await db.select().from(abTests).where(eq(abTests.id, abTestId)))[0]
  if (!abTest) throw new Error('A/B test not found')

  // Get all variants
  const variants = await db.select().from(abTestVariants)
    .where(eq(abTestVariants.abTestId, abTestId)).orderBy(asc(abTestVariants.name))
  if (!variants.length) throw new Error('No variants found for A/B test')

  // Get all active personas
  const personas = await db.select().from(aiPersonas).where(eq(aiPersonas.active, true))
  if (!personas.length) throw new Error('No active personas found')

  // Update test status to running
  if (abTest.status === 'draft') {
    await db.update(abTests).set({ status: 'running', startedAt: new Date() })
      .where(eq(abTests.id, abTestId))
  }

  // Run evaluations based on algorithm
  const evaluations: ABTestRunResult['evaluations'] = []

  if (abTest.algorithm === 'epsilon_greedy') {
    await runEpsilonGreedy(abTest, variants, personas, evaluations)
  } else if (abTest.algorithm === 'fixed_split') {
    await runFixedSplit(abTest, variants, personas, evaluations)
  } else {
    // Default: evaluate all variants with all personas
    await runFullEvaluation(variants, personas, evaluations, abTestId)
  }

  // Calculate variant statistics
  const variantStats = calculateVariantStats(variants, evaluations)

  // Determine winner
  const winner = variantStats.length > 0
    ? variantStats.reduce((best, current) =>
        current.avgScore > best.avgScore ? current : best
      )
    : undefined

  // Update variant statistics in database
  for (const stat of variantStats) {
    const variant = variants.find(v => v.id === stat.variantId)
    if (variant) {
      await db.update(abTestVariants).set({
        totalEvaluations: stat.totalEvaluations,
        totalScore: Math.round(stat.avgScore * stat.totalEvaluations),
      }).where(eq(abTestVariants.id, stat.variantId))
    }
  }

  return {
    abTestId,
    evaluations,
    variantStats,
    winner: winner ? {
      variantId: winner.variantId,
      variantName: winner.variantName,
      avgScore: winner.avgScore,
    } : undefined,
  }
}

/**
 * Epsilon-Greedy algorithm: with probability ε, explore (random variant);
 * with probability 1-ε, exploit (best performing variant)
 */
async function runEpsilonGreedy(
  abTest: ABTest,
  variants: ABTestVariant[],
  personas: AiPersona[],
  evaluations: ABTestRunResult['evaluations']
) {
  const epsilon = Number(abTest.epsilon ?? 0.1)

  // First, get current variant stats to determine best variant
  const currentStats = await getCurrentVariantStats(abTest.id)

  for (const persona of personas) {
    let selectedVariant: ABTestVariant

    // Epsilon-greedy selection
    if (Math.random() < epsilon) {
      // Explore: randomly select a variant
      selectedVariant = variants[Math.floor(Math.random() * variants.length)]
    } else {
      // Exploit: select best performing variant
      if (currentStats.length > 0) {
        const bestVariant = currentStats.reduce((best, current) =>
          (current.avgScore || 0) > (best.avgScore || 0) ? current : best
        )
        selectedVariant = variants.find(v => v.id === bestVariant.variantId) || variants[0]
      } else {
        // No stats yet, explore
        selectedVariant = variants[Math.floor(Math.random() * variants.length)]
      }
    }

    // Evaluate selected variant
    try {
      const multimodalContent = {
        text: selectedVariant.content,
        imageUrls: selectedVariant.imageUrls ?? undefined,
      }
      const evaluation = await getPersonaVariantEvaluation(
        persona.systemPrompt || '',
        multimodalContent
      )

      // Save evaluation
      const savedEval = (await db.insert(abTestEvaluations).values({
        abTestId: abTest.id,
        variantId: selectedVariant.id,
        personaId: persona.id,
        score: evaluation.score,
      }).returning())[0]

      if (savedEval) {
        evaluations.push({
          variantId: selectedVariant.id,
          variantName: selectedVariant.name,
          personaId: persona.id,
          personaName: persona.name || 'Unknown',
          score: evaluation.score,
        })
      }

      // Update current stats for next iteration
      const statIndex = currentStats.findIndex(s => s.variantId === selectedVariant.id)
      if (statIndex >= 0) {
        currentStats[statIndex].totalEvaluations++
        currentStats[statIndex].totalScore += evaluation.score
        currentStats[statIndex].avgScore = currentStats[statIndex].totalScore / currentStats[statIndex].totalEvaluations
      } else {
        currentStats.push({
          variantId: selectedVariant.id,
          variantName: selectedVariant.name,
          totalEvaluations: 1,
          totalScore: evaluation.score,
          avgScore: evaluation.score,
        })
      }
    } catch (error) {
      console.error(`Error evaluating variant ${selectedVariant.id} with persona ${persona.id}:`, error)
    }
  }
}

/**
 * Fixed split: evenly distribute personas across variants
 */
async function runFixedSplit(
  abTest: ABTest,
  variants: ABTestVariant[],
  personas: AiPersona[],
  evaluations: ABTestRunResult['evaluations']
) {
  const personasPerVariant = Math.ceil(personas.length / variants.length)

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i]
    const variantIndex = Math.floor(i / personasPerVariant) % variants.length
    const variant = variants[variantIndex]

    try {
      const multimodalContent = {
        text: variant.content,
        imageUrls: variant.imageUrls ?? undefined,
      }
      const evaluation = await getPersonaVariantEvaluation(
        persona.systemPrompt || '',
        multimodalContent
      )

      await db.insert(abTestEvaluations).values({
        abTestId: abTest.id,
        variantId: variant.id,
        personaId: persona.id,
        score: evaluation.score,
      })

      evaluations.push({
        variantId: variant.id,
        variantName: variant.name,
        personaId: persona.id,
        personaName: persona.name || 'Unknown',
        score: evaluation.score,
      })
    } catch (error) {
      console.error(`Error evaluating variant ${variant.id} with persona ${persona.id}:`, error)
    }
  }
}

/**
 * Full evaluation: each persona evaluates all variants
 */
async function runFullEvaluation(
  variants: ABTestVariant[],
  personas: AiPersona[],
  evaluations: ABTestRunResult['evaluations'],
  abTestId: string
) {
  for (const persona of personas) {
    const personaEvaluations: Array<{ variant: ABTestVariant; score: number }> = []

    // Evaluate all variants
    for (const variant of variants) {
      try {
        const evaluation = await getPersonaVariantEvaluation(
          persona.systemPrompt || '',
          variant.content
        )

        personaEvaluations.push({
          variant,
          score: evaluation.score,
        })

        await db.insert(abTestEvaluations).values({
          abTestId,
          variantId: variant.id,
          personaId: persona.id,
          score: evaluation.score,
        })

        evaluations.push({
          variantId: variant.id,
          variantName: variant.name,
          personaId: persona.id,
          personaName: persona.name || 'Unknown',
          score: evaluation.score,
        })
      } catch (error) {
        console.error(`Error evaluating variant ${variant.id} with persona ${persona.id}:`, error)
      }
    }

    // Set preference ranks
    personaEvaluations.sort((a, b) => b.score - a.score)
    for (let i = 0; i < personaEvaluations.length; i++) {
      await db.update(abTestEvaluations).set({ preferenceRank: i + 1 })
        .where(and(
          eq(abTestEvaluations.abTestId, abTestId),
          eq(abTestEvaluations.variantId, personaEvaluations[i].variant.id),
          eq(abTestEvaluations.personaId, persona.id),
        ))
    }
  }
}

/**
 * Get current variant statistics from database
 */
async function getCurrentVariantStats(abTestId: string) {
  const variants = await db.select().from(abTestVariants)
    .where(eq(abTestVariants.abTestId, abTestId))

  return variants.map(v => ({
    variantId: v.id,
    variantName: v.name,
    totalEvaluations: v.totalEvaluations || 0,
    totalScore: v.totalScore || 0,
    avgScore: Number(v.avgScore ?? 0),
  }))
}

/**
 * Calculate variant statistics from evaluations
 */
function calculateVariantStats(
  variants: ABTestVariant[],
  evaluations: ABTestRunResult['evaluations']
): ABTestRunResult['variantStats'] {
  const statsMap = new Map<string, { totalScore: number; count: number }>()

  for (const eval_ of evaluations) {
    const existing = statsMap.get(eval_.variantId) || { totalScore: 0, count: 0 }
    statsMap.set(eval_.variantId, {
      totalScore: existing.totalScore + eval_.score,
      count: existing.count + 1,
    })
  }

  return variants.map(variant => {
    const stat = statsMap.get(variant.id) || { totalScore: 0, count: 0 }
    return {
      variantId: variant.id,
      variantName: variant.name,
      avgScore: stat.count > 0 ? stat.totalScore / stat.count : 0,
      totalEvaluations: stat.count,
    }
  })
}
