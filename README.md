# LinkedIn PR Sentiment Classifier

A machine learning system to predict whether a LinkedIn post will result in positive or negative PR using Gemini LLM embeddings and XGBoost.

## 🎯 Project Overview

This project analyzes LinkedIn posts to classify them as generating positive or negative public relations outcomes, using a combination of:
- **Gemini AI embeddings** for semantic text understanding
- **XGBoost classifier** for robust prediction
- **Engagement metrics & sentiment analysis** for label generation

## 📊 Dataset

- **Posts**: ~200 LinkedIn company posts (primarily from Google)
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
