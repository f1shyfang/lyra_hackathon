# Image-Aware LinkedIn Draft Analysis

## Overview

This module enables Lyra to analyze LinkedIn drafts that include images. It extracts structured context from images, fuses it with draft text, and attributes prediction signals to their source.

**This is NOT a captioning feature.** It is a **signal extraction + fusion** feature for recruiting intelligence.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Draft Text    │────▶│  buildFused      │────▶│  ML Prediction  │
└─────────────────┘     │  InputText()     │     │  (existing)     │
                        └──────────────────┘     └─────────────────┘
┌─────────────────┐            │                         │
│   Images[]      │────▶┌──────▼──────────┐              │
└─────────────────┘     │ extractImage    │              │
                        │ Context()       │              │
                        │ (Gemini Vision) │              │
                        └─────────────────┘              │
                                                         ▼
                                               ┌─────────────────┐
                                               │ attributeSignals│
                                               │ ()              │
                                               └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Final Response  │
                                               │ with Attribution│
                                               └─────────────────┘
```

---

## API Endpoint

### POST `/api/analyze-with-images`

**Request:**
```json
{
  "draft_text": "Excited to share our new feature...",
  "images": [
    {
      "id": "img1",
      "mime": "image/png",
      "data": "<base64-encoded-image>"
    },
    {
      "id": "img2", 
      "mime": "image/jpeg",
      "url": "https://example.com/image.jpg"
    }
  ]
}
```

**Response:**
```json
{
  "fused_input_text": "[DRAFT TEXT]\nExcited to share...\n\n[IMAGE CONTEXT]\n- Image img1: Screenshot of product dashboard showing metrics...",
  "image_context_objects": [
    {
      "image_id": "img1",
      "high_level_type": "product_ui",
      "primary_subjects": ["dashboard", "metrics"],
      "setting": ["office", "technology"],
      "brand_markers": ["company logo"],
      "visual_tone": "professional",
      "engineering_signals": {
        "contains_code": false,
        "contains_architecture_diagram": false,
        "contains_metrics_or_dashboards": true,
        "contains_dev_tools": false,
        "contains_open_source_markers": false
      },
      "recruiting_signals": {
        "contains_hiring_language": false,
        "contains_role_titles": [],
        "contains_compensation_or_benefits": false,
        "contains_company_values": [],
        "contains_event_or_booth": false
      },
      "risk_signals": {
        "contains_political_content": false,
        "contains_sensitive_or_inflammatory_language": false,
        "contains_personal_attack_or_harassment": false,
        "contains_unsafe_or_illegal_activity": false,
        "contains_sexual_content": false
      },
      "image_text_snippets": ["Q4 Results"],
      "keywords": ["dashboard", "metrics", "analytics", "growth"],
      "one_line_context_summary": "Product dashboard screenshot showing quarterly metrics and analytics"
    }
  ],
  "predictions": {
    "role_distribution_top5": [
      { "role": "Product Manager", "pct": 28.5 },
      { "role": "Engineering Manager", "pct": 22.3 }
    ],
    "narratives": [
      { "name": "product_launch", "prob": 0.72 },
      { "name": "thought_leadership", "prob": 0.45 }
    ],
    "risk": {
      "risk_class": "Helpful",
      "risk_probs": { "Harmful": 0.05, "Helpful": 0.72, "Harmless": 0.23 },
      "risk_level": "Low",
      "primary_risk_reason": "Product announcement with clear value"
    }
  },
  "attribution": {
    "text_driven_signals": ["narrative:product_launch", "risk:Helpful"],
    "image_driven_signals": ["signal:engineering-context"],
    "mixed_signals": ["role:Product Manager"]
  }
}
```

---

## Modules

### 1. `types/image-analysis.ts`
TypeScript interfaces for all image analysis types.

### 2. `lib/image-analysis/vision-adapter.ts`
Vision API adapter using Gemini 2.0 Flash.

**Key function:**
```typescript
extractImageContext(image: ImageInput): Promise<ImageContext>
```

Extracts structured JSON from image:
- `high_level_type`: screenshot, code, infographic, etc.
- `engineering_signals`: code, architecture, metrics, dev-tools
- `recruiting_signals`: hiring language, role titles, events
- `risk_signals`: political, inflammatory, harassment, unsafe
- `keywords`: semantic keywords for attribution
- `one_line_context_summary`: factual description

### 3. `lib/image-analysis/fusion.ts`
Builds fused input text for ML consumption.

**Key function:**
```typescript
buildFusedInputText(draftText: string, imageContexts: ImageContext[]): string
```

**Format:**
```
[DRAFT TEXT]
{draft_text}

