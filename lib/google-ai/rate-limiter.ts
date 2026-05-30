/**
 * Rate limiter for Gemini API calls
 * Uses a token bucket algorithm to limit requests per time window
 */

interface RateLimitConfig {
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
}
//simple record of the timestamp of the request
interface RequestRecord {
  timestamp: number
}

class RateLimiter {
  private requests: RequestRecord[] = []
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    // Clean up old requests periodically
    this.startCleanup()
  }

  /**
   * Check if a request can be made, and record it if allowed
   * @returns true if request is allowed, false if rate limit exceeded
   */
  canMakeRequest(): boolean {
    const now = Date.now()
    
    // Remove requests outside the time window
    this.requests = this.requests.filter(
      req => now - req.timestamp < this.config.windowMs
    )

    // Check if we're under the limit
    if (this.requests.length < this.config.maxRequests) {
      this.requests.push({ timestamp: now })
      return true
    }

    return false
  }

  /**
   * Wait until a request can be made, then record it
   * @returns Promise that resolves when request can be made
   */
  async waitForAvailability(): Promise<void> {
    const maxWaitTime = this.config.windowMs
    const checkInterval = 100 // Check every 100ms
    const startTime = Date.now()

    while (!this.canMakeRequest()) {
      // Check if we've exceeded max wait time (shouldn't happen, but safety check)
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Rate limit: Maximum wait time exceeded')
      }

      // Calculate how long to wait
      const oldestRequest = this.requests[0]
      if (oldestRequest) {
        const waitTime = Math.min(
          this.config.windowMs - (Date.now() - oldestRequest.timestamp) + 10,
          checkInterval
        )
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      }
    }
  }

  /**
   * Get the number of requests remaining in the current window
   */
  getRemainingRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter(
      req => now - req.timestamp < this.config.windowMs
    )
    return Math.max(0, this.config.maxRequests - this.requests.length)
  }

  /**
   * Get the time until the next request slot is available (in ms)
   */
  getTimeUntilNextSlot(): number {
    if (this.requests.length < this.config.maxRequests) {
      return 0
    }

    const oldestRequest = this.requests[0]
    if (!oldestRequest) {
      return 0
    }

    const elapsed = Date.now() - oldestRequest.timestamp
    return Math.max(0, this.config.windowMs - elapsed)
  }

  /**
   * Start periodic cleanup of old requests
   */
  private startCleanup(): void {
    // Clean up every minute
    setInterval(() => {
      const now = Date.now()
      this.requests = this.requests.filter(
        req => now - req.timestamp < this.config.windowMs
      )
    }, 60000)
  }
}

// Default rate limit configuration
// Gemini API free tier: 15 requests per minute (RPM)
// Paid tier: 360 requests per minute
// Using conservative defaults that work for free tier
const DEFAULT_MAX_REQUESTS = parseInt(
  process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || '15',
  10
)
const DEFAULT_WINDOW_MS = parseInt(
  process.env.GEMINI_RATE_LIMIT_WINDOW_MS || '60000', // 1 minute
  10
)

// Create a singleton rate limiter instance
const rateLimiter = new RateLimiter({
  maxRequests: DEFAULT_MAX_REQUESTS,
  windowMs: DEFAULT_WINDOW_MS,
})

/**
 * Rate limit wrapper for async functions
 * Automatically waits if rate limit is exceeded
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  operationName: string = 'API call'
): Promise<T> {
  // Wait for availability
  await rateLimiter.waitForAvailability()

  try {
    return await fn()
  } catch (error) {
    // If it's a rate limit error from the API, log it
    if (error instanceof Error && error.message.includes('429')) {
      console.error(`Rate limit exceeded for ${operationName}`)
      // Wait a bit longer before retrying
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    throw error
  }
}

/**
 * Check if a request can be made without waiting
 * @returns true if request can be made immediately
 */
export function canMakeRequest(): boolean {
  return rateLimiter.canMakeRequest()
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus() {
  return {
    remaining: rateLimiter.getRemainingRequests(),
    timeUntilNextSlot: rateLimiter.getTimeUntilNextSlot(),
    maxRequests: DEFAULT_MAX_REQUESTS,
    windowMs: DEFAULT_WINDOW_MS,
  }
}

export default rateLimiter
