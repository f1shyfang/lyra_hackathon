import { NextRequest, NextResponse } from 'next/server'

import { AnalyzeRequest, AnalyzeResponse } from '@/types/analyze'
import { enforceRateLimit } from '@/lib/ratelimit'

// The ML API runs on Render's free tier, which sleeps after ~15 min idle and
// takes ~30–50s to cold-start. Allow enough headroom so the first request after
// idle succeeds (slowly) instead of 502-ing. Override via ML_API_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS = Number(process.env.ML_API_TIMEOUT_MS) || 60000
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req)
  if (limited) return limited

  let body: AnalyzeRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.post_text || !body.post_text.trim()) {
    return NextResponse.json({ error: 'post_text is required' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${ML_API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: 'Upstream ML API error', detail: text || response.statusText },
        { status: 502 }
      )
    }

    const data = (await response.json()) as AnalyzeResponse
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
