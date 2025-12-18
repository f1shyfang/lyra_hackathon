from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_recall_curve,
    r2_score,
)
from sklearn.model_selection import GroupKFold

from .utils import NARRATIVE_LABELS, ROLE_BUCKETS


RISK_LABELS = ["Helpful", "Harmless", "Harmful"]


def evaluate_role_model(model, df, plots_dir: Path) -> Tuple[Dict[str, Any], Dict[str, str]]:
    X_test = df["post_text"]
    y_true = df[ROLE_BUCKETS].to_numpy()
    y_pred = model.predict(X_test)

    r2_scores = {bucket: r2_score(y_true[:, idx], y_pred[:, idx]) for idx, bucket in enumerate(ROLE_BUCKETS)}
    mae_scores = {
        bucket: mean_absolute_error(y_true[:, idx], y_pred[:, idx]) for idx, bucket in enumerate(ROLE_BUCKETS)
    }
    metrics = {
        "r2": {**r2_scores, "macro": float(np.mean(list(r2_scores.values())))},
        "mae": {**mae_scores, "macro": float(np.mean(list(mae_scores.values())))},
    }

    plots_dir.mkdir(parents=True, exist_ok=True)
    plot_paths: Dict[str, str] = {}
    plot_paths["role_mean_distribution"] = str(
        _plot_role_mean_distribution(y_true, y_pred, plots_dir / "role_mean_distribution.png")
    )
    plot_paths["role_scatter_top6"] = str(_plot_role_scatter(y_true, y_pred, plots_dir / "role_scatter_top6.png"))
    return metrics, plot_paths


def evaluate_narrative_model(
    model,
    df,
    threshold: float,
    plots_dir: Path,
    top_k: int = 15,
) -> Tuple[Dict[str, Any], Dict[str, str], Dict[str, List[Dict[str, float]]]]:
    X_test = df["post_text"]
    y_true = df[NARRATIVE_LABELS].to_numpy()
    y_prob = np.asarray(model.predict_proba(X_test))
    y_pred = (y_prob >= threshold).astype(int)

    micro_f1 = f1_score(y_true, y_pred, average="micro", zero_division=0)
    macro_f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
    pr_auc = {}
    for idx, label in enumerate(NARRATIVE_LABELS):
        if y_true[:, idx].sum() == 0:
            pr_auc[label] = 0.0
        else:
            pr_auc[label] = float(average_precision_score(y_true[:, idx], y_prob[:, idx]))
    metrics = {
        "f1_micro": float(micro_f1),
        "f1_macro": float(macro_f1),
        "pr_auc": pr_auc,
    }

    plots_dir.mkdir(parents=True, exist_ok=True)
    pr_path = _plot_pr_curves(y_true, y_prob, plots_dir / "narrative_pr_curves.png")
    plot_paths = {"narrative_pr_curves": str(pr_path)}

    top_terms = extract_top_ngrams(model, NARRATIVE_LABELS, top_k=top_k)
    return metrics, plot_paths, top_terms


def evaluate_risk_model(model, df, plots_dir: Path) -> Tuple[Dict[str, Any], Dict[str, str]]:
    X_test = df["post_text"]
    y_true = df["risk_class_target"].astype(str).str.title()
    y_pred = model.predict(X_test)
    y_prob = np.asarray(model.predict_proba(X_test))

    acc = accuracy_score(y_true, y_pred)
    macro_f1 = f1_score(y_true, y_pred, average="macro")
    weighted_f1 = f1_score(y_true, y_pred, average="weighted")
    metrics = {
        "accuracy": float(acc),
        "f1_macro": float(macro_f1),
        "f1_weighted": float(weighted_f1),
    }

    plots_dir.mkdir(parents=True, exist_ok=True)
    cm_path = _plot_confusion(y_true, y_pred, plots_dir / "risk_confusion_matrix.png")
    plot_paths = {"risk_confusion_matrix": str(cm_path)}
    return metrics, plot_paths


def extract_top_ngrams(model, labels: List[str], top_k: int = 15) -> Dict[str, List[Dict[str, float]]]:
    tfidf = model.named_steps["tfidf"]
    clf = model.named_steps["clf"]
    feature_names = np.asarray(tfidf.get_feature_names_out())
    results: Dict[str, List[Dict[str, float]]] = {}
    for label, estimator in zip(labels, clf.estimators_):
        if not hasattr(estimator, "coef_"):
            results[label] = []
            continue
        coefs = estimator.coef_.ravel()
        top_idx = np.argsort(coefs)[::-1][:top_k]
        results[label] = [{"term": feature_names[i], "weight": float(coefs[i])} for i in top_idx]
    return results


