import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'gemini-2.5-flash' } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // The client gets the API key from the environment variable `GEMINI_API_KEY`
    const ai = new GoogleGenAI({})

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    })

    return NextResponse.json({
      success: true,
      response: response.text,
      model: model,
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
    message: 'Gemini API endpoint',
    usage: 'POST with { "prompt": "your prompt", "model": "optional model name" }',
    availableModels: ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'],
  })
}

