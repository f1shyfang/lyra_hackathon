import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadImages, deleteImages, extractPathFromUrl } from '@/lib/storage/image-upload'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Get draft with feedback
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', id)
      .single()

    if (draftError) {
      console.error('Error fetching draft:', draftError)
      return NextResponse.json(
        { error: `Draft not found: ${draftError.message}`, id },
        { status: 404 }
      )
    }

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found', id },
        { status: 404 }
      )
    }

    // Get feedback for this draft
    const { data: feedback, error: feedbackError } = await supabase
      .from('council_feedback')
      .select(`
        *,
        ai_personas (
          id,
          name,
          system_prompt
        )
      `)
      .eq('draft_id', id)
      .order('created_at', { ascending: false })

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError)
    }

    return NextResponse.json({
      success: true,
      draft,
      feedback: feedback || [],
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

    const supabase = await createClient()

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
      const { data: currentDraft } = await supabase
        .from('drafts')
        .select('image_urls')
        .eq('id', id)
        .single()

      let imageUrls: string[] = (currentDraft?.image_urls as string[] | null) || []

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

      updates.image_urls = imageUrls

      const { data: draft, error } = await supabase
        .from('drafts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating draft:', error)
        return NextResponse.json(
          { error: `Failed to update draft: ${error.message}` },
          { status: 500 }
        )
      }

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

      // Only allow updating specific fields
      const allowedFields = ['content', 'status', 'image_urls']
      const updates: Record<string, any> = {}

      for (const field of allowedFields) {
        if (field in body) {
          updates[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        )
      }

      const { data: draft, error } = await supabase
        .from('drafts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating draft:', error)
        return NextResponse.json(
          { error: `Failed to update draft: ${error.message}` },
          { status: 500 }
        )
      }

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

