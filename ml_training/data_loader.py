from __future__ import annotations

from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from .utils import (
    DEFAULT_SEED,
    NARRATIVE_LABELS,
    NARRATIVE_MIN_COMMENTS,
    NARRATIVE_THRESHOLD,
    ROLE_BUCKETS,
    ROLE_MIN_COMMENTS,
    canonicalize_url,
    drop_empty_text,
    ensure_columns,
)

logger = logging.getLogger(__name__)


POST_REQUIRED_COLUMNS = [
    "post_url",
    "post_text",
    "posted_at",
    "likes",
    "total_comments",
    "risk_level",
    "risk_class",
    "risk_score",
    "risk_reasons",
    "risk_level_full",
    "risk_class_full",
    "risk_score_full",
    "risk_reasons_full",
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

COMMENT_REQUIRED_COLUMNS = [
    "post_url",
    "comment_text",
    "author_headline",
    "role_bucket",
    "sentiment",
    "tone",
    "narrative",
]


@dataclass
class DatasetBundle:
    role_train: pd.DataFrame
    role_test: pd.DataFrame
    narrative_train: pd.DataFrame
    narrative_test: pd.DataFrame
    risk_train: pd.DataFrame
    risk_test: pd.DataFrame
    retriever_train_posts: pd.DataFrame
    split_manifest: Dict[str, Dict[str, Dict[str, int]]]
    holdout_company: str


def discover_companies(data_dir: Path) -> List[str]:
    companies = []
    for csv_path in data_dir.glob("*_posts_training.csv"):
        companies.append(csv_path.name.replace("_posts_training.csv", ""))
    if not companies:
        raise FileNotFoundError(f"No *_posts_training.csv files found in {data_dir}")
    return sorted(companies)


def _load_posts(data_dir: Path, company: str) -> pd.DataFrame:
    path = data_dir / f"{company}_posts_training.csv"
    if not path.exists():
        raise FileNotFoundError(f"Posts file missing for {company}: {path}")
    df = pd.read_csv(path)
    ensure_columns(df, POST_REQUIRED_COLUMNS, f"{company}_posts_training.csv")
    df["company"] = company
    df["post_url_clean"] = df["post_url"].apply(canonicalize_url)
    df = df[df["post_url_clean"] != ""]
    df = drop_empty_text(df, "post_text")
    _assert_unique_posts(df, company)
    return df


def _load_comments_full(data_dir: Path, company: str) -> pd.DataFrame:
    path = data_dir / f"{company}_comments_enriched_full.csv"
    if not path.exists():
        raise FileNotFoundError(f"comments_enriched_full file missing for {company}: {path}")
    df = pd.read_csv(path)
    ensure_columns(df, COMMENT_REQUIRED_COLUMNS, f"{company}_comments_enriched_full.csv")
    df["company"] = company
    df["post_url_clean"] = df["post_url"].apply(canonicalize_url)
    df = df[df["post_url_clean"] != ""]
    return df


def _assert_unique_posts(df: pd.DataFrame, company: str) -> None:
    dups = df[df.duplicated(subset=["company", "post_url_clean"], keep=False)]
    if not dups.empty:
        raise ValueError(
            f"Duplicate post_url entries detected for {company}. "
            "Ensure one row per post_url in posts_training.csv."
        )


def _compute_role_distribution(comments_df: pd.DataFrame) -> pd.DataFrame:
    working = comments_df.copy()
    working["role_bucket"] = working["role_bucket"].fillna("Other")
    working.loc[~working["role_bucket"].isin(ROLE_BUCKETS), "role_bucket"] = "Other"
    role_counts = (
        working.groupby(["company", "post_url_clean", "role_bucket"])
        .size()
        .unstack(fill_value=0)
        .reindex(columns=ROLE_BUCKETS, fill_value=0)
    )
    totals = role_counts.sum(axis=1).replace(0, np.nan)
    role_pct = role_counts.div(totals, axis=0).fillna(0)
    role_pct.reset_index(inplace=True)
    return role_pct


def _compute_narrative_flags(
    posts_df: pd.DataFrame,
    comments_df: Optional[pd.DataFrame],
) -> Tuple[pd.DataFrame, bool]:
    """
    Returns (narrative_df, used_comments_flag).
    narrative_df has columns company, post_url_clean, plus each label.
    """
    if comments_df is not None and not comments_df.empty:
        working = comments_df.copy()
        working = working.dropna(subset=["post_url_clean"])
        working["narrative"] = working["narrative"].fillna("")
        counts = (
            working.groupby(["company", "post_url_clean", "narrative"])
            .size()
            .unstack(fill_value=0)
        )
        counts = counts.reindex(columns=sorted(set(counts.columns) | set(NARRATIVE_LABELS)), fill_value=0)
        denom = counts.sum(axis=1).replace(0, np.nan)
        shares = counts.div(denom, axis=0).fillna(0)
        flags = (shares[NARRATIVE_LABELS] >= NARRATIVE_THRESHOLD).astype(int)
        flags.reset_index(inplace=True)
        return flags, True

    # Fallback using post-level aggregates.
    fallback = posts_df.copy()
    fallback = fallback[["company", "post_url_clean", "pct_toxic_burnout"]].copy()
    fallback.rename(columns={"pct_toxic_burnout": "pct_toxic_burnout_proxy"}, inplace=True)
    fallback["toxic_culture"] = (fallback["pct_toxic_burnout_proxy"] >= NARRATIVE_THRESHOLD).astype(int)
    fallback["burnout"] = (fallback["pct_toxic_burnout_proxy"] >= NARRATIVE_THRESHOLD).astype(int)
    fallback["elitism"] = 0
    fallback["credibility_overclaim"] = 0
    fallback["culture_misalignment"] = 0
    return fallback[
        ["company", "post_url_clean", "toxic_culture", "burnout", "elitism", "credibility_overclaim", "culture_misalignment"]
    ], False


def _normalize_risk_class(series: pd.Series) -> pd.Series:
    cleaned = series.fillna("").astype(str).str.strip()
    cleaned = cleaned.replace("", np.nan)
    return cleaned.str.title()


def load_datasets(
    data_dir: str,
    holdout_company: str,
    seed: int = DEFAULT_SEED,
) -> DatasetBundle:
    data_path = Path(data_dir)
    companies = discover_companies(data_path)
    if holdout_company not in companies:
        raise ValueError(f"Holdout company {holdout_company} not found. Available: {companies}")

    post_frames = []
    comment_frames = []
    for company in companies:
        posts = _load_posts(data_path, company)
        post_frames.append(posts)
        comments = _load_comments_full(data_path, company)
        comment_frames.append(comments)

    posts_df = pd.concat(post_frames, ignore_index=True)
    comments_df = pd.concat(comment_frames, ignore_index=True)

    role_pct = _compute_role_distribution(comments_df)
    narrative_flags, used_comments = _compute_narrative_flags(posts_df, comments_df)
    if not used_comments:
        logger.warning("Narrative targets falling back to pct_toxic_burnout proxy; comment narratives missing.")

    merged = posts_df.merge(role_pct, on=["company", "post_url_clean"], how="left", validate="one_to_one")
    merged[ROLE_BUCKETS] = merged[ROLE_BUCKETS].fillna(0.0)

    merged = merged.merge(
        narrative_flags,
        on=["company", "post_url_clean"],
        how="left",
        validate="one_to_one",
    )
    merged[NARRATIVE_LABELS] = merged[NARRATIVE_LABELS].fillna(0).astype(int)

    merged["risk_class_target"] = _normalize_risk_class(merged["risk_class_full"]).fillna(
        _normalize_risk_class(merged["risk_class"])
    )

    merged = merged.dropna(subset=["risk_class_target"])

    # Final uniqueness check after merges.
    _assert_unique_posts(merged, "all_companies")

    role_df = merged[merged["total_comments"] >= ROLE_MIN_COMMENTS].copy()
    narrative_df = merged[merged["total_comments"] >= NARRATIVE_MIN_COMMENTS].copy()
    risk_df = merged.copy()

    role_train = role_df[role_df["company"] != holdout_company].copy()
    role_test = role_df[role_df["company"] == holdout_company].copy()
    narrative_train = narrative_df[narrative_df["company"] != holdout_company].copy()
    narrative_test = narrative_df[narrative_df["company"] == holdout_company].copy()
    risk_train = risk_df[risk_df["company"] != holdout_company].copy()
    risk_test = risk_df[risk_df["company"] == holdout_company].copy()

    split_manifest = {
        "role": _manifest_counts(role_df, holdout_company),
        "narrative": _manifest_counts(narrative_df, holdout_company),
        "risk": _manifest_counts(risk_df, holdout_company),
    }

    retriever_train = merged[merged["company"] != holdout_company].copy()
    retriever_train = retriever_train.reset_index(drop=True)

    return DatasetBundle(
        role_train=role_train.reset_index(drop=True),
        role_test=role_test.reset_index(drop=True),
        narrative_train=narrative_train.reset_index(drop=True),
        narrative_test=narrative_test.reset_index(drop=True),
        risk_train=risk_train.reset_index(drop=True),
        risk_test=risk_test.reset_index(drop=True),
        retriever_train_posts=retriever_train,
        split_manifest=split_manifest,
        holdout_company=holdout_company,
    )


def _manifest_counts(df: pd.DataFrame, holdout_company: str) -> Dict[str, Dict[str, int]]:
    train_counts = df[df["company"] != holdout_company].groupby("company").size().to_dict()
    test_counts = df[df["company"] == holdout_company].groupby("company").size().to_dict()
    return {"train": train_counts, "test": test_counts}
