import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drafts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { uploadImages } from '@/lib/storage/image-upload'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const content = formData.get('content') as string | null
    const imageFiles = formData.getAll('images') as File[]

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Create draft first to get the ID
    const draft = (await db
      .insert(drafts)
      .values({
        content: content.trim(),
        status: 'pending',
        imageUrls: [],
      })
      .returning())[0]

    // Upload images if provided
    let imageUrls: string[] = []
    if (imageFiles.length > 0 && imageFiles[0].size > 0) {
      try {
        const uploadedImages = await uploadImages(imageFiles.filter(f => f.size > 0), draft.id)
        imageUrls = uploadedImages.map(img => img.url)

        // Update draft with image URLs
        await db.update(drafts).set({ imageUrls }).where(eq(drafts.id, draft.id))
      } catch (uploadError) {
        console.error('Error uploading images:', uploadError)
        // Continue without images if upload fails
      }
    }

    // Fetch updated draft
    const updatedDraft = (await db.select().from(drafts).where(eq(drafts.id, draft.id)))[0]

    return NextResponse.json(
      { success: true, draft: updatedDraft || draft },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/drafts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const rows = await db
      .select()
      .from(drafts)
      .where(status ? eq(drafts.status, status as any) : undefined)
      .orderBy(desc(drafts.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ success: true, drafts: rows })
  } catch (error) {
    console.error('Error in GET /api/drafts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
