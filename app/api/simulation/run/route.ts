import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // 1. Create draft first to get the ID
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .insert({
        content: content.trim(),
        status: 'pending',
        image_urls: [],
      })
      .select()
      .single()

    if (draftError) {
      console.error('Error creating draft:', draftError)
      return NextResponse.json(
        { error: `Failed to create draft: ${draftError.message}` },
        { status: 500 }
      )
    }

    // 2. Upload images if provided
    let imageUrls: string[] = []
    if (imageFiles.length > 0 && imageFiles[0].size > 0) {
      try {
        const uploadedImages = await uploadImages(imageFiles.filter(f => f.size > 0), draft.id)
        imageUrls = uploadedImages.map(img => img.url)

        // Update draft with image URLs
        const { error: updateError } = await supabase
          .from('drafts')
          .update({ image_urls: imageUrls })
          .eq('id', draft.id)

        if (updateError) {
          console.error('Error updating draft with images:', updateError)
          // Don't fail the request, just log the error
        }
      } catch (uploadError) {
        console.error('Error uploading images:', uploadError)
        // Continue without images if upload fails
      }
    }

    // 3. Fetch selected personas
    const { data: personas, error: personasError } = await supabase
      .from('ai_personas')
      .select('*')
      .in('id', personaIds)
      .eq('active', true)

    if (personasError) {
      console.error('Error fetching personas:', personasError)
      return NextResponse.json(
        { error: `Failed to fetch personas: ${personasError.message}` },
        { status: 500 }
      )
    }

    if (!personas || personas.length === 0) {
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