[IMAGE CONTEXT]
- Image {id}: {one_line_context_summary}
  - type: {high_level_type}
  - engineering: {key signals}
  - recruiting: {key signals}
  - risk: {key signals}
  - keywords: {top 5}
```

### 4. `lib/image-analysis/attribution.ts`
Attributes prediction signals to text, image, or both.

**Key function:**
```typescript
attributeSignals(draftText, imageContexts, predictions): SignalAttribution
```

**Rules:**
- Signal keyword only in image → `image_driven_signals`
- Signal keyword only in text → `text_driven_signals`
- Signal keyword in both → `mixed_signals`

### 5. `lib/image-analysis/index.ts`
Main orchestration.

**Key function:**
```typescript
analyzeWithImages(request: AnalyzeWithImagesRequest): Promise<AnalyzeWithImagesResponse>
```

---

## Image Context Schema

```typescript
interface ImageContext {
  image_id: string
  high_level_type: 'screenshot' | 'infographic' | 'code' | 'product_ui' | 
                   'people_photo' | 'office_photo' | 'event_photo' | 
                   'meme' | 'document' | 'chart' | 'other'
  primary_subjects: string[]
  setting: string[]
  brand_markers: string[]
  visual_tone: 'professional' | 'casual' | 'hype' | 'serious' | 
               'playful' | 'controversial' | 'unknown'
  engineering_signals: EngineeringSignals
  recruiting_signals: RecruitingSignals
  risk_signals: RiskSignals
  image_text_snippets: string[]  // max 3
  keywords: string[]              // max 10
  one_line_context_summary: string
}
```

---

## Privacy & Security

1. **Raw images are NEVER logged** - only extracted JSON context
2. **No private attribute inference** - no age, ethnicity, etc.
3. **Conservative risk flags** - only set true if clearly present
4. **Short summaries** - factual, neutral, minimal

---

## Configuration

**Environment Variables:**
```bash
GEMINI_API_KEY=your-api-key
NEXT_PUBLIC_ML_API_URL=http://localhost:8000
```

**Vision Model:** Gemini 2.0 Flash (fast, cost-effective)

---

## Extending to Other Vision APIs

The `VisionAPIAdapter` interface allows swapping providers:

```typescript
interface VisionAPIAdapter {
  extractImageContext(image: ImageInput): Promise<ImageContext>
}
```

To add OpenAI Vision or Claude:
1. Create new adapter file (e.g., `openai-adapter.ts`)
2. Implement the `extractImageContext` function
3. Update import in `index.ts`

---

## Files Created

| File | Purpose |
|------|---------|
| `types/image-analysis.ts` | TypeScript interfaces |
| `lib/image-analysis/vision-adapter.ts` | Gemini Vision extraction |
| `lib/image-analysis/fusion.ts` | Text + image fusion |
| `lib/image-analysis/attribution.ts` | Signal attribution |
| `lib/image-analysis/index.ts` | Main orchestration |
| `app/api/analyze-with-images/route.ts` | API endpoint |

---

## Build Status

✅ TypeScript: 0 errors
✅ Production build: successful
✅ API route: `/api/analyze-with-images` ready
