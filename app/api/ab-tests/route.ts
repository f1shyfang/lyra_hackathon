import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createClient()

    let query = supabase
      .from('ab_tests')
      .select(`
        *,
        drafts (
          id,
          content,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: abTests, error } = await query

    if (error) {
      console.error('Error fetching A/B tests:', error)
      return NextResponse.json(
        { error: `Failed to fetch A/B tests: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, abTests: abTests || [] })
  } catch (error) {
    console.error('Error in GET /api/ab-tests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { draft_id, name, algorithm = 'epsilon_greedy', epsilon = 0.1 } = await request.json()

    if (!draft_id || !name) {
      return NextResponse.json(
        { error: 'draft_id and name are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: abTest, error } = await supabase
      .from('ab_tests')
      .insert({
        draft_id,
        name,
        status: 'draft',
        algorithm,
        epsilon: algorithm === 'epsilon_greedy' ? epsilon : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating A/B test:', error)
      return NextResponse.json(
        { error: `Failed to create A/B test: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, abTest }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ab-tests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}





