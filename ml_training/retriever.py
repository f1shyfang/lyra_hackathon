from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import save_npz, load_npz
from sklearn.metrics.pairwise import cosine_similarity

from .models import build_shared_tfidf
from .utils import safe_mkdir


RETRIEVER_FILES = {
    "vectorizer": "shared_tfidf.joblib",
    "matrix": "train_tfidf_matrix.npz",
    "index": "train_post_index.csv",
}


def build_retriever_artifacts(
    train_df: pd.DataFrame,
    output_dir: Path,
    tfidf_params: Dict[str, Any],
) -> None:
    models_dir = output_dir / "models"
    safe_mkdir(models_dir)
    vectorizer = build_shared_tfidf(tfidf_params)
    matrix = vectorizer.fit_transform(train_df["post_text"])

    joblib.dump(vectorizer, models_dir / RETRIEVER_FILES["vectorizer"])
    save_npz(models_dir / RETRIEVER_FILES["matrix"], matrix)

    percentage_cols = [
        col
        for col in [
            "pct_negative",
            "pct_negative_engineer",
            "pct_toxic_burnout",
            "pct_critical_hostile",
            "pct_supportive",
            "pct_negative_full",
            "pct_negative_engineer_full",
            "pct_toxic_burnout_full",
            "pct_critical_hostile_full",
            "pct_supportive_full",
        ]
        if col in train_df.columns
    ]

    index_cols = ["post_url_clean", "company", "posted_at", "risk_class_target", "total_comments"] + percentage_cols
    index_df = train_df[index_cols].copy()
    index_df = index_df.rename(columns={"post_url_clean": "post_url", "risk_class_target": "risk_class"})
    index_df.to_csv(models_dir / RETRIEVER_FILES["index"], index=False)


def get_similar_posts(draft_text: str, k: int = 3, model_dir: str = "output/models") -> List[Dict[str, Any]]:
    """
    Load retriever artifacts and return top-k similar training posts with cosine similarity.
    """
    if not draft_text or not draft_text.strip():
        raise ValueError("draft_text cannot be empty.")

    models_path = Path(model_dir)
    vectorizer = joblib.load(models_path / RETRIEVER_FILES["vectorizer"])
    matrix = load_npz(models_path / RETRIEVER_FILES["matrix"])
    index_df = pd.read_csv(models_path / RETRIEVER_FILES["index"])

    query_vec = vectorizer.transform([draft_text])
    similarities = cosine_similarity(query_vec, matrix).ravel()
    top_idx = np.argsort(similarities)[::-1][:k]

    results: List[Dict[str, Any]] = []
    for idx in top_idx:
        record = index_df.iloc[idx].to_dict()
        record["similarity"] = float(similarities[idx])
        results.append(record)
    return results
