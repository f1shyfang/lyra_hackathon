# A/B Test Feature - Implementation Summary

## ✅ What Was Built

### 1. **API Client Layer** (`lib/api/ml.ts`)
- `analyzeText(text)` - calls `/analyze` endpoint
- `compareTexts(textA, textB)` - tries `/compare` endpoint, falls back to client-side diff if not available
- Handles backend unavailability gracefully

### 2. **Type Definitions** (`types/ml.ts`)
- `AnalyzeResponse` - role composition, risk, narratives
- `CompareResponse` - baseline, variant, deltas
- Clean type safety across all components

### 3. **Reusable UI Components** (`app/components/`)
- **`LoadingSkeleton`** - animated loading state
- **`ProbabilityBars`** - risk probability visualization with contrast mode
- **`RoleBars`** - role composition bars with expand/collapse
- **`NarrativeList`** - narrative probabilities with show all/top toggle
- **`DiffTable`** - delta comparison table with color coding

### 4. **Navigation** (`app/components/Navigation.tsx`)
- Global nav bar with: Home, Analyze, A/B Test, About
- Active state highlighting
- Integrated into root layout

### 5. **New Pages**

#### `/analyze` - Enhanced Single Draft Analysis
- Large textarea for draft input
- "Analyze Draft" button
- **Contrast Mode toggle** (visual scaling for emphasis)
- Results show:
  - Risk classification badge + confidence label
  - Probability bars (Helpful/Harmless/Harmful)
  - Top 10 roles (expandable to all)
  - All narratives (collapsible to top 5)

#### `/ab-test` - Side-by-Side Comparison
- Two textareas (Draft A vs Draft B)
- "Compare Drafts" button
- **Contrast Mode toggle**
- Results show:
  - Risk comparison (both classifications + probability bars)
  - Risk delta table (Δ probabilities)
  - Role composition comparison (both distributions)
  - Role delta table (Δ percentages)
  - Narrative comparison (both lists)
  - Narrative delta table (Δ probabilities)

#### `/about` - Product Information
- What is Lyra
- How it works (3 models explained)
- Features overview
- Technical stack
- Use cases

### 6. **Contrast Mode Feature**
- UI-only toggle (no backend changes)
- Uses `Math.sqrt(prob)` scaling for bar lengths
- Labels always show exact percentages
- Caption: "Bar length uses contrast scaling; labels are exact."
- Helps emphasize small differences visually

## 🎨 Design Consistency
- Dark glassmorphic aesthetic preserved
- Purple/cyan gradient glows
- Consistent card styling
- Mobile responsive (stacks on small screens)

## 🔧 Error Handling
- Empty input validation
- Backend timeout handling
- Clear error messages
- Loading states for all async operations

## 📦 Backend Contract Assumptions

The frontend expects these response shapes:

### `/analyze` Response
```json
{
  "role_composition": [
    { "role": "Software Engineer", "pct": 12.3 }
  ],
  "risk": {
    "classification": "Helpful",
    "confidence_label": "High confidence",
    "probs": {
      "Helpful": 0.7,
      "Harmless": 0.2,
      "Harmful": 0.1
    }
  },
  "narratives": [
    { "name": "toxic_culture", "prob": 0.42 }
  ]
}
```

### `/compare` Response (optional)
If backend doesn't have `/compare`, frontend computes deltas client-side.

## 🚀 Running the App

```bash
# Start both frontend + backend
npm run dev

# Or separately
npm run dev:web    # Next.js on :3000
npm run dev:ml     # FastAPI on :8000
```

## ✅ QA Checklist

- [x] Works with `NEXT_PUBLIC_ML_API_URL` or defaults to `http://localhost:8000`
- [x] Handles empty input gracefully
- [x] Shows clear errors if backend is down
- [x] Mobile responsive (columns stack on small screens)
- [x] No backend code changes
- [x] TypeScript compiles with 0 errors
- [x] Production build successful

## 📝 Notes

- Old pages (`/sentiment-analyzer`, `/manufacturing`, `/examples/*`) still exist but are not linked from nav
- Contrast mode is purely visual - actual percentages are always accurate
- Client-side compare fallback ensures A/B test works even without backend `/compare` endpoint
- All components use the same dark glassmorphic design language
