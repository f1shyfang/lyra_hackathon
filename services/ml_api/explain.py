from __future__ import annotations

import numpy as np
from typing import Dict, List, Tuple, Optional
from scipy.sparse import csr_matrix


def get_vectorizer(model) -> Optional[object]:
    # Pipelines
    if hasattr(model, "named_steps"):
        return model.named_steps.get("tfidf")
    # Custom role wrapper
    if hasattr(model, "get_tfidf"):
        return model.get_tfidf()
    return None


def vectorize(text: str, vectorizer) -> Tuple[csr_matrix, np.ndarray]:
    vec = vectorizer.transform([text])
    feature_names = vectorizer.get_feature_names_out()
    return vec, feature_names


def top_contributions_from_vec(
    vec: csr_matrix,
    coefs: np.ndarray,
    feature_names: np.ndarray,
    top_k: int,
) -> List[Dict[str, float]]:
    if vec.shape[1] != coefs.shape[0]:
        return []
    vec_csr = vec.tocsr()
    data = vec_csr.data
    indices = vec_csr.indices
    contributions = data * coefs[indices]
    if contributions.size == 0:
        return []
    order = np.argsort(np.abs(contributions))[::-1][:top_k]
    return [
        {"ngram": str(feature_names[indices[i]]), "weight": float(contributions[i])}
        for i in order
    ]


def choose_risk_coefficients(risk_clf, target_class: str) -> Optional[np.ndarray]:
    """
    Return coefficient vector for a desired class if available.
    """
    estimator = None
    # CalibratedClassifierCV stores fitted estimators inside calibrated_classifiers_
    if hasattr(risk_clf, "calibrated_classifiers_") and risk_clf.calibrated_classifiers_:
        estimator = risk_clf.calibrated_classifiers_[0].estimator
    elif hasattr(risk_clf, "base_estimator"):
        estimator = risk_clf.base_estimator
    else:
        estimator = risk_clf

    if estimator is None or not hasattr(estimator, "coef_"):
        return None

    classes = getattr(estimator, "classes_", None)
    if classes is None:
        return None
    classes = [str(c) for c in classes]
    target = target_class
    if target in classes:
        idx = classes.index(target)
    else:
        idx = int(np.argmax(getattr(estimator, "coef_", [0])) if estimator.coef_.ndim > 1 else 0)
    coefs = estimator.coef_[idx]
    return np.asarray(coefs).ravel()
