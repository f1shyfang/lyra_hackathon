# LinkedIn PR Sentiment Classifier

A machine learning system to predict whether a LinkedIn post will result in positive or negative PR using Ridge, Logistic Regression and XGboost.

## 🎯 Project Overview

This project analyzes LinkedIn posts to classify them as generating positive or negative public relations outcomes, using a combination of:
- **Gemini AI embeddings** for semantic text understanding
- **XGBoost classifier** for robust prediction
- **Engagement metrics & sentiment analysis** for label generation

## 📊 Dataset

- **Posts**: ~1200 LinkedIn company posts per company (primarily from 6 different techn companies such as Google, Netflix, Micorsoft and etc.)
- **Comments**: ~6000 comments with engagement data
- **Features**: Text content, engagement metrics, media type, temporal patterns

## 🏗️ Architecture

```
LinkedIn Posts → Label Generation → Feature Engineering → Model Training → Prediction
     ↓              (VADER + Engagement)     ↓                    ↓
  Comments                            Gemini Embeddings      XGBoost
                                            +
                                      Metadata Features
```

## 🔧 Implementation Steps

### 1. **Data Loading & Exploration**
   - Loaded posts and comments datasets
   - Merged posts with comment sentiment
   - Explored engagement patterns

### 2. **Label Generation**
   - **Positive PR**: High engagement + positive reactions + positive sentiment
   - **Negative PR**: Low engagement OR negative sentiment OR poor reaction ratio
   - Uses VADER sentiment analysis on comments

### 3. **Feature Engineering**
   
   **Text Features via Gemini:**
   - 768-dimensional embeddings capturing semantic meaning
   
   **Metadata Features:**
   - Text characteristics: length, emojis, URLs, hashtags, mentions
   - Temporal: posting hour, day of week, month
   - Media: type (image/article/none), count
   - Engagement: comment sentiment scores
   - Author: follower count

### 4. **Model Training**
   - XGBoost binary classifier
   - Regression 
   - 80/20 train-test split
   - Feature scaling with StandardScaler
   - Class weighting for imbalanced data

### 5. **Evaluation & Interpretation**
   - Classification metrics (accuracy, precision, recall, F1)
   - Confusion matrix visualization
   - Feature importance analysis
   - Sample predictions with confidence scores

## 📁 Project Files

```
lyra_hackathon/
├── attempt2.ipynb              # Main notebook with full implementation
├── data/                       # LinkedIn posts and comments datasets
├── pr_classifier_model.pkl     # Trained XGBoost model
├── feature_scaler.pkl          # Feature scaler for preprocessing
├── post_embeddings.npy         # Cached Gemini embeddings
├── post_type_encoder.pkl       # Categorical encoder for post types
├── media_type_encoder.pkl      # Categorical encoder for media types
└── README.md                   # This file
```

## 🚀 Usage

### Training the Model

1. Set your Gemini API key:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

2. Run the notebook:
   ```bash
   jupyter notebook attempt2.ipynb
   ```

### Making Predictions on New Posts

```python
import joblib
import numpy as np
import google.generativeai as genai

# Load model and preprocessors
model = joblib.load('pr_classifier_model.pkl')
scaler = joblib.load('feature_scaler.pkl')

# Generate embedding for new post
new_post_text = "Your LinkedIn post text here..."
embedding = get_gemini_embedding(new_post_text)

# Extract metadata features (text_length, emoji_count, etc.)
metadata = extract_metadata_features(new_post_text)

# Combine and predict
features = np.concatenate([embedding, metadata])
features_scaled = scaler.transform([features])
prediction = model.predict(features_scaled)
confidence = model.predict_proba(features_scaled)

print(f"PR Prediction: {'Positive' if prediction[0] == 1 else 'Negative'}")
print(f"Confidence: {confidence[0][prediction[0]]:.2%}")
```

## 📈 Model Performance

The model achieves:
- Binary classification of PR sentiment
- Feature importance insights showing which factors drive positive/negative PR
- Combines deep learning (embeddings) with traditional ML (XGBoost)

Key predictive factors typically include:
- Comment sentiment scores
- Engagement metrics (reactions, comments, reposts)
- Text characteristics (length, emojis, URLs)
- Temporal patterns (posting time)
- Media presence and type

## 🛠️ Dependencies

```
google-generativeai
xgboost
pandas
numpy
scikit-learn
vaderSentiment
matplotlib
seaborn
```

## 💡 Key Insights

