/**
 * Provider-swappable model resolver for the Vercel AI SDK.
 *
 * The whole point of this module: switching providers/models is a ONE env var
 * change (`AI_MODEL`) — no code edits required.
 *
 * How model resolution works (per Vercel guidance, AI Gateway first):
 *
 * 1. By DEFAULT we pass the `AI_MODEL` string (e.g. "google/gemini-2.0-flash")
 *    straight to the AI SDK. When an AI Gateway credential is present
 *    (`AI_GATEWAY_API_KEY`, or Vercel OIDC token in production) the SDK routes
 *    "provider/model" strings through the Gateway automatically. This gives you
 *    provider failover, cost tracking, and unified billing for free.
 *
 * 2. As a concrete DIRECT-KEY fallback (so this works locally with no Gateway),
 *    if a Google key is set (`GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`)
 *    and NO Gateway key is present, we resolve the model through the
 *    `@ai-sdk/google` provider directly. The leading "google/" prefix is
 *    stripped before handing the bare model id to the provider.
 *
 * To swap to, say, OpenAI via the Gateway: set `AI_MODEL="openai/gpt-4o-mini"`
 * and provide `AI_GATEWAY_API_KEY`. To swap the direct provider you'd add the
 * matching `@ai-sdk/<provider>` package and extend the fallback branch below.
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

/** Default model string. Gateway-style "provider/model" form. */
export const DEFAULT_AI_MODEL = 'google/gemini-2.0-flash'

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
  const googleApiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY

  // Prefer the AI Gateway: pass the "provider/model" string through unchanged.
  // (On Vercel, OIDC also enables the Gateway even without AI_GATEWAY_API_KEY,
  //  in which case the string form below still routes correctly.)
  if (hasGatewayKey || !googleApiKey) {
    return modelId
  }

  // Direct-key fallback: route Google models through @ai-sdk/google so the app
  // works with only a Gemini key and no Gateway configured.
  if (modelId.startsWith('google/')) {
    const google = createGoogleGenerativeAI({ apiKey: googleApiKey })
    return google(modelId.slice('google/'.length))
  }

  // Non-Google model requested but only a Google key is available: fall back to
  // the string form and let the SDK/Gateway figure it out (will error clearly
  // if no credential matches, which is the correct, non-silent behavior).
  return modelId
}
