import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Get A/B test with draft
    const { data: abTest, error: abTestError } = await supabase
      .from('ab_tests')
      .select(`
        *,
        drafts (
          id,
          content,
          status
        )
      `)
      .eq('id', id)
      .single()

    if (abTestError || !abTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Get variants
    const { data: variants, error: variantsError } = await supabase
      .from('ab_test_variants')
      .select('*')
      .eq('ab_test_id', id)
      .order('name', { ascending: true })

    if (variantsError) {
      console.error('Error fetching variants:', variantsError)
    }

    // Get evaluations
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('ab_test_evaluations')
      .select(`
        *,
        ab_test_variants (
          id,
          name
        ),
        ai_personas (
          id,
          name
        )
      `)
      .eq('ab_test_id', id)
      .order('created_at', { ascending: false })

    if (evaluationsError) {
      console.error('Error fetching evaluations:', evaluationsError)
    }

    return NextResponse.json({
      success: true,
      abTest,
      variants: variants || [],
      evaluations: evaluations || [],
    })
  } catch (error) {
    console.error('Error in GET /api/ab-tests/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()

    // Only allow updating specific fields
    const allowedFields = ['name', 'status', 'algorithm', 'epsilon']
    const updates: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // If status is being set to completed, set ended_at
    if (updates.status === 'completed') {
      updates.ended_at = new Date().toISOString()
    }

    const { data: abTest, error } = await supabase
      .from('ab_tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating A/B test:', error)
      return NextResponse.json(
        { error: `Failed to update A/B test: ${error.message}` },
        { status: 500 }
      )
    }

    if (!abTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, abTest })
  } catch (error) {
    console.error('Error in PATCH /api/ab-tests/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

