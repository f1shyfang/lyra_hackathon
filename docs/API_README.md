# LinkedIn PR Sentiment Classifier API

A FastAPI-based REST API that predicts whether a LinkedIn post will generate positive or negative PR using machine learning (XGBoost + Gemini embeddings).

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Trained model files in the `output/` directory

### Installation

1. **Install dependencies:**
```bash
pip install -r requirements_api.txt
```

2. **Set up environment variables:**
```bash
# Copy the example environment file
cp env.example .env

# Edit .env and add your Gemini API key
export GEMINI_API_KEY='your_gemini_api_key_here'
```

3. **Verify model files exist:**
```bash
ls output/
# Should contain:
# - pr_classifier_model.pkl
# - feature_scaler.pkl
# - post_type_encoder.pkl
# - media_type_encoder.pkl
```

### Running the API

**Development mode:**
```bash
python api.py
```

**Production mode with Gunicorn:**
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api:app --bind 0.0.0.0:8000
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
  "status": "healthy",
  "message": "Service is running",
  "model_loaded": true,
  "timestamp": "2025-12-15T10:30:00Z"
}
```

#### 2. Make Prediction
```http
POST /predict
Content-Type: application/json
```

**Request Body (Minimal):**
```json
{
  "text": "Excited to announce our new AI-powered analytics platform! #AI #Innovation"
}
```

**Request Body (Full):**
```json
{
  "text": "Excited to announce our new AI-powered analytics platform!",
  "post_hour": 14,
  "post_day_of_week": 2,
  "post_month": 12,
  "has_media": 1,
  "media_count": 1,
  "media_type": "image",
  "post_type": "regular",
  "author_follower_count": 5000,
  "avg_sentiment": 0.5,
  "median_sentiment": 0.6,
  "num_comments_analyzed": 10
}
```

**Response:**
```json
{
  "prediction": "positive",
  "confidence": 0.85,
  "probabilities": {
    "negative": 0.15,
    "positive": 0.85
  },
  "features_extracted": {
    "text_length": 152,
    "emoji_count": 0,
    "url_count": 0,
    "hashtag_count": 2,
    "mention_count": 0,
    "embedding_dimension": 30
  },
  "timestamp": "2025-12-15T10:30:00Z"
}
```

#### 3. Model Information
```http
GET /model-info
```

**Response:**
```json
{
  "model_directory": "output",
  "pca_enabled": false,
  "embedding_model": "Gemini models/embedding-001",
  "classifier_model": "XGBoost",
  "features": {
    "embedding_dimension": 768,
    "metadata_features": 16,
    "total_features": 784
  },
  "encoders": {
    "post_types": ["regular", "article"],
    "media_types": ["none", "image", "video"]
  }
}
```

## 🧪 Testing

Run the test suite:
```bash
# Make sure the API is running in another terminal
python test_api.py
```

Test with curl:
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Excited to announce our new product launch! #Innovation"
  }'
```

Test with Python:
```python
import requests

response = requests.post(
    "http://localhost:8000/predict",
    json={"text": "Great news! We just won an industry award!"}
)

result = response.json()
print(f"Prediction: {result['prediction']}")
print(f"Confidence: {result['confidence']:.2%}")
```

## 📊 Request Parameters

### Required
- **text** (string): LinkedIn post text content (1-10,000 characters)

### Optional Metadata
- **post_hour** (int): Hour of posting (0-23), default: 12
- **post_day_of_week** (int): Day of week (0=Monday, 6=Sunday), default: 2
- **post_month** (int): Month (1-12), default: 1
- **has_media** (int): Has media (0 or 1), default: 0
- **media_count** (int): Number of media items, default: 0
- **media_type** (string): Media type (none/image/video), default: "none"
- **post_type** (string): Post type (regular/article), default: "regular"
- **author_follower_count** (int): Author follower count, default: 1000
- **avg_sentiment** (float): Average comment sentiment (-1 to 1), default: 0.0
- **median_sentiment** (float): Median comment sentiment (-1 to 1), default: 0.0
- **num_comments_analyzed** (int): Number of comments, default: 0

