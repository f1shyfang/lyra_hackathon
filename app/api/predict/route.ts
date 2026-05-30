import { NextRequest, NextResponse } from 'next/server'

// Server-side proxy to the PR-sentiment FastAPI service (api.py /predict).
// Keeps the backend URL server-side (no CORS dependency from the browser) and
// lets us swap localhost for the deployed Render URL via one env var.
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000'

// The embedding step calls the Gemini API, so allow generous headroom.
const DEFAULT_TIMEOUT_MS = 30000

export async function POST(req: NextRequest) {
  let body: { text?: string } & Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.text || !String(body.text).trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Upstream ML API error',
          detail: data?.detail ?? response.statusText,
        },
        { status: response.status === 422 ? 422 : 502 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    clearTimeout(timeout)
    const isAbort = error?.name === 'AbortError'
    return NextResponse.json(
      { error: isAbort ? 'ML API timeout' : 'Failed to call ML API', detail: String(error) },
      { status: 502 }
    )
  }
}
