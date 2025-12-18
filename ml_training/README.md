Lyra Recruiting Signal Engine (ML)
==================================

This folder contains a standalone training + evaluation pipeline. It does not modify any existing app code.

Quickstart
----------
- Install deps (optional virtualenv recommended):
  `pip install -r ml_training/requirements_ml.txt`
- Run full train/eval (holds out Meta by default):
  `python -m ml_training.train_all --data_dir data --output_dir output --holdout_company meta`
- Switch holdout company (e.g., Lyra):
  `python -m ml_training.train_all --data_dir data --output_dir output --holdout_company lyra`
- Skip GroupKFold sanity checks if you need a faster run:
  `python -m ml_training.train_all --disable_cv`

What it does
------------
- Loads `{company}_posts_training.csv` and `{company}_comments_enriched_full.csv`.
- Canonicalizes `post_url`, enforces required schema, drops empty `post_text`.
- Builds role distributions from comment role buckets and narrative flags from comment narratives (fallback to pct_toxic_burnout when comments are missing).
- Splits by company: train on all except `--holdout_company`; test on holdout only.
- Trains three text-only models (TF-IDF word 1–2 grams):
  - Role composition: MultiOutputRegressor(RidgeCV) with softmax outputs.
  - Narrative: One-vs-Rest LogisticRegression (balanced).
  - Risk class: Calibrated LogisticRegression (balanced).
- Evaluates on the holdout company + GroupKFold(train) sanity checks.
- Builds a TF-IDF retriever over training posts for similar-past-post lookup.

Outputs
-------
- `output/models/role_model.joblib` — role distribution predictor (TF-IDF + ridge + softmax).
- `output/models/narrative_model.joblib` — narrative multi-label classifier.
- `output/models/risk_model.joblib` — risk multi-class classifier.
- `output/models/shared_tfidf.joblib`, `train_tfidf_matrix.npz`, `train_post_index.csv` — retriever artifacts.
- `output/models/metadata.json` — bucket/label order, thresholds, holdout company, TF-IDF params.
- `output/reports/metrics.json` — test + CV metrics and plot paths.
- `output/reports/split_manifest.json` — per-company row counts post-filtering.
- `output/reports/top_ngrams.json` — top positive n-grams per narrative label.
- `output/reports/plots/` — role distribution bars + scatter, narrative PR curves, risk confusion matrix.

Retriever helper
----------------
`ml_training.retriever.get_similar_posts(draft_text: str, k: int = 3)` loads saved artifacts and returns the top-k most similar training posts (cosine similarity) with their observed outcomes.

Common failure reasons
----------------------
- Missing required CSV columns or files; the loader fails loudly in this case.
- Empty/whitespace `post_text` rows get dropped, reducing available samples.
- Holdout company name not present in `data/`.
- Role distribution requires `{company}_comments_enriched_full.csv`; ensure it exists.