1. **Text embeddings are powerful**: Gemini embeddings capture semantic nuances in post content
2. **Engagement patterns matter**: Low engagement often correlates with negative PR
3. **Comment sentiment is predictive**: Negative comments are strong indicators of PR issues
4. **Media enhances engagement**: Posts with images/videos tend to perform better
5. **Combined approach works**: Text semantics + metadata features yield robust predictions

## 🎯 Use Cases

- **Pre-posting analysis**: Predict PR impact before publishing
- **Content optimization**: Identify what makes posts resonate positively
- **Crisis detection**: Flag posts likely to generate negative PR
- **Strategy refinement**: Understand drivers of positive engagement

## 📝 Notes

- Labels are generated automatically from engagement and sentiment (not manually labeled)
- Gemini API key required for embedding generation
- Model can be retrained on domain-specific data for better performance
- Placeholder embeddings used if API key not set (for demonstration)

## 🔮 Future Enhancements

- Incorporate image/video content analysis
- Add time-series modeling for trend prediction
- Include competitor post analysis
- Real-time monitoring dashboard
- Multi-class classification (positive/neutral/negative/crisis)

---

**Created for Lyra Hackathon** | December 2025

## How to run locally (ML API + Next.js)

1. Create a Python venv and install ML API deps:
   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   source .venv/bin/activate
   pip install -r services/ml_api/requirements.txt
   ```
2. Install Node deps:
   ```bash
   npm install
   ```
3. Start both FastAPI + Next.js:
   ```bash
   npm run dev
   ```
   Or run separately:
   ```bash
   npm run dev:ml   # FastAPI at http://localhost:8000
   npm run dev:web  # Next.js at http://localhost:3000
   ```

Environment variables (`.env.local`) needed for the new pipeline:
```
ML_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Supabase schema for logging requests/responses: `docs/supabase.sql` (table `analyses`).

## AI provider abstraction (Vercel AI SDK)

The Next.js AI layer uses the **Vercel AI SDK** (`ai` + `@ai-sdk/google` + `zod`),
so the model provider is swappable. `lib/ai/provider.ts` exposes `getModel()`,
which resolves a model from the `AI_MODEL` env var (default
`google/gemini-2.0-flash`).

How a model is resolved:
- If `AI_GATEWAY_API_KEY` is set (or, on Vercel, OIDC enables the Gateway), the
  `provider/model` string is routed through the **Vercel AI Gateway**, which adds
  failover and cost tracking.
- Otherwise it falls back to the `@ai-sdk/google` provider using a direct key.
  The key is read from `GOOGLE_GENERATIVE_AI_API_KEY` (preferred), with
  `GEMINI_API_KEY` as a fallback.

**Switching providers** is a one-line change: set `AI_MODEL` (e.g.
`openai/gpt-4o-mini`) and supply the relevant provider key or use the Gateway.

```
AI_MODEL=google/gemini-2.0-flash      # default
AI_GATEWAY_API_KEY=...                # optional: route via Vercel AI Gateway
GOOGLE_GENERATIVE_AI_API_KEY=...       # direct Google key (GEMINI_API_KEY is a fallback)
```

## Rate limiting

Two independent limiters protect the public surface:

**Next.js inbound limiter** (`lib/ratelimit.ts`) — an in-memory, per-client-IP
limiter applied to all public POST routes: `/api/gemini`, `/api/predict`,
`/api/analyze`, `/api/analyze-with-images`, `/api/ab-tests`, `/api/personas`,
`/api/drafts`. Over-limit requests get a `429` with a `Retry-After` header.
Configure with:
```
RATE_LIMIT_MAX=30           # max requests per client per window
RATE_LIMIT_WINDOW_MS=60000  # window length (ms)
```
> Caveat: the in-memory store does **not** span serverless instances. For
> production scale, back it with Upstash (shared Redis).

There is also a separate **outbound** throttle on calls to the AI provider,
configured with `GEMINI_RATE_LIMIT_MAX_REQUESTS` (default `15`) and
`GEMINI_RATE_LIMIT_WINDOW_MS` (default `60000`).

**FastAPI `/predict` limiter** (`api.py`) — a `slowapi` per-IP limit on
`POST /predict`, returning `429` when exceeded. Configure with
`RATE_LIMIT_PREDICT` (default `30/minute`).
> Caveat: the default store is in-memory **per gunicorn worker**, so with N
> workers the effective global limit is ~N× the configured value. Set
> `RATELIMIT_STORAGE_URI` (e.g. `redis://host:6379/0`) for a consistent global
> limit. See `RENDER_DEPLOY.md` for deployment details.
