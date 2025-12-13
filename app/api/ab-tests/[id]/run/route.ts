import { NextRequest, NextResponse } from 'next/server'
import { runABTest } from '@/lib/services/ab-test-engine'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await runABTest(id)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Error in POST /api/ab-tests/[id]/run:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

