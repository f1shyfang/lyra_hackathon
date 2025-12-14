import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // Create draft first to get the ID
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

    // Upload images if provided
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

    // Fetch updated draft
    const { data: updatedDraft, error: fetchError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draft.id)
      .single()

    if (fetchError) {
      console.error('Error fetching updated draft:', fetchError)
    }

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

    const supabase = await createClient()

    let query = supabase
      .from('drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: drafts, error } = await query

    if (error) {
      console.error('Error fetching drafts:', error)
      return NextResponse.json(
        { error: `Failed to fetch drafts: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, drafts: drafts || [] })
  } catch (error) {
    console.error('Error in GET /api/drafts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

