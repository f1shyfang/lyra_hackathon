# Lyra - Quick Start Guide

## What Changed

The frontend has been refactored to align with the Lyra product vision:

### ✅ Completed
- **Types updated** (`types/analyze.ts`) to match FastAPI backend response
- **API proxy cleaned** (`app/api/analyze/route.ts`) - removed Supabase logging
- **Main page refactored** (`app/page.tsx`) - now shows Lyra hero + analyzer
- **New components created**:
  - `DraftAnalyzer.tsx` - main input/analysis flow
  - `RoleCompositionPanel.tsx` - displays role percentages
  - `RiskAssessmentPanel.tsx` - displays risk classification + probabilities
- **Metadata updated** - app now branded as "Lyra - Recruiting Signal Intelligence"

### 🎨 Design Preserved
- Dark glassmorphic UI maintained
- Purple/cyan gradient glows
- Clean, premium "signal dashboard" aesthetic

## Running the App

### Option 1: Run both frontend + backend together
```bash
npm run dev
```
This starts:
- Next.js frontend on `http://localhost:3000`
- FastAPI backend on `http://localhost:8000`

### Option 2: Run separately
```bash
# Terminal 1 - Frontend
npm run dev:web

# Terminal 2 - Backend (activate venv first)
.venv\Scripts\Activate.ps1
npm run dev:ml
```

## Environment Variables

Make sure `.env.local` has:
```
ML_API_URL=http://localhost:8000
```

## Testing the Flow

1. Open `http://localhost:3000`
2. Paste a LinkedIn draft in the textarea
3. Click "Analyze Your Draft"
4. See:
   - **Role Composition** (top 5 roles with percentages)
   - **Risk Assessment** (Helpful/Harmless/Harmful classification + probabilities)

## What's NOT Implemented (By Design)

- ❌ No auth / request access
- ❌ No A/B comparison UI (backend exists, frontend doesn't expose yet)
- ❌ No narrative internals exposed
- ❌ No Supabase logging

## Old Pages Still Present (Not Removed)

These routes still exist but are not linked from the main page:
- `/sentiment-analyzer`
- `/manufacturing`
- `/examples/*`

They can be removed if desired, but they don't interfere with the main Lyra flow.
