/**
 * API Route: Analyze LinkedIn Draft with Images
 * 
 * POST /api/analyze-with-images
 * 
 * Accepts draft text and optional images, returns:
 * - Fused input text
 * - Image context objects
 * - Predictions (role, narrative, risk)
 * - Signal attribution (text vs image driven)
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeWithImages } from '@/lib/image-analysis'
import { AnalyzeWithImagesRequest } from '@/types/image-analysis'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    if (!body.draft_text || typeof body.draft_text !== 'string') {
      return NextResponse.json(
        { error: 'draft_text is required and must be a string' },
        { status: 400 }
      )
    }

    // Normalize images array
    const images = Array.isArray(body.images) ? body.images : []

    // Validate each image
    for (const img of images) {
      if (!img.id || typeof img.id !== 'string') {
        return NextResponse.json(
          { error: 'Each image must have an id' },
          { status: 400 }
        )
      }
      if (!img.mime || typeof img.mime !== 'string') {
        return NextResponse.json(
          { error: 'Each image must have a mime type' },
          { status: 400 }
        )
      }
      if (!img.data && !img.url) {
        return NextResponse.json(
          { error: 'Each image must have either data (base64) or url' },
          { status: 400 }
        )
      }
    }

    const analysisRequest: AnalyzeWithImagesRequest = {
      draft_text: body.draft_text,
      images: images.map((img: any) => ({
        id: img.id,
        mime: img.mime,
        data: img.data,
        url: img.url,
      })),
    }

    // Perform analysis
    const result = await analyzeWithImages(analysisRequest)

    // Do NOT log raw image data
    console.log(`[analyze-with-images] Analyzed draft with ${images.length} images`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[analyze-with-images] Error:', error.message)
    
    return NextResponse.json(
      { error: 'Analysis failed', details: error.message },
      { status: 500 }
    )
  }
}

// Next.js App Router segment config
export const maxDuration = 60 // seconds
export const dynamic = 'force-dynamic'
