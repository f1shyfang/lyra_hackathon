# Deploying the Lyra ML API to Render

This is the FastAPI backend (`services/ml_api`) — a **provider-free TF-IDF
recruiting-signal engine**. It needs no AI provider key and no external database:
the trained model artifacts live in `output/models/` (committed to the repo) and
request/response logging uses local sqlite.

## What ships

| File | Purpose |
|------|---------|
| `render.yaml` | Render Blueprint — defines the web service, build/start commands, health check, env vars. |
| `services/ml_api/requirements.txt` | Python deps for the API. |
| `output/models/*` | Trained TF-IDF models + metadata (`metadata.json`, `*.joblib`, `train_tfidf_matrix.npz`, …). |

The Blueprint provisions a single web service named **`lyra-ml-api`** on the
Render **free** plan, running:

```
gunicorn services.ml_api.main:app -k uvicorn.workers.UvicornWorker
```

(bound to `$PORT`, `${WEB_CONCURRENCY:-1}` workers, `/health` health check).

## One-time setup

1. Push this repo to GitHub.
2. In Render: **New +** → **Blueprint** → select the repo. Render reads `render.yaml`.
3. (Recommended) Set **`FRONTEND_ORIGIN`** to your deployed frontend origin so the
   browser can reach the API directly if needed (the app normally calls it
   server-side via `app/api/analyze`, so CORS rarely matters in production).
4. Deploy. Render runs the health check against `/health`; the service only
   reports healthy once the models have loaded.

> No secrets are required — there is no AI provider key for this service.

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `MODEL_DIR` | | `output/models` | Directory holding the trained TF-IDF artifacts. |
| `FRONTEND_ORIGIN` | | `http://localhost:3000` | Frontend origin allowed by CORS. Mainly matters if the browser hits the API directly. |
| `WEB_CONCURRENCY` | | `1` | gunicorn workers. Each worker loads the models — raise only after checking memory. |
| `PORT` | (Render-injected) | `8000` | Bound automatically by the start command. |
| `PYTHON_VERSION` | | `3.12.3` | Pins the Python runtime for the build. |

## Verify after deploy

```bash
curl https://<your-service>.onrender.com/health
# -> {"status":"ok","models_loaded":true}

curl -X POST https://<your-service>.onrender.com/analyze \
  -H 'Content-Type: application/json' \
  -d '{"post_text":"We are scaling our AI team fast. Expect late nights but huge impact."}'
```

Interactive docs: `https://<your-service>.onrender.com/docs`

## Run locally

```bash
python -m venv venv && source venv/bin/activate
pip install -r services/ml_api/requirements.txt
# dev server on :8000 (reads PORT/MODEL_DIR from env)
python -m services.ml_api.main
# or, mirror production:
gunicorn services.ml_api.main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## Wiring the Next.js frontend

The frontend never calls the FastAPI service directly. Instead:

- The app POSTs to the same-origin route `app/api/analyze`.
- `app/api/analyze` forwards the request to `${ML_API_URL}/analyze`.

So you only set **one** env var on the Next.js host (e.g. Vercel):

```
ML_API_URL=https://<your-service>.onrender.com
```

Locally, `ML_API_URL` defaults to `http://localhost:8000`. Run both together
with `npm run dev` (starts `next dev` + `uvicorn services.ml_api.main:app` via
`concurrently`).
