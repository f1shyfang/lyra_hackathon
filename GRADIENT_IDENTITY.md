# Gradient-First Visual Identity - Complete

## The Locked Visual Identity

**Lyra is: Black → deep purple → subtle pink**

- Ambient, soft, cinematic
- Gradient-led, not flat-dark
- Feels alive, not terminal-like
- Linear × Vercel × Stripe Radar, but with emotion

## What Changed

Complete refactor from white-first to gradient-first atmospheric design with continuity across all pages.

### Global Background (Applied to All Pages)
- **Base**: Black (`bg-black`)
- **Gradient layer**: `from-black via-purple-950/40 to-black`
- **Ambient glows**: 
  - Purple glow: `bg-purple-600/20` (top-left)
  - Pink glow: `bg-pink-600/15` (bottom-right)
- **Fixed position**: Never resets, always present
- **Intensity shifts**: Brighter on homepage, dimmed on analysis pages

### Navigation - Floating, Not Fixed
- **Transparent**: No solid background
- **Blur**: `backdrop-blur-xl`
- **Border**: `border-white/5` (barely visible)
- **Text**: White with slate-400 inactive states
- **Etched into atmosphere**: Floats over gradient, not separate layer

### Homepage
- **Brighter center glow**: 600px purple + 400px pink overlays
- **White text**: Headlines in pure white
- **White buttons**: Primary CTA is white on black (inverted)
- **Ghost buttons**: Hover shows `bg-white/10`
- **No white background**: Gradient throughout

### Analyze Page
- **Same gradient base**: Atmospheric continuity
- **Refined language**:
  - "Analyze Draft" → "See who your words attract before you publish"
  - "Recruiting Risk Assessment" → "Recruiting Risk"
  - "Role Composition" → "Who This Attracts"
  - "Top roles this post will attract" → "Top roles drawn to this post"
- **Top 5 only**: Shows maxVisible={5} for roles
- **Card styling**: `bg-white/5` with `shadow-purple-500/10`
- **Input**: `bg-black/30` for textarea
- **White button**: Matches homepage CTA style

### Compare Page (formerly A/B Test)
- **Renamed**: "A/B Test" → "Compare Signals"
- **Signal framing**: 
  - "Draft A (Baseline)" → "Current Signal"
  - "Draft B (Variant)" → "Adjusted Signal"
- **Movement-based thinking**: Replaced delta math with directional insights
  - "Risk Probability Deltas (B - A)" → "Risk Movement"
  - "Role Composition Deltas (B - A)" → "Audience Shift"
  - "Narrative Probability Deltas (B - A)" → Removed (too many signals)
- **Arrow indicators**: ↑ (green) for increases, ↓ (red) for decreases
- **No "B - A" anywhere**: Completely removed mathematical framing
- **Top 5 only**: Limited to 5 most significant movements
- **Color shift**: Purple (Current) vs Pink (Adjusted)
- **Card styling**: Consistent `bg-white/5` glassmorphic cards

### New Component: SignalMovement
Replaces DiffTable with movement-based insights:
- Shows direction with arrows (↑/↓)
- Color-coded: emerald for up, rose for down
- Sorted by absolute magnitude
- Limited to top 5 movements
- No raw delta numbers unless expanded
- Direction speaks first, value is secondary

## Design Principles Applied

✅ **Atmospheric continuity** - Gradient never resets  
✅ **Floating header** - Transparent, etched into atmosphere  
✅ **Signal framing** - Current vs Adjusted, not A vs B  
✅ **Movement thinking** - Arrows and direction, not delta math  
✅ **Premium curation** - Top 5 signals only, implies depth  
✅ **Gradient-led** - Purple/pink identity throughout  
✅ **Emotional design** - Alive, cinematic, confident  

## Color Palette

### Background Gradients
- Black base: `#000000`
- Purple ambient: `purple-950/40`, `purple-600/20`, `purple-500/30`
- Pink ambient: `pink-600/15`, `pink-500/20`

### UI Elements
- Cards: `bg-white/5` to `bg-white/10` on hover
- Borders: `border-white/10`
- Shadows: `shadow-purple-500/10`
- Text: `text-white` (headlines), `text-slate-300` (body), `text-slate-400` (labels)

### Accent Colors
- Purple: Current signal, primary accent
- Pink: Adjusted signal, secondary accent
- Blue: Engineers metric
- Emerald: Positive movement
- Rose: Negative movement
- Amber: Risk signal

## Language Refinements

### Removed
- "Draft A / Draft B"
- "Baseline / Variant"
- "B - A" delta notation
- "Deltas"
- Technical explanations
- Feature lists

### Added
- "Current Signal / Adjusted Signal"
- "Risk Movement"
- "Audience Shift"
- "Who This Attracts"
- Directional arrows (↑/↓)
- Movement-based insights

## Files Changed

### Core Layout
- `app/layout.tsx` - Global gradient background, removed white
- `app/components/Navigation.tsx` - Transparent floating header

### Pages
- `app/page.tsx` - Gradient homepage with brighter glow
- `app/analyze/page.tsx` - Gradient background, refined language, top 5
- `app/ab-test/page.tsx` - Signal framing, movement thinking, top 5

### Components
- `app/components/premium/AnalysisPreview.tsx` - Gradient-friendly styling
- `app/components/SignalMovement.tsx` - New arrow-based movement component

## Build Status
✅ TypeScript: 0 errors  
✅ Production build: successful  
✅ All routes working  

## Result

The entire app now has:
- **Atmospheric continuity** - Same gradient canvas across all pages
- **Floating UI** - Header etched into atmosphere, not separate
- **Signal language** - Current/Adjusted, not A/B
- **Movement insights** - Arrows and direction, not delta math
- **Premium curation** - Top 5 signals, implies confidence
- **Emotional design** - Black → purple → pink gradient identity

The canvas stays. The lighting changes. The product feels alive.
