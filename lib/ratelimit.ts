/**
 * Inbound per-client rate limiting for public API routes.
 *
 * Keyed by client IP (derived from `x-forwarded-for`). Uses a fixed-window
 * counter that is configurable via env vars.
 *
 * IMPORTANT: the default backend is IN-MEMORY. It does NOT span serverless
 * instances or regions — each Lambda/Edge isolate keeps its own counters, so
 * effective limits multiply by the number of concurrent instances. This is
 * fine for local development and single-instance deploys. For production scale,
 * swap in a shared store such as Upstash (`@upstash/ratelimit` + Upstash Redis)
 * behind the same `checkRateLimit` interface — see the comment near
 * `RateLimitBackend` below for the drop-in point.
 */
import { NextRequest, NextResponse } from 'next/server'

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '30', 10)
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '60000',
  10
)

export interface RateLimitResult {
  ok: boolean
  /** Requests remaining in the current window. */
  remaining: number
  /** Milliseconds until the window resets (only meaningful when !ok). */
  retryAfterMs: number
}

/**
 * Minimal backend contract. The in-memory implementation lives below; an
 * Upstash-backed implementation could satisfy the same shape and be selected
 * here (e.g. when `UPSTASH_REDIS_REST_URL` is present) without touching callers.
 */
interface RateLimitBackend {
  hit(key: string, limit: number, windowMs: number): RateLimitResult
}

interface WindowState {
  count: number
  resetAt: number
}

class InMemoryBackend implements RateLimitBackend {
  private windows = new Map<string, WindowState>()

  constructor() {
    // Opportunistic cleanup of expired windows to bound memory growth.
    const timer = setInterval(() => {
      const now = Date.now()
      for (const [key, state] of this.windows) {
        if (state.resetAt <= now) this.windows.delete(key)
      }
    }, 60000)
    // Don't keep the process alive solely for cleanup.
    if (typeof timer === 'object' && 'unref' in timer) timer.unref()
  }

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    const state = this.windows.get(key)

    if (!state || state.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs })
      return { ok: true, remaining: limit - 1, retryAfterMs: 0 }
    }

    if (state.count < limit) {
      state.count += 1
      return { ok: true, remaining: limit - state.count, retryAfterMs: 0 }
    }

    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, state.resetAt - now) }
  }
}

// Single shared backend instance for this process.
const backend: RateLimitBackend = new InMemoryBackend()

/**
 * Derive a stable client key from the request. Prefers the first IP in
 * `x-forwarded-for`; falls back to `x-real-ip`, then a constant so the limiter
 * still applies (conservatively) when no IP header is present.
 */
export function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

/**
 * Check (and consume) one request slot for the given client key.
 */
export function checkRateLimit(
  key: string,
  options?: { max?: number; windowMs?: number }
): RateLimitResult {
  const max = options?.max ?? RATE_LIMIT_MAX
  const windowMs = options?.windowMs ?? RATE_LIMIT_WINDOW_MS
  return backend.hit(key, max, windowMs)
}

/**
 * Convenience wrapper for route handlers. Call at the top of a POST handler:
 *
 *   const limited = enforceRateLimit(request)
 *   if (limited) return limited
 *
 * Returns a 429 `NextResponse` (with `Retry-After`) when the limit is exceeded,
 * or `null` when the request is allowed.
 */
export function enforceRateLimit(
  request: NextRequest,
  options?: { max?: number; windowMs?: number }
): NextResponse | null {
  const key = getClientKey(request)
  const result = checkRateLimit(key, options)

  if (result.ok) return null

  const retryAfterSec = Math.ceil(result.retryAfterMs / 1000)
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(options?.max ?? RATE_LIMIT_MAX),
        'X-RateLimit-Remaining': '0',
      },
    }
  )
}
