import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drafts, aiPersonas } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { uploadImages } from '@/lib/storage/image-upload'
import { runSimulationWithPersonas } from '@/lib/services/council-processor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const content = formData.get('content') as string | null
    const personaIdsJson = formData.get('personaIds') as string | null
    const imageFiles = formData.getAll('images') as File[]

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate persona IDs
    let personaIds: string[] = []
    if (personaIdsJson) {
      try {
        personaIds = JSON.parse(personaIdsJson)
        if (!Array.isArray(personaIds) || personaIds.length === 0) {
          return NextResponse.json(
            { error: 'At least one persona must be selected' },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid personaIds format' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'personaIds is required' },
        { status: 400 }
      )
    }

    // 1. Create draft first to get the ID
    const draft = (await db
      .insert(drafts)
      .values({
        content: content.trim(),
        status: 'pending',
        imageUrls: [],
      })
      .returning())[0]

    // 2. Upload images if provided
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

    // 3. Fetch selected personas
    const personas = await db
      .select()
      .from(aiPersonas)
      .where(and(inArray(aiPersonas.id, personaIds), eq(aiPersonas.active, true)))

    if (!personas.length) {
      return NextResponse.json(
        { error: 'No valid personas found for the selected IDs' },
        { status: 400 }
      )
    }

    // 4. Run simulation with selected personas
    const result = await runSimulationWithPersonas(
      draft.id,
      content.trim(),
      personas,
      imageUrls,
      1
    )

    return NextResponse.json({
      success: true,
      draftId: draft.id,
      result,
    })
  } catch (error) {
    console.error('Error in POST /api/simulation/run:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

