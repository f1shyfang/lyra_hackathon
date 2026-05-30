import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { abTests, abTestVariants, abTestEvaluations } from '@/lib/db/schema'
import { eq, desc, asc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get A/B test with draft
    const abTest = await db.query.abTests.findFirst({
      where: eq(abTests.id, id),
      with: { draft: { columns: { id: true, content: true, status: true } } },
    })

    if (!abTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Get variants
    const variants = await db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.abTestId, id))
      .orderBy(asc(abTestVariants.name))

    // Get evaluations (with variant + persona)
    const evaluations = await db.query.abTestEvaluations.findMany({
      where: eq(abTestEvaluations.abTestId, id),
      orderBy: desc(abTestEvaluations.createdAt),
      with: {
        variant: { columns: { id: true, name: true } },
        persona: { columns: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      abTest,
      variants,
      evaluations,
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

    // Only allow updating specific fields (map to camelCase keys)
    const updates: Record<string, any> = {}

    if ('name' in body) {
      updates.name = body.name
    }
    if ('status' in body) {
      updates.status = body.status
    }
    if ('algorithm' in body) {
      updates.algorithm = body.algorithm
    }
    if ('epsilon' in body) {
      updates.epsilon = String(body.epsilon)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // If status is being set to completed, set endedAt
    if (updates.status === 'completed') {
      updates.endedAt = new Date()
    }

    const abTest = (await db
      .update(abTests)
      .set(updates)
      .where(eq(abTests.id, id))
      .returning())[0]

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
