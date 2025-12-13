import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateQuality } from '@/lib/services/quality-gate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, variants, algorithm = 'epsilon_greedy', epsilon = 0.1 } = await request.json()

    const supabase = await createClient()

    // Get draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', id)
      .single()

    if (draftError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Check quality gate
    const qualityResult = await evaluateQuality(id)
    if (!qualityResult.passed) {
      return NextResponse.json(
        { error: `Draft does not pass quality gate: ${qualityResult.reason}` },
        { status: 400 }
      )
    }

    // Validate variants
    if (!variants || !Array.isArray(variants) || variants.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 variants are required' },
        { status: 400 }
      )
    }

    // Create A/B test
    const { data: abTest, error: abTestError } = await supabase
      .from('ab_tests')
      .insert({
        draft_id: id,
        name: name || `A/B Test for Draft ${id.substring(0, 8)}`,
        status: 'draft',
        algorithm,
        epsilon: algorithm === 'epsilon_greedy' ? epsilon : null,
      })
      .select()
      .single()

    if (abTestError) {
      console.error('Error creating A/B test:', abTestError)
      return NextResponse.json(
        { error: `Failed to create A/B test: ${abTestError.message}` },
        { status: 500 }
      )
    }

    // Create variants
    const variantInserts = variants.map((content: string, index: number) => ({
      ab_test_id: abTest.id,
      name: `variant_${String.fromCharCode(97 + index)}`, // variant_a, variant_b, etc.
      content: content.trim(),
    }))

    const { data: createdVariants, error: variantsError } = await supabase
      .from('ab_test_variants')
      .insert(variantInserts)
      .select()

    if (variantsError) {
      console.error('Error creating variants:', variantsError)
      // Clean up A/B test if variants fail
      await supabase.from('ab_tests').delete().eq('id', abTest.id)
      return NextResponse.json(
        { error: `Failed to create variants: ${variantsError.message}` },
        { status: 500 }
      )
    }

    // Update draft status to shipped
    await supabase
      .from('drafts')
      .update({ status: 'shipped' })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      abTest,
      variants: createdVariants,
    })
  } catch (error) {
    console.error('Error in POST /api/drafts/[id]/ship:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

