import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiPersonas } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const rows = await db.select().from(aiPersonas).orderBy(asc(aiPersonas.name))
    const personas = includeInactive ? rows : rows.filter((p) => p.active)

    return NextResponse.json({ success: true, personas })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, systemPrompt, active } = body

    const persona = (
      await db
        .insert(aiPersonas)
        .values({
          name: name ?? null,
          systemPrompt: systemPrompt ?? null,
          active: active ?? true,
        })
        .returning()
    )[0]

    return NextResponse.json({ success: true, persona }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
