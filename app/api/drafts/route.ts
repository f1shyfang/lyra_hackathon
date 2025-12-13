import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: draft, error } = await supabase
      .from('drafts')
      .insert({
        content: content.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating draft:', error)
      return NextResponse.json(
        { error: `Failed to create draft: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, draft }, { status: 201 })
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

