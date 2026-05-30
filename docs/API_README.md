# Lyra ML API

A FastAPI service (`services/ml_api`) that scores recruiting/PR post text using a
**provider-free TF-IDF engine**. It predicts an audience/role distribution,
narrative flags, and a Helpful/Harmless/Harmful risk class, with n-gram evidence
for each. No AI provider key is required and logging uses local sqlite.

## 🚀 Quick Start

### Prerequisites

- Python 3.12
- Trained model files in the `output/models/` directory (`metadata.json`,
  `role_model.joblib`, `narrative_model.joblib`, `risk_model.joblib`, …)

### Installation

1. **Install dependencies:**
```bash
pip install -r services/ml_api/requirements.txt
```

2. **(Optional) Configure environment variables:**
```bash
# Override the model directory or CORS origin if needed.
export MODEL_DIR=output/models
export FRONTEND_ORIGIN=http://localhost:3000
```

### Running the API

**Development mode:**
```bash
python -m services.ml_api.main
```

**Production mode with Gunicorn:**
```bash
gunicorn services.ml_api.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

The API will be available at `http://localhost:8000`

## 📖 API Documentation

### Interactive Documentation

Once the server is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "models_loaded": true
}
```

#### 2. Analyze a Post
```http
POST /analyze
Content-Type: application/json
```

Optional query param: `?save=false` to skip logging the run to sqlite (defaults
to `true`).

**Request Body (Minimal):**
```json
{
  "post_text": "We are scaling our AI team fast. Expect late nights but huge impact."
}
```

**Request Body (Full):**
```json
{
  "post_text": "We are scaling our AI team fast. Expect late nights but huge impact.",
  "company_hint": "meta",
  "variant_id": "A",
  "user_id": "user-123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `post_text` | string | ✅ | Post text (trimmed; must be non-empty). |
| `company_hint` | string | | Optional audience/company hint; echoed back as `audience`. |
| `variant_id` | string | | Optional `"A"` or `"B"`. |
| `user_id` | string | | Optional identifier for logging. |

**Response (shape):**
```json
{
  "input_text": "We are scaling our AI team fast. Expect late nights but huge impact.",
  "audience": "meta",
  "role_distribution_top5": [{ "role": "engineering", "pct": 42.13 }],
  "role_distribution_all": [{ "role": "engineering", "pct": 42.13 }],
  "confidence_entropy": 2.31,
  "risk": {
    "risk_class": "Harmless",
    "risk_probs": { "Helpful": 0.21, "Harmless": 0.62, "Harmful": 0.17 },
    "risk_level": "Low",
    "primary_risk_reason": "Top harmful driver: late nights (+0.140)"
  },
  "narratives": {
    "narrative_probs": { "burnout": 0.31 },
    "narrative_flags": { "burnout": true }
  },
  "evidence": {
    "risk_top_ngrams": [{ "ngram": "late nights", "weight": 0.14 }],
    "narrative_top_ngrams": { "burnout": [{ "ngram": "late nights", "weight": 0.22 }] },
    "role_top_ngrams": { "engineering": [{ "ngram": "ai team", "weight": 0.18 }] }
  },
  "meta": {
    "model_dir_used": "/app/output/models",
    "timestamp_iso": "2026-05-30T10:30:00Z",
    "latency_ms": 42,
    "request_id": "1f0c..."
  }
}
```

`risk_level` is derived from the max risk probability: `High` ≥ 0.75,
`Medium` ≥ 0.55, otherwise `Low`.

#### 3. Compare Two Variants
```http
POST /analyze/compare
Content-Type: application/json
```

Optional query param: `?save=false` (defaults to `true`).

**Request Body:**
```json
{
  "baseline_text": "We are hiring engineers.",
  "variant_text": "We are hiring engineers for 24/7 on-call roles."
}
```

**Response (shape):** the full `/analyze` result for each side plus a `delta`:
```json
{
  "baseline": { "...": "full /analyze response" },
  "variant": { "...": "full /analyze response" },
  "delta": {
    "role_pct_delta": { "engineering": -3.21 },
    "risk_prob_delta": { "Helpful": -0.04, "Harmless": -0.06, "Harmful": 0.10 },
    "changed_top_phrases": [{ "ngram": "on-call", "weight": 0.19 }]
  }
}
```

#### 4. History
```http
GET /history?limit=50
```

`limit` defaults to `50` (range 1–200). Returns previously logged runs:
```json
{
  "rows": [{ "...": "logged run" }],
  "count": 1
}
```

## 🧪 Testing

Test with curl (see also `services/ml_api/curl_examples.md`):
```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{"post_text":"Hiring for cloud infra SREs."}'
```

Test with Python:
```python
import requests

response = requests.post(
    "http://localhost:8000/analyze",
    json={"post_text": "We are scaling our AI team fast."},
)

result = response.json()
print(f"Risk class: {result['risk']['risk_class']}")
print(f"Risk level: {result['risk']['risk_level']}")
```

## 🔧 Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MODEL_DIR` | Directory with trained model files | `output/models` | No |
| `FRONTEND_ORIGIN` | Frontend origin allowed by CORS | `http://localhost:3000` | No |
| `WEB_CONCURRENCY` | gunicorn worker count | `1` | No |
| `PORT` | API server port | `8000` | No |

## 🏗️ Architecture

```
User Request (POST /analyze)
    ↓
FastAPI Endpoint (services/ml_api/main.py)
    ↓
Predictor (services/ml_api/predictor.py)
    ├── TF-IDF vectorization
    ├── Role distribution model
    ├── Narrative multi-label model
    ├── Risk model (Helpful / Harmless / Harmful)
    └── N-gram evidence (top contributing phrases)
        ↓
JSON Response (distribution + risk + narratives + evidence)
        ↓
(optional) sqlite logging
```

## 📁 Project Structure

```
services/ml_api/
├── main.py            # FastAPI app + endpoints
├── predictor.py       # Core scoring logic
├── schemas.py         # Request/response models
├── explain.py         # N-gram contribution helpers
├── db.py              # sqlite logging
├── requirements.txt   # Python dependencies
└── curl_examples.md   # Ready-to-run curl examples
output/models/         # Trained TF-IDF artifacts
```

## 🐛 Troubleshooting

### Server won't start / `/health` returns 500

**Error:** `Models not loaded` (or `Model directory not found`)
```bash
# Solution: verify the model artifacts exist
ls output/models/

# If MODEL_DIR points elsewhere, set it explicitly
export MODEL_DIR=output/models
```

### Requests fail

**Error:** `Prediction failed` / `Compare failed`
- Check the server logs for the underlying traceback.
- Confirm the model artifacts in `MODEL_DIR` match the deployed code.

## 🔒 Security Considerations

- **No provider key:** this service holds no AI provider credentials.
- **Rate limiting:** the API has no built-in limiter; it is protected at the
  Next.js proxy layer (`app/api/analyze`, see `lib/ratelimit.ts`).
- **CORS:** set `FRONTEND_ORIGIN` to your deployed frontend origin.
- **Input Validation:** `post_text` is trimmed and required to be non-empty.

## 📄 License

This API is part of the Lyra Hackathon project.

---

Built with FastAPI and scikit-learn (TF-IDF).
