import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runSimulation } from '@/lib/services/council-processor'
import { evaluateQuality } from '@/lib/services/quality-gate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { iterationNumber } = await request.json().catch(() => ({}))
    
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

    // Run AI Council processing
    const result = await runSimulation(
      id,
      draft.content,
      iterationNumber || (draft.iteration_count || 0) + 1
    )

    // Evaluate quality gate
    const qualityResult = await evaluateQuality(id)

    return NextResponse.json({
      success: true,
      result,
      qualityGate: qualityResult,
    })
  } catch (error) {
    console.error('Error in POST /api/drafts/[id]/process:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

