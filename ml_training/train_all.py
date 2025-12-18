from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict

import joblib

from . import data_loader
from . import eval as eval_utils
from .models import build_narrative_model, build_risk_model, build_role_model
from .retriever import build_retriever_artifacts
from .utils import (
    DEFAULT_SEED,
    NARRATIVE_LABELS,
    NARRATIVE_THRESHOLD,
    ROLE_BUCKETS,
    ROLE_MIN_COMMENTS,
    NARRATIVE_MIN_COMMENTS,
    configure_logging,
    save_json,
    set_seed,
    safe_mkdir,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train ML models for the Lyra Recruiting Signal Engine.")
    parser.add_argument("--data_dir", type=str, default="data", help="Directory containing processed CSV files.")
    parser.add_argument("--output_dir", type=str, default="output", help="Directory to store artifacts and reports.")
    parser.add_argument(
        "--holdout_company",
        type=str,
        default="meta",
        help="Company to hold out for evaluation.",
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed for reproducibility.")
    parser.add_argument(
        "--disable_cv",
        action="store_true",
        help="Skip GroupKFold sanity checks to save time.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logger = configure_logging()
    set_seed(args.seed)

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    models_dir = output_dir / "models"
    reports_dir = output_dir / "reports"
    plots_dir = reports_dir / "plots"
    for directory in [models_dir, reports_dir, plots_dir]:
        safe_mkdir(directory)

    logger.info("Loading datasets with holdout=%s", args.holdout_company)
    bundle = data_loader.load_datasets(data_dir=str(data_dir), holdout_company=args.holdout_company, seed=args.seed)

    tfidf_params: Dict[str, Any] = {
        "ngram_range": (1, 2),
        "min_df": 2,
        "max_df": 0.95,
        "max_features": 30000,
    }

    # Role composition model.
    logger.info("Training role composition model on %d samples", len(bundle.role_train))
    role_model = build_role_model(tfidf_params=tfidf_params)
    role_model.fit(bundle.role_train["post_text"], bundle.role_train[ROLE_BUCKETS])
    role_metrics, role_plots = eval_utils.evaluate_role_model(role_model, bundle.role_test, plots_dir)
    role_cv = {}
    if not args.disable_cv:
        logger.info("Running GroupKFold CV for role model")
        role_cv = eval_utils.run_group_cv_role(lambda: build_role_model(tfidf_params=tfidf_params), bundle.role_train)
    joblib.dump(role_model, models_dir / "role_model.joblib")

    # Narrative model.
    logger.info("Training narrative model on %d samples", len(bundle.narrative_train))
    narrative_model = build_narrative_model(tfidf_params=tfidf_params, random_state=args.seed)
    narrative_model.fit(bundle.narrative_train["post_text"], bundle.narrative_train[NARRATIVE_LABELS])
    narrative_metrics, narrative_plots, top_terms = eval_utils.evaluate_narrative_model(
        narrative_model,
        bundle.narrative_test,
        threshold=0.5,
        plots_dir=plots_dir,
    )
    narrative_cv = {}
    if not args.disable_cv:
        logger.info("Running GroupKFold CV for narrative model")
        narrative_cv = eval_utils.run_group_cv_narrative(
            lambda: build_narrative_model(tfidf_params=tfidf_params, random_state=args.seed),
            bundle.narrative_train,
            threshold=0.5,
        )
    joblib.dump(narrative_model, models_dir / "narrative_model.joblib")

    # Risk model.
    logger.info("Training risk model on %d samples", len(bundle.risk_train))
    risk_model = build_risk_model(tfidf_params=tfidf_params, random_state=args.seed)
    risk_model.fit(bundle.risk_train["post_text"], bundle.risk_train["risk_class_target"])
    risk_metrics, risk_plots = eval_utils.evaluate_risk_model(risk_model, bundle.risk_test, plots_dir)
    risk_cv = {}
    if not args.disable_cv:
        logger.info("Running GroupKFold CV for risk model")
        risk_cv = eval_utils.run_group_cv_risk(
            lambda: build_risk_model(tfidf_params=tfidf_params, random_state=args.seed),
            bundle.risk_train,
        )
    joblib.dump(risk_model, models_dir / "risk_model.joblib")

    # Retriever artifacts.
    logger.info("Building TF-IDF retriever index")
    build_retriever_artifacts(bundle.retriever_train_posts, output_dir=output_dir, tfidf_params=tfidf_params)

    _save_reports(
        reports_dir=reports_dir,
        models_dir=models_dir,
        bundle=bundle,
        role_metrics=role_metrics,
        role_plots=role_plots,
        role_cv=role_cv,
        narrative_metrics=narrative_metrics,
        narrative_plots=narrative_plots,
        narrative_cv=narrative_cv,
        top_terms=top_terms,
        risk_metrics=risk_metrics,
        risk_plots=risk_plots,
        risk_cv=risk_cv,
        holdout_company=args.holdout_company,
        tfidf_params=tfidf_params,
    )

    _print_run_checklist(logger, output_dir, args.holdout_company)
    logger.info("Done. Artifacts saved to %s", output_dir.resolve())


def _save_reports(
    reports_dir: Path,
    models_dir: Path,
    bundle: data_loader.DatasetBundle,
    role_metrics: Dict[str, Any],
    role_plots: Dict[str, str],
    role_cv: Dict[str, Any],
    narrative_metrics: Dict[str, Any],
    narrative_plots: Dict[str, str],
    narrative_cv: Dict[str, Any],
    top_terms: Dict[str, Any],
    risk_metrics: Dict[str, Any],
    risk_plots: Dict[str, str],
    risk_cv: Dict[str, Any],
    holdout_company: str,
    tfidf_params: Dict[str, Any],
) -> None:
    metrics_payload = {
        "role": {"test": role_metrics, "cv": role_cv, "plots": role_plots},
        "narrative": {"test": narrative_metrics, "cv": narrative_cv, "plots": narrative_plots},
        "risk": {"test": risk_metrics, "cv": risk_cv, "plots": risk_plots},
    }
    save_json(reports_dir / "metrics.json", metrics_payload)
    save_json(reports_dir / "split_manifest.json", bundle.split_manifest)
    save_json(reports_dir / "top_ngrams.json", top_terms)

    metadata = {
        "role_buckets": ROLE_BUCKETS,
        "narrative_labels": NARRATIVE_LABELS,
        "narrative_threshold": 0.5,
        "narrative_share_threshold": NARRATIVE_THRESHOLD,
        "holdout_company": holdout_company,
        "min_comments": {"role": ROLE_MIN_COMMENTS, "narrative": NARRATIVE_MIN_COMMENTS},
        "tfidf_params": tfidf_params,
    }
    save_json(models_dir / "metadata.json", metadata)


def _print_run_checklist(logger, output_dir: Path, holdout_company: str) -> None:
    logger.info("Run checklist:")
    logger.info(" - Verify holdout company: %s", holdout_company)
    logger.info(" - Confirm models saved in %s", (output_dir / 'models').resolve())
    logger.info(" - Confirm reports saved in %s", (output_dir / 'reports').resolve())
    logger.info(" - Ensure plots exist under %s", (output_dir / 'reports' / 'plots').resolve())
    logger.info("Common failure reasons:")
    logger.info(" - Missing required CSV columns (check data schema).")
    logger.info(" - Empty or whitespace-only post_text rows dropped, reducing training size.")
    logger.info(" - Holdout company mismatch with available datasets.")


if __name__ == "__main__":
    main()