## 🔧 Configuration

Environment variables (see `env.example`):

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes |
| `MODEL_DIR` | Directory with model files | `output` | No |
| `API_HOST` | API server host | `0.0.0.0` | No |
| `API_PORT` | API server port | `8000` | No |

## 🏗️ Architecture

```
User Request (POST /predict)
    ↓
FastAPI Endpoint
    ↓
PRClassifierService
    ├── Feature Extraction
    │   ├── Gemini Embedding (768-dim)
    │   ├── Text Features (emoji, URL, hashtag counts)
    │   ├── Temporal Features (hour, day, month)
    │   └── Media Features
    ├── Optional PCA (768 → 30 dimensions)
    ├── Feature Scaling (StandardScaler)
    └── XGBoost Prediction
        ↓
JSON Response (prediction + confidence)
```

## 📁 Project Structure

```
.
├── api.py                    # FastAPI server
├── prediction_service.py     # Core prediction logic
├── requirements_api.txt      # Python dependencies
├── env.example              # Environment template
├── test_api.py              # Test suite
├── API_README.md            # This file
└── output/                  # Model files
    ├── pr_classifier_model.pkl
    ├── feature_scaler.pkl
    ├── post_type_encoder.pkl
    └── media_type_encoder.pkl
```

## 🐛 Troubleshooting

### Server won't start

**Error:** `GEMINI_API_KEY environment variable not set`
```bash
# Solution: Set the API key
export GEMINI_API_KEY='your_key_here'
```

**Error:** `Failed to load model files`
```bash
# Solution: Verify model files exist
ls output/*.pkl

# If missing, run the training notebook first
# (attempt2.ipynb)
```

### Predictions fail

**Error:** `Failed to generate embedding from Gemini API`
- Check API key is valid
- Check internet connection
- Verify Gemini API quota/limits

**Error:** `Prediction service not initialized`
- Restart the server
- Check server logs for startup errors

### Performance issues

If predictions are slow:
1. Use a faster server (more CPU/RAM)
2. Consider caching embeddings for repeated texts
3. Deploy with multiple Gunicorn workers

## 📝 Example Use Cases

### 1. Pre-post Review
```python
# Before posting on LinkedIn, check PR sentiment
text = "Our company is restructuring operations..."
response = requests.post(url, json={"text": text})

if response.json()["prediction"] == "negative":
    print("⚠️ Warning: This post may generate negative PR")
```

### 2. Batch Analysis
```python
# Analyze multiple draft posts
posts = [
    "Announcing our Q4 results...",
    "Proud to share our sustainability report...",
    "Updates on recent challenges..."
]

for post in posts:
    result = requests.post(url, json={"text": post}).json()
    print(f"{post[:50]}: {result['prediction']} ({result['confidence']:.0%})")
```

### 3. Integration with Content Calendar
```python
# Filter posts by predicted sentiment
scheduled_posts = load_content_calendar()

safe_posts = []
for post in scheduled_posts:
    result = predict(post['text'])
    if result['prediction'] == 'positive' and result['confidence'] > 0.7:
        safe_posts.append(post)
```

## 🔒 Security Considerations

- **API Key:** Never commit `.env` file or expose API keys
- **Rate Limiting:** Consider adding rate limiting for production
- **CORS:** Configure `allow_origins` appropriately for your domain
- **Authentication:** Add authentication middleware for production use
- **Input Validation:** API validates input length and format

## 📄 License

This API is part of the Lyra Hackathon project.

## 🤝 Support

For issues or questions:
1. Check the interactive docs at `/docs`
2. Review the test suite in `test_api.py`
3. Check server logs for error details

---

Built with FastAPI, XGBoost, and Google Gemini AI

