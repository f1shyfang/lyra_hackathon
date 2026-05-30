"""
LinkedIn PR Sentiment Prediction Service

This module provides feature extraction and prediction functionality for
classifying LinkedIn posts as positive or negative PR using Gemini embeddings
and XGBoost classifier.
"""

import logging
import os
import re
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Optional, List
import google.generativeai as genai
import joblib

logger = logging.getLogger("pr_api.prediction_service")


class PRClassifierService:
    """Service for predicting PR sentiment of LinkedIn posts"""
    
    def __init__(self, model_dir: str = "output", api_key: Optional[str] = None):
        """
        Initialize the PR classifier service
        
        Args:
            model_dir: Directory containing the model files
            api_key: Gemini API key (if not provided, uses GEMINI_API_KEY env var)
        """
        self.model_dir = model_dir
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY must be provided or set as environment variable")
        
        # Configure Gemini API
        genai.configure(api_key=self.api_key)
        
        # Load model and preprocessors
        self._load_models()
        
        # Define metadata features (must match training order)
        self.metadata_features = [
            'text_length', 'emoji_count', 'url_count', 'hashtag_count', 'mention_count',
            'post_hour', 'post_day_of_week', 'post_month',
            'has_media', 'media_count', 'media_type_encoded', 'post_type_encoded',
            'author_follower_count',
            'avg_sentiment', 'median_sentiment', 'num_comments_analyzed'
        ]
    
    def _load_models(self):
        """Load trained model and preprocessing objects"""
        try:
            self.model = joblib.load(os.path.join(self.model_dir, "pr_classifier_model.pkl"))
            self.scaler = joblib.load(os.path.join(self.model_dir, "feature_scaler.pkl"))
            self.post_type_encoder = joblib.load(os.path.join(self.model_dir, "post_type_encoder.pkl"))
            self.media_type_encoder = joblib.load(os.path.join(self.model_dir, "media_type_encoder.pkl"))
            
            # Try to load PCA if it exists (optional)
            pca_path = os.path.join(self.model_dir, "pca_reducer.pkl")
            if os.path.exists(pca_path):
                self.pca = joblib.load(pca_path)
                logger.info("PCA reducer loaded")
            else:
                self.pca = None
                logger.info("No PCA reducer found (using full embeddings)")

            logger.info("Model and preprocessors loaded successfully")

        except Exception as e:
            raise RuntimeError(f"Failed to load model files from {self.model_dir}: {e}")
    
    def get_gemini_embedding(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> Optional[List[float]]:
        """
        Generate embedding for text using Gemini API
        
        Args:
            text: Input text to embed
            task_type: Type of embedding task
            
        Returns:
            768-dimensional embedding vector or None if failed
        """
        try:
            if not text or pd.isna(text):
                return None
            
            result = genai.embed_content(
                model="models/embedding-001",
                content=str(text),
                task_type=task_type
            )
            return result['embedding']

        except Exception as e:
            logger.error("Error generating embedding: %s", e)
            return None
    
    def count_emojis(self, text: str) -> int:
        """Count emoji characters in text"""
        if pd.isna(text) or not text:
            return 0
        
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"  # emoticons
            u"\U0001F300-\U0001F5FF"  # symbols & pictographs
            u"\U0001F680-\U0001F6FF"  # transport & map symbols
            u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
            u"\U00002702-\U000027B0"
            u"\U000024C2-\U0001F251"
            "]+", flags=re.UNICODE)
        
        return len(emoji_pattern.findall(text))
    
    def count_urls(self, text: str) -> int:
        """Count URLs in text"""
        if pd.isna(text) or not text:
            return 0
        
        url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
        return len(url_pattern.findall(str(text)))
    
    def count_hashtags(self, text: str) -> int:
        """Count hashtags in text"""
        if pd.isna(text) or not text:
            return 0
        
        return len(re.findall(r'#\w+', str(text)))
    
    def count_mentions(self, text: str) -> int:
        """Count @ mentions in text"""
        if pd.isna(text) or not text:
            return 0
        
        return len(re.findall(r'@\w+', str(text)))
    
    def extract_metadata_features(
        self,
        text: str,
        post_hour: int = 12,
        post_day_of_week: int = 2,
        post_month: int = 1,
        has_media: int = 0,
        media_count: int = 0,
        media_type: str = "none",
        post_type: str = "regular",
        author_follower_count: int = 1000,
        avg_sentiment: float = 0.0,
        median_sentiment: float = 0.0,
        num_comments_analyzed: int = 0
    ) -> np.ndarray:
        """
        Extract metadata features from post
        
        Args:
            text: Post text content
            post_hour: Hour of posting (0-23), default 12
            post_day_of_week: Day of week (0=Mon, 6=Sun), default 2 (Wednesday)
            post_month: Month (1-12), default 1
            has_media: Binary flag for media presence, default 0
            media_count: Number of media items, default 0
            media_type: Type of media (none/image/video/etc), default "none"
            post_type: Type of post (regular/article/etc), default "regular"
            author_follower_count: Follower count, default 1000
            avg_sentiment: Average comment sentiment, default 0
            median_sentiment: Median comment sentiment, default 0
            num_comments_analyzed: Number of comments, default 0
            
        Returns:
            Array of 16 metadata features
        """
        # Text-based features
        text_length = len(str(text)) if text else 0
        emoji_count = self.count_emojis(text)
        url_count = self.count_urls(text)
        hashtag_count = self.count_hashtags(text)
        mention_count = self.count_mentions(text)
        
        # Encode categorical features
        try:
            # Handle unknown categories gracefully
            if post_type not in self.post_type_encoder.classes_:
                post_type = "regular"
            post_type_encoded = self.post_type_encoder.transform([post_type])[0]
        except:
            post_type_encoded = 0
        
        try:
            if media_type not in self.media_type_encoder.classes_:
                media_type = "none"
            media_type_encoded = self.media_type_encoder.transform([media_type])[0]
        except:
            media_type_encoded = 0
        
        # Combine all features in correct order
        features = np.array([
            text_length,
            emoji_count,
            url_count,
            hashtag_count,
            mention_count,
            post_hour,
            post_day_of_week,
            post_month,
            has_media,
            media_count,
            media_type_encoded,
            post_type_encoded,
            author_follower_count,
            avg_sentiment,
            median_sentiment,
            num_comments_analyzed
        ], dtype=float)
        
        return features
    
    def predict(
        self,
        text: str,
        post_hour: int = 12,
        post_day_of_week: int = 2,
        post_month: int = 1,
        has_media: int = 0,
        media_count: int = 0,
        media_type: str = "none",
        post_type: str = "regular",
        author_follower_count: int = 1000,
        avg_sentiment: float = 0.0,
        median_sentiment: float = 0.0,
        num_comments_analyzed: int = 0
    ) -> Dict:
        """
        Predict PR sentiment for a LinkedIn post
        
        Args:
            text: Post text content (required)
            Other args: Optional metadata features (see extract_metadata_features)
            
        Returns:
            Dictionary containing:
                - prediction: "positive" or "negative"
                - confidence: Confidence score (0-1)
                - probabilities: Dict with positive/negative probabilities
                - features_extracted: Dict with extracted feature counts
        """
        if not text:
            raise ValueError("Text cannot be empty")
        
        # 1. Generate embedding
        embedding = self.get_gemini_embedding(text)
        if embedding is None:
            raise RuntimeError("Failed to generate embedding from Gemini API")
        
        embedding_array = np.array(embedding).reshape(1, -1)
        
        # 2. Apply PCA if available
        if self.pca is not None:
            embedding_array = self.pca.transform(embedding_array)
        
        # 3. Extract metadata features
        metadata_features = self.extract_metadata_features(
            text=text,
            post_hour=post_hour,
            post_day_of_week=post_day_of_week,
            post_month=post_month,
            has_media=has_media,
            media_count=media_count,
            media_type=media_type,
            post_type=post_type,
            author_follower_count=author_follower_count,
            avg_sentiment=avg_sentiment,
            median_sentiment=median_sentiment,
            num_comments_analyzed=num_comments_analyzed
        ).reshape(1, -1)
        
        # 4. Combine features (embeddings first, then metadata)
        combined_features = np.concatenate([embedding_array, metadata_features], axis=1)
        
        # 5. Scale features
        scaled_features = self.scaler.transform(combined_features)
        
        # 6. Make prediction
        prediction = self.model.predict(scaled_features)[0]
        probabilities = self.model.predict_proba(scaled_features)[0]
        
        # 7. Format response
        result = {
            "prediction": "positive" if prediction == 1 else "negative",
            "confidence": float(max(probabilities)),
            "probabilities": {
                "negative": float(probabilities[0]),
                "positive": float(probabilities[1])
            },
            "features_extracted": {
                "text_length": int(metadata_features[0, 0]),
                "emoji_count": int(metadata_features[0, 1]),
                "url_count": int(metadata_features[0, 2]),
                "hashtag_count": int(metadata_features[0, 3]),
                "mention_count": int(metadata_features[0, 4]),
                "embedding_dimension": embedding_array.shape[1]
            }
        }
        
        return result


# Example usage
if __name__ == "__main__":
    # Test the service
    service = PRClassifierService()
    
    test_text = """
    Exciting news! We're launching our new product that will revolutionize 
    the industry. Join us for the launch event! #Innovation #TechNews
    """
    
    result = service.predict(test_text)
    print("\nPrediction Result:")
    print(f"  Prediction: {result['prediction']}")
    print(f"  Confidence: {result['confidence']:.2%}")
    print(f"  Probabilities: {result['probabilities']}")
    print(f"  Features: {result['features_extracted']}")




