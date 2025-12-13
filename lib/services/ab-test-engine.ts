import { createClient } from '@/lib/supabase/server'
import { getPersonaVariantEvaluation } from '@/lib/google-ai/client'
import { Tables } from '@/types/supabase'

type Persona = Tables<'ai_personas'>
type Variant = Tables<'ab_test_variants'>
type ABTest = Tables<'ab_tests'>

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
  const supabase = await createClient()

  // Get A/B test
  const { data: abTest, error: abTestError } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('id', abTestId)
    .single()

  if (abTestError || !abTest) {
    throw new Error('A/B test not found')
  }

  // Get all variants
  const { data: variants, error: variantsError } = await supabase
    .from('ab_test_variants')
    .select('*')
    .eq('ab_test_id', abTestId)
    .order('name', { ascending: true })

  if (variantsError || !variants || variants.length === 0) {
    throw new Error('No variants found for A/B test')
  }

  // Get all active personas
  const { data: personas, error: personasError } = await supabase
    .from('ai_personas')
    .select('*')
    .eq('active', true)

  if (personasError || !personas || personas.length === 0) {
    throw new Error('No active personas found')
  }

  // Update test status to running
  if (abTest.status === 'draft') {
    await supabase
      .from('ab_tests')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', abTestId)
  }

  // Run evaluations based on algorithm
  const evaluations: ABTestRunResult['evaluations'] = []

  if (abTest.algorithm === 'epsilon_greedy') {
    await runEpsilonGreedy(abTest, variants, personas, evaluations, supabase)
  } else if (abTest.algorithm === 'fixed_split') {
    await runFixedSplit(abTest, variants, personas, evaluations, supabase)
  } else {
    // Default: evaluate all variants with all personas
    await runFullEvaluation(variants, personas, evaluations, supabase, abTestId)
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
      await supabase
        .from('ab_test_variants')
        .update({
          total_evaluations: stat.totalEvaluations,
          total_score: stat.avgScore * stat.totalEvaluations,
        })
        .eq('id', stat.variantId)
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
  variants: Variant[],
  personas: Persona[],
  evaluations: ABTestRunResult['evaluations'],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const epsilon = abTest.epsilon || 0.1

  // First, get current variant stats to determine best variant
  const currentStats = await getCurrentVariantStats(abTest.id, supabase)
  
  for (const persona of personas) {
    let selectedVariant: Variant

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
      const evaluation = await getPersonaVariantEvaluation(
        persona.system_prompt || '',
        selectedVariant.content
      )

      // Save evaluation
      const { data: savedEval, error: evalError } = await supabase
        .from('ab_test_evaluations')
        .insert({
          ab_test_id: abTest.id,
          variant_id: selectedVariant.id,
          persona_id: persona.id,
          score: evaluation.score,
        })
        .select()
        .single()

      if (!evalError && savedEval) {
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
  variants: Variant[],
  personas: Persona[],
  evaluations: ABTestRunResult['evaluations'],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const personasPerVariant = Math.ceil(personas.length / variants.length)

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i]
    const variantIndex = Math.floor(i / personasPerVariant) % variants.length
    const variant = variants[variantIndex]

    try {
      const evaluation = await getPersonaVariantEvaluation(
        persona.system_prompt || '',
        variant.content
      )

      await supabase
        .from('ab_test_evaluations')
        .insert({
          ab_test_id: abTest.id,
          variant_id: variant.id,
          persona_id: persona.id,
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
  variants: Variant[],
  personas: Persona[],
  evaluations: ABTestRunResult['evaluations'],
  supabase: Awaited<ReturnType<typeof createClient>>,
  abTestId: string
) {
  for (const persona of personas) {
    const personaEvaluations: Array<{ variant: Variant; score: number }> = []

    // Evaluate all variants
    for (const variant of variants) {
      try {
        const evaluation = await getPersonaVariantEvaluation(
          persona.system_prompt || '',
          variant.content
        )

        personaEvaluations.push({
          variant,
          score: evaluation.score,
        })

        await supabase
          .from('ab_test_evaluations')
          .insert({
            ab_test_id: abTestId,
            variant_id: variant.id,
            persona_id: persona.id,
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
      await supabase
        .from('ab_test_evaluations')
        .update({ preference_rank: i + 1 })
        .eq('ab_test_id', abTestId)
        .eq('variant_id', personaEvaluations[i].variant.id)
        .eq('persona_id', persona.id)
    }
  }
}

/**
 * Get current variant statistics from database
 */
async function getCurrentVariantStats(
  abTestId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: variants } = await supabase
    .from('ab_test_variants')
    .select('id, name, total_evaluations, total_score, avg_score')
    .eq('ab_test_id', abTestId)

  return (variants || []).map(v => ({
    variantId: v.id,
    variantName: v.name,
    totalEvaluations: v.total_evaluations || 0,
    totalScore: v.total_score || 0,
    avgScore: v.avg_score || 0,
  }))
}

/**
 * Calculate variant statistics from evaluations
 */
function calculateVariantStats(
  variants: Variant[],
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

