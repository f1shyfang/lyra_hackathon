import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drafts, councilFeedback } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { uploadImages, deleteImages, extractPathFromUrl } from '@/lib/storage/image-upload'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get draft
    const draft = (await db.select().from(drafts).where(eq(drafts.id, id)))[0]

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found', id },
        { status: 404 }
      )
    }

    // Get feedback for this draft (with persona)
    const feedback = await db.query.councilFeedback.findMany({
      where: eq(councilFeedback.draftId, id),
      orderBy: desc(councilFeedback.createdAt),
      with: { persona: { columns: { id: true, name: true, systemPrompt: true } } },
    })

    return NextResponse.json({
      success: true,
      draft,
      feedback,
    })
  } catch (error) {
    console.error('Error in GET /api/drafts/[id]:', error)
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
    const contentType = request.headers.get('content-type') || ''

    // Handle multipart/form-data (with images)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const content = formData.get('content') as string | null
      const status = formData.get('status') as string | null
      const imageFiles = formData.getAll('images') as File[]
      const deleteImageUrls = formData.getAll('deleteImageUrls') as string[]

      const updates: Record<string, any> = {}

      if (content !== null) {
        updates.content = content.trim()
      }
      if (status !== null) {
        updates.status = status
      }

      // Get current draft to manage image URLs
      const currentDraft = (await db
        .select({ imageUrls: drafts.imageUrls })
        .from(drafts)
        .where(eq(drafts.id, id)))[0]

      let imageUrls: string[] = currentDraft?.imageUrls ?? []

      // Delete specified images
      if (deleteImageUrls.length > 0) {
        const pathsToDelete = deleteImageUrls
          .map(url => extractPathFromUrl(url))
          .filter((path): path is string => path !== null)

        if (pathsToDelete.length > 0) {
          try {
            await deleteImages(pathsToDelete)
          } catch (deleteError) {
            console.error('Error deleting images:', deleteError)
          }
        }

        // Remove deleted URLs from array
        imageUrls = imageUrls.filter(url => !deleteImageUrls.includes(url))
      }

      // Upload new images
      if (imageFiles.length > 0 && imageFiles[0].size > 0) {
        try {
          const uploadedImages = await uploadImages(
            imageFiles.filter(f => f.size > 0),
            id
          )
          imageUrls = [...imageUrls, ...uploadedImages.map(img => img.url)]
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError)
          // Continue without new images if upload fails
        }
      }

      updates.imageUrls = imageUrls

      const draft = (await db
        .update(drafts)
        .set(updates)
        .where(eq(drafts.id, id))
        .returning())[0]

      if (!draft) {
        return NextResponse.json(
          { error: 'Draft not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, draft })
    } else {
      // Handle JSON (backward compatible)
      const body = await request.json()

      // Only allow updating specific fields (map to camelCase keys)
      const updates: Record<string, any> = {}

      if ('content' in body) {
        updates.content = body.content
      }
      if ('status' in body) {
        updates.status = body.status
      }
      if ('image_urls' in body) {
        updates.imageUrls = body.image_urls
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        )
      }

      const draft = (await db
        .update(drafts)
        .set(updates)
        .where(eq(drafts.id, id))
        .returning())[0]

      if (!draft) {
        return NextResponse.json(
          { error: 'Draft not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, draft })
    }
  } catch (error) {
    console.error('Error in PATCH /api/drafts/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