def _plot_role_mean_distribution(y_true: np.ndarray, y_pred: np.ndarray, path: Path) -> Path:
    true_mean = y_true.mean(axis=0)
    pred_mean = y_pred.mean(axis=0)
    x = np.arange(len(ROLE_BUCKETS))
    width = 0.35
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.bar(x - width / 2, true_mean, width, label="True")
    ax.bar(x + width / 2, pred_mean, width, label="Predicted")
    ax.set_xticks(x)
    ax.set_xticklabels(ROLE_BUCKETS, rotation=45, ha="right")
    ax.set_ylabel("Mean share")
    ax.set_title("Role composition: true vs predicted mean distribution")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def _plot_role_scatter(y_true: np.ndarray, y_pred: np.ndarray, path: Path) -> Path:
    bucket_means = y_true.mean(axis=0)
    top_indices = np.argsort(bucket_means)[::-1][:6]
    n_plots = len(top_indices)
    cols = 3
    rows = int(np.ceil(n_plots / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(14, 8))
    axes = axes.flatten()
    for plot_idx, bucket_idx in enumerate(top_indices):
        ax = axes[plot_idx]
        ax.scatter(y_true[:, bucket_idx], y_pred[:, bucket_idx], s=12, alpha=0.6)
        ax.plot([0, 1], [0, 1], "k--", linewidth=1)
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_xlabel("True")
        ax.set_ylabel("Predicted")
        ax.set_title(ROLE_BUCKETS[bucket_idx])
    for extra_ax in axes[n_plots:]:
        extra_ax.axis("off")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def _plot_pr_curves(y_true: np.ndarray, y_prob: np.ndarray, path: Path) -> Path:
    fig, ax = plt.subplots(figsize=(10, 6))
    for idx, label in enumerate(NARRATIVE_LABELS):
        if y_true[:, idx].sum() == 0:
            precision, recall = [0.0, 0.0], [0.0, 1.0]
        else:
            precision, recall, _ = precision_recall_curve(y_true[:, idx], y_prob[:, idx])
        ax.plot(recall, precision, label=label)
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Narrative precision-recall curves")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def _plot_confusion(y_true, y_pred, path: Path) -> Path:
    cm = confusion_matrix(y_true, y_pred, labels=RISK_LABELS, normalize="true")
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, interpolation="nearest")
    ax.set_xticks(range(len(RISK_LABELS)))
    ax.set_yticks(range(len(RISK_LABELS)))
    ax.set_xticklabels(RISK_LABELS, rotation=45, ha="right")
    ax.set_yticklabels(RISK_LABELS)
    ax.set_ylabel("True label")
    ax.set_xlabel("Predicted label")
    ax.set_title("Risk class confusion matrix (normalized)")
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, f"{cm[i, j]:.2f}", ha="center", va="center", color="white" if cm[i, j] > 0.5 else "black")
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def run_group_cv_role(model_builder, df, n_splits: int = 5) -> Dict[str, float]:
    groups = df["company"]
    splits = _effective_splits(groups, n_splits)
    if splits < 2:
        return {}
    cv = GroupKFold(n_splits=splits)
    maes = []
    for train_idx, val_idx in cv.split(df, groups=groups):
        model = model_builder()
        X_train, X_val = df.iloc[train_idx]["post_text"], df.iloc[val_idx]["post_text"]
        y_train = df.iloc[train_idx][ROLE_BUCKETS]
        y_val = df.iloc[val_idx][ROLE_BUCKETS].to_numpy()
        model.fit(X_train, y_train)
        preds = model.predict(X_val)
        mae_scores = [mean_absolute_error(y_val[:, i], preds[:, i]) for i in range(len(ROLE_BUCKETS))]
        maes.append(float(np.mean(mae_scores)))
    return {"mae_macro_cv": float(np.mean(maes))} if maes else {}


def run_group_cv_narrative(model_builder, df, threshold: float, n_splits: int = 5) -> Dict[str, float]:
    groups = df["company"]
    splits = _effective_splits(groups, n_splits)
    if splits < 2:
        return {}
    cv = GroupKFold(n_splits=splits)
    macro_f1_scores = []
    for train_idx, val_idx in cv.split(df, groups=groups):
        model = model_builder()
        X_train, X_val = df.iloc[train_idx]["post_text"], df.iloc[val_idx]["post_text"]
        y_train = df.iloc[train_idx][NARRATIVE_LABELS]
        y_val = df.iloc[val_idx][NARRATIVE_LABELS].to_numpy()
        model.fit(X_train, y_train)
        probs = np.asarray(model.predict_proba(X_val))
        preds = (probs >= threshold).astype(int)
        macro_f1_scores.append(float(f1_score(y_val, preds, average="macro", zero_division=0)))
    return {"f1_macro_cv": float(np.mean(macro_f1_scores))} if macro_f1_scores else {}


def run_group_cv_risk(model_builder, df, n_splits: int = 5) -> Dict[str, float]:
    groups = df["company"]
    splits = _effective_splits(groups, n_splits)
    if splits < 2:
        return {}
    cv = GroupKFold(n_splits=splits)
    macro_f1_scores = []
    for train_idx, val_idx in cv.split(df, groups=groups):
        model = model_builder()
        X_train, X_val = df.iloc[train_idx]["post_text"], df.iloc[val_idx]["post_text"]
        y_train = df.iloc[train_idx]["risk_class_target"].astype(str).str.title()
        y_val = df.iloc[val_idx]["risk_class_target"].astype(str).str.title()
        model.fit(X_train, y_train)
        preds = model.predict(X_val)
        macro_f1_scores.append(float(f1_score(y_val, preds, average="macro")))
    return {"f1_macro_cv": float(np.mean(macro_f1_scores))} if macro_f1_scores else {}


def _effective_splits(groups, desired: int) -> int:
    unique_groups = np.unique(groups)
    if len(unique_groups) < 2:
        return 0
    return max(2, min(desired, len(unique_groups)))
