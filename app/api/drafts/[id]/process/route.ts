import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drafts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { runSimulation } from '@/lib/services/council-processor'
import { evaluateQuality } from '@/lib/services/quality-gate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { iterationNumber } = await request.json().catch(() => ({}))

    // Get draft
    const draft = (await db.select().from(drafts).where(eq(drafts.id, id)))[0]

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Run AI Council processing
    const result = await runSimulation(
      id,
      draft.content,
      iterationNumber || (draft.iterationCount || 0) + 1
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

