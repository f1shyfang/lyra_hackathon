/**
 * Provider-swappable model resolver for the Vercel AI SDK.
 *
 * The whole point of this module: switching providers/models is a ONE env var
 * change (`AI_MODEL`) — no code edits required.
 *
 * How model resolution works (per Vercel guidance, AI Gateway first):
 *
 * 1. By DEFAULT we pass the `AI_MODEL` string (e.g. "openai/gpt-4o-mini")
 *    straight to the AI SDK. When an AI Gateway credential is present
 *    (`AI_GATEWAY_API_KEY`, or Vercel OIDC token in production) the SDK routes
 *    "provider/model" strings through the Gateway automatically. This gives you
 *    provider failover, cost tracking, and unified billing for free.
 *
 * 2. As a concrete DIRECT-KEY fallback (so this works locally with no Gateway),
 *    if a provider key is set and NO Gateway key is present, we resolve the
 *    model through that provider's `@ai-sdk/*` package directly. The leading
 *    "<provider>/" prefix is stripped before handing the bare model id over.
 *    Currently OpenAI (`OPENAI_API_KEY`) and Google (`GOOGLE_GENERATIVE_AI_API_KEY`
 *    / `GEMINI_API_KEY`) are wired; add another by installing its `@ai-sdk/*`
 *    package and extending the fallback branch below.
 *
 * To swap providers via the Gateway: set `AI_MODEL` (e.g. "anthropic/claude-..")
 * and provide `AI_GATEWAY_API_KEY`. To swap the direct provider, set `AI_MODEL`
 * and the matching provider key (e.g. `OPENAI_API_KEY`).
 */
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

/** Default model string. Gateway-style "provider/model" form. */
export const DEFAULT_AI_MODEL = 'openai/gpt-4o-mini'

/**
 * Resolve the configured model for use with the AI SDK
 * (`generateText` / `generateObject`).
 *
 * @param override - optional model id/string to use instead of `AI_MODEL`.
 * @returns either a Gateway provider string or a concrete `LanguageModel`.
 */
export function getModel(override?: string): LanguageModel {
  const modelId = override || process.env.AI_MODEL || DEFAULT_AI_MODEL

  const hasGatewayKey = Boolean(process.env.AI_GATEWAY_API_KEY)

  // Prefer the AI Gateway: pass the "provider/model" string through unchanged.
  // (On Vercel, OIDC also enables the Gateway even without AI_GATEWAY_API_KEY.)
  if (hasGatewayKey) {
    return modelId
  }

  // Direct-key fallbacks so the app works with just a provider key and no Gateway.
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (modelId.startsWith('openai/') && openaiApiKey) {
    const openai = createOpenAI({ apiKey: openaiApiKey })
    return openai(modelId.slice('openai/'.length))
  }

  const googleApiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (modelId.startsWith('google/') && googleApiKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleApiKey })
    return google(modelId.slice('google/'.length))
  }

  // No matching direct key: fall back to the string form and let the
  // SDK/Gateway resolve it (errors clearly if no credential matches — the
  // correct, non-silent behavior).
  return modelId
}
