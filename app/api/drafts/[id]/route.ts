import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const body = await request.json()

    const supabase = await createClient()

    // Only allow updating specific fields
    const allowedFields = ['content', 'status']
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
  } catch (error) {
    console.error('Error in PATCH /api/drafts/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

