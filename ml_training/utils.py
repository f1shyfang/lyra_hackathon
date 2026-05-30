from __future__ import annotations

import json
import logging
import random
from pathlib import Path
from typing import Iterable, List, Sequence
from urllib.parse import urlsplit, urlunsplit

import numpy as np

# Fixed buckets and labels used across training and evaluation.
ROLE_BUCKETS: List[str] = [
    "Founder/Executive",
    "Recruiter/HR",
    "Software Engineer",
    "ML/AI/Data",
    "DevOps/SRE/Cloud",
    "Security",
    "Engineering Manager/Tech Lead",
    "Product Manager",
    "Designer",
    "Sales/BD",
    "Marketing/Growth",
    "Ops",
    "Student/Academic",
    "Other",
]

NARRATIVE_LABELS: List[str] = [
    "toxic_culture",
    "burnout",
    "elitism",
    "credibility_overclaim",
    "culture_misalignment",
]

ROLE_MIN_COMMENTS = 15
NARRATIVE_MIN_COMMENTS = 5
NARRATIVE_THRESHOLD = 0.10
DEFAULT_SEED = 42


def set_seed(seed: int = DEFAULT_SEED) -> None:
    """Set deterministic seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)


def canonicalize_url(url: str) -> str:
    """
    Canonicalize LinkedIn post URLs by stripping query/fragment and trailing slash.
    Returns empty string for invalid inputs so callers can filter them out.
    """
    if not isinstance(url, str):
        return ""
    trimmed = url.strip()
    if not trimmed:
        return ""
    parts = urlsplit(trimmed)
    path = parts.path.rstrip("/")
    return urlunsplit((parts.scheme, parts.netloc.lower(), path, "", ""))


def ensure_columns(df, required: Sequence[str], df_name: str) -> None:
    """Raise a clear error when required columns are missing."""
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in {df_name}: {missing}")


def drop_empty_text(df, text_col: str):
    """Remove rows with empty or whitespace-only text."""
    mask = df[text_col].astype(str).str.strip() != ""
    return df.loc[mask].copy()


def softmax_rows(arr: np.ndarray) -> np.ndarray:
    """Apply row-wise softmax with numerical stability."""
    shifted = arr - np.max(arr, axis=1, keepdims=True)
    exp_vals = np.exp(shifted)
    sums = np.clip(exp_vals.sum(axis=1, keepdims=True), 1e-12, None)
    return exp_vals / sums


def safe_mkdir(path: Path) -> None:
    """Create a directory (and parents) if it does not already exist."""
    path.mkdir(parents=True, exist_ok=True)


def save_json(path: Path, payload: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def configure_logging() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    return logging.getLogger("ml_training")
