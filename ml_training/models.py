from __future__ import annotations

from typing import Any, Dict, Optional

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, RidgeCV
from sklearn.multioutput import MultiOutputRegressor
from sklearn.multiclass import OneVsRestClassifier
from sklearn.pipeline import Pipeline
from sklearn.base import BaseEstimator

from .utils import softmax_rows


def build_tfidf_vectorizer(
    ngram_range=(1, 2),
    min_df: int = 2,
    max_df: float = 0.95,
    max_features: int = 30000,
    **kwargs: Any,
) -> TfidfVectorizer:
    return TfidfVectorizer(
        ngram_range=ngram_range,
        min_df=min_df,
        max_df=max_df,
        max_features=max_features,
        strip_accents="unicode",
        lowercase=True,
        **kwargs,
    )


class RoleCompositionModel(BaseEstimator):
    """
    Wrapper combining TF-IDF with multi-output Ridge and row-wise softmax
    to produce valid role distributions.
    """

    def __init__(
        self,
        tfidf_params: Optional[Dict[str, Any]] = None,
        alpha_grid: Optional[np.ndarray] = None,
    ) -> None:
        self.tfidf_params = tfidf_params or {}
        self.alpha_grid = alpha_grid
        self.pipeline: Optional[Pipeline] = None

    def fit(self, X, y):
        alphas = self.alpha_grid if self.alpha_grid is not None else np.logspace(-3, 3, 13)
        tfidf = build_tfidf_vectorizer(**self.tfidf_params)
        ridge = MultiOutputRegressor(RidgeCV(alphas=alphas))
        self.pipeline = Pipeline([("tfidf", tfidf), ("model", ridge)])
        self.pipeline.fit(X, y)
        return self

    def predict(self, X):
        if self.pipeline is None:
            raise RuntimeError("Model not fitted.")
        raw = self.pipeline.predict(X)
        return softmax_rows(np.asarray(raw))

    def predict_raw(self, X):
        if self.pipeline is None:
            raise RuntimeError("Model not fitted.")
        return self.pipeline.predict(X)

    def get_tfidf(self) -> TfidfVectorizer:
        if self.pipeline is None:
            raise RuntimeError("Model not fitted.")
        return self.pipeline.named_steps["tfidf"]


def build_role_model(tfidf_params: Optional[Dict[str, Any]] = None) -> RoleCompositionModel:
    return RoleCompositionModel(tfidf_params=tfidf_params)


def build_narrative_model(
    tfidf_params: Optional[Dict[str, Any]] = None,
    random_state: int = 42,
) -> Pipeline:
    tfidf = build_tfidf_vectorizer(**(tfidf_params or {}))
    clf = OneVsRestClassifier(
        LogisticRegression(
            max_iter=4000,
            class_weight="balanced",
            solver="liblinear",
            random_state=random_state,
        )
    )
    return Pipeline([("tfidf", tfidf), ("clf", clf)])


def build_risk_model(
    tfidf_params: Optional[Dict[str, Any]] = None,
    random_state: int = 42,
    cv_folds: int = 3,
) -> Pipeline:
    tfidf = build_tfidf_vectorizer(**(tfidf_params or {}))
    base_logreg = LogisticRegression(
        max_iter=4000,
        class_weight="balanced",
        solver="liblinear",
        multi_class="ovr",
        random_state=random_state,
    )
    calibrated = CalibratedClassifierCV(estimator=base_logreg, cv=cv_folds, method="sigmoid")
    return Pipeline([("tfidf", tfidf), ("clf", calibrated)])


def build_shared_tfidf(tfidf_params: Optional[Dict[str, Any]] = None) -> TfidfVectorizer:
    return build_tfidf_vectorizer(**(tfidf_params or {}))
