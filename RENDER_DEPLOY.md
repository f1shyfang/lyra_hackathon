# Deploying the PR Sentiment API to Render

This is the FastAPI backend (`api.py` + `prediction_service.py`) that serves the
trained LinkedIn PR sentiment classifier. The trained artifacts live in
`output/` and are committed to the repo, so no external storage is needed.

## What ships

| File | Purpose |
|------|---------|
| `render.yaml` | Render Blueprint — defines the web service, build/start commands, health check, env vars. |
| `Procfile` | Same start command, for non-Blueprint / generic buildpack deploys. |
| `runtime.txt` | Pins Python 3.12.3. |
| `requirements_api.txt` | Python deps (scikit-learn pinned to **1.6.1** to match the pickled model). |
| `output/*.pkl`, `output/*.npy` | Trained model + scaler + encoders. |

## One-time setup

1. Push this branch to GitHub.
2. In Render: **New +** → **Blueprint** → select the repo. Render reads `render.yaml`.
3. Set the **`GEMINI_API_KEY`** secret in the dashboard (it's `sync: false`, so it is
   never stored in the repo). Get a key at https://aistudio.google.com/app/apikey.
4. (Recommended) Set **`ALLOWED_ORIGINS`** to your frontend origin(s),
   comma-separated, instead of `*`.
5. Deploy. Render runs the health check against `/health`; the service only
   reports healthy once the model has loaded.

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `GEMINI_API_KEY` | ✅ | — | App refuses to start without it (fail-fast). |
| `MODEL_DIR` | | `output` | Directory holding the `.pkl`/`.npy` artifacts. |
| `ALLOWED_ORIGINS` | | `*` | Comma-separated origins. With `*`, credentials are disabled (CORS spec). |
| `WEB_CONCURRENCY` | | `1` | gunicorn workers. Each worker loads the model — raise only after checking memory. |
| `LOG_LEVEL` | | `INFO` | |
| `RATE_LIMIT_PREDICT` | | `30/minute` | Per-IP limit on `POST /predict` (slowapi/limits syntax, e.g. `100/hour`, `5/second`). Over-limit requests get a 429. |
| `RATELIMIT_STORAGE_URI` | | (in-memory) | Shared rate-limit store, e.g. `redis://host:6379/0`. Without it the store is per-process — see caveat below. |
| `PORT` | (Render-injected) | `8000` | Bound automatically by the start command. |

> **Rate-limit caveat:** the default store is in-memory **per gunicorn worker**, so
> with `WEB_CONCURRENCY` = N the effective global limit is roughly N× the
> configured `RATE_LIMIT_PREDICT`. Set `RATELIMIT_STORAGE_URI` to a shared Redis
> instance for a single, consistent global limit across all workers and instances.

## Verify after deploy

```bash
curl https://<your-service>.onrender.com/health
curl -X POST https://<your-service>.onrender.com/predict \
  -H 'Content-Type: application/json' \
  -d '{"text":"Excited to announce our new platform! #AI","has_media":1,"media_count":1}'
```

Interactive docs: `https://<your-service>.onrender.com/docs`

## Run locally

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements_api.txt
export GEMINI_API_KEY=your-key
python api.py            # dev server on :8000 (set PORT/RELOAD to override)
# or, mirror production:
gunicorn api:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## Wiring the Next.js frontend

The frontend never calls the FastAPI service directly. Instead:

- `app/sentiment-analyzer/page.tsx` POSTs to the same-origin route `/api/predict`.
- `app/api/predict/route.ts` forwards the request to `${ML_API_URL}/predict`.

So you only set **one** env var on the Next.js host (e.g. Vercel):

```
ML_API_URL=https://<your-service>.onrender.com
```

Locally, `ML_API_URL` defaults to `http://localhost:8000`. Run both together
with `npm run dev` (starts `next dev` + `uvicorn api:app` via `concurrently`),
which also needs `GEMINI_API_KEY` exported for the Python side.

## Model caveat (read before demoing)

The model currently in `output/` is the **full-embedding (768-dim) classifier**
— the PCA/regularization fixes described in `FIXES_APPLIED.md` were *documented
but never saved* (`pca_reducer.pkl` is absent, and the saved model reports 784
input features = 768 embeddings + 16 metadata). It therefore still carries the
documented overfitting (~84% train / ~45% test). The serving pipeline is
correct and dimensionally consistent; if you re-run the notebook to actually
apply PCA, save `pca_reducer.pkl` into `output/` and the service will pick it up
automatically (it already branches on the file's presence).
