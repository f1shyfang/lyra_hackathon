import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { getModel, DEFAULT_AI_MODEL } from '@/lib/ai/provider'
import { withRateLimit } from '@/lib/google-ai/rate-limiter'
import { enforceRateLimit } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  // Inbound per-client rate limiting.
  const limited = enforceRateLimit(request)
  if (limited) return limited

  try {
    const { prompt, model } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Model resolved via getModel() — provider/model is swappable via AI_MODEL.
    // An explicit `model` in the request body still overrides for one-off calls.
    const { text } = await withRateLimit(
      () =>
        generateText({
          model: getModel(model),
          prompt,
        }),
      'gemini-route'
    )

    return NextResponse.json({
      success: true,
      response: text,
      model: model || process.env.AI_MODEL || DEFAULT_AI_MODEL,
    })
  } catch (error: any) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate response',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI text generation endpoint (Vercel AI SDK)',
    usage: 'POST with { "prompt": "your prompt", "model": "optional provider/model string" }',
    defaultModel: process.env.AI_MODEL || DEFAULT_AI_MODEL,
  })
}
