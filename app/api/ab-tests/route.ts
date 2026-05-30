import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { abTests } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { enforceRateLimit } from '@/lib/ratelimit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const rows = await db.query.abTests.findMany({
      where: status ? eq(abTests.status, status as any) : undefined,
      orderBy: desc(abTests.createdAt),
      limit,
      offset,
      with: { draft: { columns: { id: true, content: true, status: true } } },
    })

    return NextResponse.json({ success: true, abTests: rows })
  } catch (error) {
    console.error('Error in GET /api/ab-tests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  try {
    const { draft_id, name, algorithm = 'epsilon_greedy', epsilon = 0.1 } = await request.json()

    if (!draft_id || !name) {
      return NextResponse.json(
        { error: 'draft_id and name are required' },
        { status: 400 }
      )
    }

    const abTest = (await db
      .insert(abTests)
      .values({
        draftId: draft_id,
        name,
        status: 'draft',
        algorithm,
        epsilon: algorithm === 'epsilon_greedy' ? String(epsilon) : null,
      })
      .returning())[0]

    return NextResponse.json({ success: true, abTest }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ab-tests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
