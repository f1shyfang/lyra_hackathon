import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiPersonas } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updates: Partial<typeof aiPersonas.$inferInsert> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt
    if (body.active !== undefined) updates.active = body.active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const persona = (
      await db.update(aiPersonas).set(updates).where(eq(aiPersonas.id, id)).returning()
    )[0]

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, persona })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = (await db.delete(aiPersonas).where(eq(aiPersonas.id, id)).returning())[0]
    if (!deleted) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
