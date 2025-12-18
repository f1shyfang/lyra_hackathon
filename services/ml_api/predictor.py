from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from scipy.special import softmax
from scipy.sparse import csr_matrix
from scipy.sparse import load_npz
from sklearn.metrics.pairwise import cosine_similarity

from .schemas import AnalyzeRequest
from .explain import (
    choose_risk_coefficients,
    get_vectorizer,
    top_contributions_from_vec,
    vectorize,
)


class Predictor:
    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self.reports_dir = model_dir.parent / "reports"
        if not model_dir.exists():
            raise FileNotFoundError(f"Model directory not found: {model_dir}")

        self.metadata = self._load_metadata()
        self.role_buckets: List[str] = self.metadata.get("role_buckets", [])
        self.narrative_labels: List[str] = self.metadata.get("narrative_labels", [])
        self.narrative_threshold: float = float(self.metadata.get("narrative_threshold", 0.5))
        if not self.role_buckets or not self.narrative_labels:
            raise ValueError("Metadata missing required role_buckets or narrative_labels.")

        self.role_model = self._load_artifact("role_model.joblib")
        self.narrative_model = self._load_artifact("narrative_model.joblib")
        self.risk_model = self._load_artifact("risk_model.joblib")

        self.top_ngrams = self._load_top_ngrams()
        self.retriever = self._load_retriever()

    def _load_metadata(self) -> Dict:
        path = self.model_dir / "metadata.json"
        if not path.exists():
            raise FileNotFoundError("metadata.json is required in the model directory.")
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def _load_top_ngrams(self) -> Dict:
        path = self.reports_dir / "top_ngrams.json"
        if not path.exists():
            return {}
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def _load_artifact(self, filename: str):
        path = self.model_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Missing artifact: {path}")
        return joblib.load(path)

    def _load_retriever(self):
        vec_path = self.model_dir / "shared_tfidf.joblib"
        mat_path = self.model_dir / "train_tfidf_matrix.npz"
        idx_path = self.model_dir / "train_post_index.csv"
        if not (vec_path.exists() and mat_path.exists() and idx_path.exists()):
            return None
        vectorizer = joblib.load(vec_path)
        matrix = load_npz(mat_path)
        index_df = pd.read_csv(idx_path)
        return {"vectorizer": vectorizer, "matrix": matrix, "index": index_df}

    def _role_distribution(self, text: str) -> Dict[str, float]:
        raw_preds = self.role_model.predict([text]).reshape(1, -1)
        if np.any(raw_preds < 0) or not np.isclose(raw_preds.sum(axis=1), 1.0).all():
            probs = softmax(raw_preds, axis=1)
        else:
            probs = raw_preds
        dist = {bucket: float(probs[0, idx]) for idx, bucket in enumerate(self.role_buckets)}
        return dist

    def _narratives(self, text: str) -> Dict[str, Dict[str, object]]:
        probs = np.asarray(self.narrative_model.predict_proba([text]))
        results: Dict[str, Dict[str, object]] = {}
        for idx, label in enumerate(self.narrative_labels):
            prob = float(probs[0, idx])
            flag = prob >= 0.10
            results[label] = {"prob": prob, "flag": flag}
        return results

    def _risk_model_preds(self, text: str) -> Tuple[Dict[str, float], str]:
        probs = np.asarray(self.risk_model.predict_proba([text]))[0]
        model_classes = list(getattr(self.risk_model, "classes_", ["Helpful", "Harmless", "Harmful"]))
        expected_classes = ["Helpful", "Harmless", "Harmful"]
        prob_map = {label: 0.0 for label in expected_classes}
        for cls, prob in zip(model_classes, probs):
            prob_map[str(cls)] = float(prob)
        pred_idx = int(np.argmax(probs))
        pred = str(model_classes[pred_idx]) if model_classes else "Helpful"
        return prob_map, pred

    def _risk_rule_based(self, narratives: Dict[str, Dict[str, object]]) -> str:
        harmful_labels = {"toxic_culture", "elitism", "credibility_overclaim", "culture_misalignment"}
        if any(narratives.get(lbl, {}).get("flag") for lbl in harmful_labels):
            return "Harmful"
        if narratives.get("burnout", {}).get("flag"):
            return "Harmless"
        return "Helpful"

    def _similar_posts(self, text: str, k: int = 5) -> List[Dict[str, object]]:
        if not self.retriever:
            return []
        vectorizer = self.retriever["vectorizer"]
        matrix: csr_matrix = self.retriever["matrix"]
        index_df: pd.DataFrame = self.retriever["index"]
        query_vec = vectorizer.transform([text])
        sims = cosine_similarity(query_vec, matrix).ravel()
        top_idx = np.argsort(sims)[::-1][:k]
        results: List[Dict[str, object]] = []
        for idx in top_idx:
            row = index_df.iloc[int(idx)]
            results.append(
                {
                    "company": row.get("company", ""),
                    "post_url": row.get("post_url", ""),
                    "post_text_snippet": str(row.get("post_url", ""))[:160],
                    "score": float(sims[idx]),
                }
            )
        return results

    def _risk_top_ngrams(self, text: str, probs: Dict[str, float]) -> List[Dict[str, float]]:
        vec = get_vectorizer(self.risk_model)
        if vec is None:
            return []
        risk_clf = self.risk_model.named_steps.get("clf") if hasattr(self.risk_model, "named_steps") else None
        if risk_clf is None:
            return []
        coefs = choose_risk_coefficients(risk_clf, "Harmful")
        if coefs is None:
            return []
        vec_mat, feature_names = vectorize(text, vec)
        return top_contributions_from_vec(vec_mat, coefs, feature_names, top_k=8)

    def _narrative_top_ngrams(self, text: str) -> Dict[str, List[Dict[str, float]]]:
        vec = get_vectorizer(self.narrative_model)
        if vec is None:
            return {}
        clf = self.narrative_model.named_steps.get("clf") if hasattr(self.narrative_model, "named_steps") else None
        if clf is None or not hasattr(clf, "estimators_"):
            return {}
        vec_mat, feature_names = vectorize(text, vec)
        out: Dict[str, List[Dict[str, float]]] = {}
        for label, est in zip(self.narrative_labels, clf.estimators_):
            if not hasattr(est, "coef_"):
                continue
            coefs = np.asarray(est.coef_).ravel()
            out[label] = top_contributions_from_vec(vec_mat, coefs, feature_names, top_k=6)
        return out

    def _role_top_ngrams(self, text: str, top_roles: List[str]) -> Dict[str, List[Dict[str, float]]]:
        vec = get_vectorizer(self.role_model)
        if vec is None:
            return {}
        pipeline = self.role_model.pipeline if hasattr(self.role_model, "pipeline") else None
        if pipeline is None:
            return {}
        model = pipeline.named_steps.get("model")
        if model is None or not hasattr(model, "estimators_"):
            return {}
        vec_mat, feature_names = vectorize(text, vec)
        out: Dict[str, List[Dict[str, float]]] = {}
        bucket_to_est = {self.role_buckets[i]: est for i, est in enumerate(model.estimators_)}
        for role in top_roles:
            est = bucket_to_est.get(role)
            if est is None or not hasattr(est, "coef_"):
                continue
            coefs = np.asarray(est.coef_).ravel()
            out[role] = top_contributions_from_vec(vec_mat, coefs, feature_names, top_k=6)
        return out

    def _entropy(self, dist: Dict[str, float]) -> float:
        probs = np.clip(np.array(list(dist.values())), 1e-12, 1.0)
        probs = probs / probs.sum()
        return float(-np.sum(probs * np.log2(probs)))

    def analyze(self, request: AnalyzeRequest) -> Dict[str, object]:
        start = time.time()
        text = request.post_text.strip()
        if not text:
            raise ValueError("post_text cannot be empty or whitespace")

        narratives = self._narratives(text)
        role_dist = self._role_distribution(text)
        role_all = [{"role": k, "pct": round(v * 100, 4)} for k, v in role_dist.items()]
        role_top5 = sorted(role_all, key=lambda x: x["pct"], reverse=True)[:5]
        entropy_val = self._entropy(role_dist)

        risk_probs, risk_pred = self._risk_model_preds(text)
        rule_based = self._risk_rule_based(narratives)
        max_prob = max(risk_probs.values()) if risk_probs else 0.0
        if max_prob >= 0.75:
            risk_level = "High"
        elif max_prob >= 0.55:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        risk_top = self._risk_top_ngrams(text, risk_probs)
        narrative_top = self._narrative_top_ngrams(text)
        role_top = self._role_top_ngrams(text, [r["role"] for r in role_top5])

        primary_reason = "No strong harmful signals."
        if risk_top:
            primary_reason = f"Top harmful driver: {risk_top[0]['ngram']} ({risk_top[0]['weight']:+.3f})"

        latency_ms = int((time.time() - start) * 1000)
        timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        response = {
            "input_text": text,
            "audience": request.company_hint or None,
            "role_distribution_top5": role_top5,
            "role_distribution_all": role_all,
            "confidence_entropy": entropy_val,
            "risk": {
                "risk_class": rule_based,
                "risk_probs": risk_probs,
                "risk_level": risk_level,
                "primary_risk_reason": primary_reason,
            },
            "narratives": {
                "narrative_probs": {k: v["prob"] for k, v in narratives.items()},
                "narrative_flags": {k: v["flag"] for k, v in narratives.items()},
            },
            "evidence": {
                "risk_top_ngrams": risk_top,
                "narrative_top_ngrams": narrative_top,
                "role_top_ngrams": role_top,
            },
            "meta": {
                "model_dir_used": str(self.model_dir),
                "timestamp_iso": timestamp_iso,
                "latency_ms": latency_ms,
                "request_id": str(uuid.uuid4()),
            },
        }
        return response

    def compare(self, baseline_text: str, variant_text: str) -> Dict[str, object]:
        baseline_req = AnalyzeRequest(post_text=baseline_text)
        variant_req = AnalyzeRequest(post_text=variant_text)
        baseline = self.analyze(baseline_req)
        variant = self.analyze(variant_req)

        role_delta = {
            entry["role"]: round(
                next((v["pct"] for v in variant["role_distribution_all"] if v["role"] == entry["role"]), 0.0)
                - entry["pct"],
                4,
            )
            for entry in baseline["role_distribution_all"]
        }
        risk_delta = {
            k: round(variant["risk"]["risk_probs"].get(k, 0.0) - baseline["risk"]["risk_probs"].get(k, 0.0), 6)
            for k in ["Helpful", "Harmless", "Harmful"]
        }

        changed_phrases = self._compare_top_phrases(
            baseline["evidence"].get("risk_top_ngrams", []),
            variant["evidence"].get("risk_top_ngrams", []),
        )

        return {
            "baseline": baseline,
            "variant": variant,
            "delta": {
                "role_pct_delta": role_delta,
                "risk_prob_delta": risk_delta,
                "changed_top_phrases": changed_phrases,
            },
        }

    def _compare_top_phrases(
        self, baseline_phrases: List[Dict[str, float]], variant_phrases: List[Dict[str, float]]
    ) -> List[Dict[str, float]]:
        merged: Dict[str, float] = {}
        for item in baseline_phrases:
            merged[item["ngram"]] = merged.get(item["ngram"], 0.0) - item["weight"]
        for item in variant_phrases:
            merged[item["ngram"]] = merged.get(item["ngram"], 0.0) + item["weight"]
        items = [{"ngram": k, "weight": v} for k, v in merged.items()]
        items.sort(key=lambda x: abs(x["weight"]), reverse=True)
        return items[:10]


def load_predictor() -> Predictor:
    model_dir = Path(os.environ.get("MODEL_DIR", "output/models")).resolve()
    return Predictor(model_dir=model_dir)
