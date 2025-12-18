/**
 * Post-processing transformations for ML model outputs.
 * 
 * These are deterministic transformations applied AFTER model inference
 * to correct for known biases in the ridge regression outputs.
 * 
 * Key issues addressed:
 * 1. Role probabilities are compressed toward the mean (low variance)
 * 2. Risk classification over-detects "harmful" for neutral LinkedIn content
 */

// ============================================================================
// CONFIGURATION - Tunable parameters with sensible defaults
// ============================================================================

export const POST_PROCESSING_CONFIG = {
  // PART A: Role Composition
  role: {
    // Variance amplification factor. 
    // α > 1 expands differences from mean.
    // Higher = more separation between top and bottom roles.
    alpha: 2.5,
    
    // Minimum probability floor (prevents zeros/negatives after amplification)
    epsilon: 0.01,
    
    // Maximum roles to return (NEVER show more)
    maxRoles: 5,
  },

  // PART B: Risk Classification
  risk: {
    // How much to boost harmless when distribution is flat
    // Higher = stronger bias toward harmless for neutral content
    harmlessBoost: 1.5,
    
    // How much to dampen harmful when it doesn't clearly dominate
    // Higher = more aggressive harmful reduction
    harmfulDampening: 0.6,
    
    // Minimum margin harmful must exceed other categories by to be considered "dominant"
    // Higher = harder for harmful to spike
    dominanceMargin: 0.15,
  },
}

// ============================================================================
// PART A: Role Composition - Variance Amplification
// ============================================================================

export type RoleDistribution = { role: string; pct: number }[]

/**
 * Transforms compressed ridge regression role probabilities to restore
 * meaningful separation between top and bottom roles.
 * 
 * Mathematical approach: Variance Amplification
 * 
 * 1. Sort roles descending by probability
 * 2. Take only top 5 (premium curation, no expansion ever)
 * 3. Compute mean (μ) and apply variance amplification:
 *    p'ᵢ = μ + α(pᵢ - μ)
 * 4. Clip to ensure positivity
 * 5. Renormalize to sum to 100%
 * 
 * This preserves ordering, amplifies extremes, and uses a single parameter.
 * 
 * @param roles - Raw role probabilities from ridge regression
 * @param config - Optional override for default parameters
 * @returns Top 5 roles with amplified separation
 */
export function transformRoleComposition(
  roles: RoleDistribution,
  config = POST_PROCESSING_CONFIG.role
): RoleDistribution {
  if (!roles || roles.length === 0) return []

  // Sort descending and take only top 5
  const sorted = [...roles]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, config.maxRoles)

  // Extract probabilities
  const probs = sorted.map(r => r.pct)
  
  // Compute mean
  const mean = probs.reduce((a, b) => a + b, 0) / probs.length

  // Apply variance amplification: p' = μ + α(p - μ)
  const amplified = probs.map(p => {
    const deviation = p - mean
    const amplifiedValue = mean + config.alpha * deviation
    // Clip to ensure positivity
    return Math.max(config.epsilon, amplifiedValue)
  })

  // Renormalize to sum to 100
  const sum = amplified.reduce((a, b) => a + b, 0)
  const normalized = amplified.map(p => (p / sum) * 100)

  // Reconstruct with transformed probabilities
  return sorted.map((r, i) => ({
    role: r.role,
    pct: normalized[i],
  }))
}

// ============================================================================
// PART B: Risk Classification - Harmless Prior with Conditional Dampening
// ============================================================================

export type RiskProbs = {
  Helpful: number
  Harmless: number
  Harmful: number
}

/**
 * Transforms risk probabilities to correct for over-detection of "harmful"
 * in neutral LinkedIn discourse.
 * 
 * Mathematical approach: Flatness-Aware Prior Injection
 * 
 * 1. Compute spread = max - min (how peaked the distribution is)
 * 2. Compute flatness = (1 - spread)² (0 when peaked, 1 when flat)
 * 3. Apply transformations:
 *    - Boost harmless proportional to flatness (neutral content → harmless)
 *    - Dampen harmful proportional to flatness UNLESS it clearly dominates
 *    - Keep helpful stable
 * 4. Renormalize to sum to 1
 * 
 * Intuition:
 * - When all three are close (~0.33 each), flatness ≈ 1, strongly bias to harmless
 * - When harmful clearly dominates (e.g., 0.7), let it through
 * - When distribution is peaked toward helpful/harmless, minimal adjustment
 * 
 * @param probs - Raw risk probabilities {Harmful, Helpful, Harmless}
 * @param config - Optional override for default parameters
 * @returns Transformed probabilities with harmless bias for flat distributions
 */
export function transformRiskProbs(
  probs: RiskProbs,
  config = POST_PROCESSING_CONFIG.risk
): RiskProbs {
  const { Harmful: H, Helpful: P, Harmless: N } = probs

  // Compute spread (0 to 1, higher = more peaked distribution)
  const values = [H, P, N]
  const maxVal = Math.max(...values)
  const minVal = Math.min(...values)
  const spread = maxVal - minVal

  // Flatness: 0 when peaked, approaches 1 when flat
  // Using (1 - spread)² for smooth, strong effect when flat
  const flatness = Math.pow(1 - spread, 2)

  // Determine if harmful clearly dominates
  const harmfulDominates = H > P && H > N && (H - Math.max(P, N)) > config.dominanceMargin

  // Apply transformations
  let H_prime = H
  let P_prime = P
  let N_prime = N

  // Boost harmless proportional to flatness
  // When flat, this significantly increases harmless probability
  N_prime = N * (1 + config.harmlessBoost * flatness)

  // Dampen harmful unless it clearly dominates
  if (!harmfulDominates) {
    // Reduce harmful proportional to flatness
    // When flat, this significantly decreases harmful probability
    H_prime = H * (1 - config.harmfulDampening * flatness)
    // Ensure harmful doesn't go negative
    H_prime = Math.max(0.01, H_prime)
  }

  // Renormalize to sum to 1
  const total = H_prime + P_prime + N_prime
  
  return {
    Harmful: H_prime / total,
    Helpful: P_prime / total,
    Harmless: N_prime / total,
  }
}

// ============================================================================
// CONVENIENCE FUNCTION - Apply all transformations
// ============================================================================

export type AnalysisResult = {
  role_distribution_all: RoleDistribution
  risk: {
    risk_probs: RiskProbs
    risk_class: 'Harmful' | 'Helpful' | 'Harmless'
    risk_level: string
    primary_risk_reason: string
  }
}

/**
 * Apply all post-processing transformations to an analysis result.
 * 
 * @param result - Raw analysis result from ML model
 * @returns Transformed result with corrected probabilities
 */
export function applyPostProcessing<T extends AnalysisResult>(result: T): T {
  // Transform role composition
  const transformedRoles = transformRoleComposition(result.role_distribution_all)

  // Transform risk probabilities
  const transformedRiskProbs = transformRiskProbs(result.risk.risk_probs)

  // Determine new risk class based on transformed probabilities
  const { Harmful, Helpful, Harmless } = transformedRiskProbs
  let newRiskClass: 'Harmful' | 'Helpful' | 'Harmless' = 'Harmless'
  if (Harmful > Helpful && Harmful > Harmless) {
    newRiskClass = 'Harmful'
  } else if (Helpful > Harmful && Helpful > Harmless) {
    newRiskClass = 'Helpful'
  }

  return {
    ...result,
    role_distribution_all: transformedRoles,
    role_distribution_top5: transformedRoles, // Both are now top 5 only
    risk: {
      ...result.risk,
      risk_probs: transformedRiskProbs,
      risk_class: newRiskClass,
    },
  }
}
