# Post-Processing Mathematical Model

## Overview

This document describes the post-processing transformations applied to ML model outputs to correct for known biases in ridge regression predictions.

## Problems Addressed

### 1. Role Composition: Variance Compression
**Issue**: Ridge regression compresses predictions toward the mean (~0.065-0.08 for all roles), while true distribution shows meaningful variance (0.01 to 0.23).

**Solution**: Variance Amplification

### 2. Risk Classification: Over-Detection of Harmful
**Issue**: LinkedIn content is mostly neutral/harmless, but model over-detects "harmful". When all three probabilities are close, should strongly bias toward harmless.

**Solution**: Flatness-Aware Harmless Prior with Conditional Dampening

---

## Part A: Role Composition - Variance Amplification

### Why This Is Better Than Gap-Based Approach

The proposed gap-based method had 8+ tunable parameters (α1, α2, α3, α4, β1, β2). My approach uses **1 parameter** and is mathematically cleaner.

### Mathematical Model

Given sorted probabilities p₁ ≥ p₂ ≥ p₃ ≥ p₄ ≥ p₅:

```
1. Compute statistics:
   μ = mean(p₁...p₅)
   
2. Amplify variance:
   p'ᵢ = μ + α(pᵢ - μ)
   
   where α > 1 amplifies separation (default: 2.5)
   
3. Clip and normalize:
   p'ᵢ = max(ε, p'ᵢ)    # ensure positivity (ε = 0.01)
   p'ᵢ = p'ᵢ / Σp'ᵢ     # normalize to sum to 100%
```

### Properties
- **One parameter** (α) controls everything
- **Preserves ordering** - if p₁ > p₂ before, then p'₁ > p'₂ after
- **Amplifies extremes** - top roles get boosted, bottom get penalized
- **Works for any N** - not hardcoded to 5 roles

### Configuration
```typescript
role: {
  alpha: 2.5,      // Amplification factor
  epsilon: 0.01,   // Minimum probability floor
  maxRoles: 5,     // Hard cap on visible roles
}
```

---

## Part B: Risk Classification - Harmless Prior

### Why This Is Better Than Exponential Approach

The proposed method had 6+ parameters (ε, τ, k1, k2, k3, k4) and exponentials can cause numerical instability. My approach uses **3 intuitive parameters**.

### Mathematical Model

Given probabilities H (Harmful), P (Helpful), N (Harmless):

```
1. Compute spread (0 to 1, higher = more peaked):
   spread = max(H, P, N) - min(H, P, N)

2. Compute flatness (0 when peaked, 1 when flat):
   flatness = (1 - spread)²

3. Check harmful dominance:
   harmfulDominates = H > P AND H > N AND (H - max(P, N)) > margin

4. Apply transformations:
   N' = N × (1 + boost × flatness)
   
   if harmfulDominates:
       H' = H  # allow through
   else:
       H' = H × (1 - dampening × flatness)
       H' = max(0.01, H')  # floor
   
   P' = P  # helpful stays stable

5. Normalize:
   total = H' + P' + N'
   return [H'/total, P'/total, N'/total]
```

### Intuition
- **Flat distribution** (all ~0.33): flatness ≈ 1, strongly boost harmless, dampen harmful
- **Peaked toward harmful** (0.7, 0.15, 0.15): harmful dominates, let it through
- **Peaked toward helpful/harmless**: minimal adjustment needed

### Configuration
```typescript
risk: {
  harmlessBoost: 1.5,      // How much to boost harmless when flat
  harmfulDampening: 0.6,   // How much to dampen harmful when not dominant
  dominanceMargin: 0.15,   // Minimum margin for harmful to dominate
}
```

---

## Implementation

### Files
- `lib/postprocessing.ts` - Core transformation functions
- `lib/api/ml.ts` - Applies transformations to API results

### Usage
```typescript
import { applyPostProcessing } from '@/lib/postprocessing'

const rawResult = await fetchFromML()
const transformedResult = applyPostProcessing(rawResult)
```

### Tuning Parameters

All parameters are in `POST_PROCESSING_CONFIG`:

```typescript
export const POST_PROCESSING_CONFIG = {
  role: {
    alpha: 2.5,      // Higher = more separation
    epsilon: 0.01,   // Minimum probability
    maxRoles: 5,     // Hard cap
  },
  risk: {
    harmlessBoost: 1.5,      // Higher = stronger harmless bias
    harmfulDampening: 0.6,   // Higher = more harmful reduction
    dominanceMargin: 0.15,   // Higher = harder for harmful to spike
  },
}
```

---

## UI Changes

### RoleBars Component
- **Top 5 only** - hard cap, no expansion ever
- Removed "+N more" button
- Purple-to-pink gradient bars

### NarrativeList Component
- **Top 5 only** - hard cap, no expansion ever
- Removed "Show all" button
- Purple accent colors

### ProbabilityBars Component
- Ordered: Helpful → Harmless → Harmful (positive to negative)
- Updated colors to match gradient identity
- Softer gradients

---

## Build Status
✅ TypeScript: 0 errors
✅ Production build: successful
✅ All routes working

## Result

The post-processing:
1. **Amplifies role separation** - Top roles stand out, bottom roles are properly de-emphasized
2. **Biases toward harmless** - Neutral LinkedIn content no longer triggers false "harmful" signals
3. **Curates to top 5** - Premium product feel, implies depth without data dump
4. **Preserves ordering** - Ridge regression signal is enhanced, not destroyed
