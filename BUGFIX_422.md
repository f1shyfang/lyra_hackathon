# 422 Error Fix - Summary

## Problem
Frontend was sending incorrect request body format and expecting wrong response structure from FastAPI backend, causing 422 Unprocessable Entity errors.

## Root Causes

### 1. Request Body Mismatch
- **Frontend sent:** `{ text: "..." }`
- **Backend expected:** `{ post_text: "..." }`

### 2. Response Structure Mismatch
Frontend types didn't match actual backend response:

| Frontend Expected | Backend Actually Returns |
|-------------------|-------------------------|
| `risk.classification` | `risk.risk_class` |
| `risk.probs` | `risk.risk_probs` |
| `risk.confidence_label` | `risk.risk_level` |
| `role_composition` | `role_distribution_all` |
| `narratives: Narrative[]` | `narratives: { narrative_probs: {}, narrative_flags: {} }` |

## Fixes Applied

### 1. API Client (`lib/api/ml.ts`)
```typescript
// Changed from:
body: JSON.stringify({ text })

// To:
body: JSON.stringify({ post_text: text })
```

### 2. Type Definitions (`types/ml.ts`)
Updated `AnalyzeResponse` and `RiskResult` to match actual backend response structure:
- `risk_class` instead of `classification`
- `risk_probs` instead of `probs`
- `risk_level` instead of `confidence_label`
- `role_distribution_all` instead of `role_composition`
- `narratives` as object with `narrative_probs` and `narrative_flags`

### 3. UI Components
Updated all pages to use correct field names:
- `/analyze` page - fixed risk display and role/narrative rendering
- `/ab-test` page - fixed comparison displays
- Converted `narratives` object to array format for `NarrativeList` component

### 4. Client-Side Compare Logic
Updated `compareTexts()` to work with actual response structure when computing deltas client-side.

## Verification
✅ Build successful (0 TypeScript errors)
✅ All routes generated correctly
✅ Request body now matches backend schema
✅ Response parsing now matches backend output

## Test It
```bash
npm run dev
```

Then navigate to `/analyze` and paste a draft - it should now work without 422 errors.
