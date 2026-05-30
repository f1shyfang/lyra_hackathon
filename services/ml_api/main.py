from __future__ import annotations

import logging
import os
import traceback
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .predictor import load_predictor
from .schemas import AnalyzeRequest, CompareRequest
from .db import insert_run, fetch_history

logger = logging.getLogger("ml_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI(title="Lyra ML API", version="0.2.0")

frontend_origin = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
allowed_origins = {
    frontend_origin,
    frontend_origin.replace("3000", "3001"),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


try:
    predictor = load_predictor()
    logger.info("Models loaded successfully from %s", os.environ.get("MODEL_DIR", "output/models"))
except Exception as exc:  # pragma: no cover - startup failure path
    predictor = None
    logger.error("Failed to load models: %s", exc)
    logger.debug(traceback.format_exc())


@app.get("/health")
def health():
    if predictor is None:
        raise HTTPException(status_code=500, detail="Models not loaded")
    return {"status": "ok", "models_loaded": True}


@app.post("/analyze")
def analyze(request: AnalyzeRequest, save: bool = Query(default=True)):
    if predictor is None:
        raise HTTPException(status_code=500, detail="Models not loaded")
    try:
        result = predictor.analyze(request)
        if save:
            insert_run(mode="analyze", response=result, baseline_text=request.post_text)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.error("Prediction failed: %s", exc)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Prediction failed")


@app.post("/analyze/compare")
def compare(request: CompareRequest, save: bool = Query(default=True)):
    if predictor is None:
        raise HTTPException(status_code=500, detail="Models not loaded")
    try:
        result = predictor.compare(request.baseline_text, request.variant_text)
        if save:
            insert_run(
                mode="compare",
                response=result,
                baseline_text=request.baseline_text,
                variant_text=request.variant_text,
            )
        return JSONResponse(content=result)
    except Exception as exc:
        logger.error("Compare failed: %s", exc)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Compare failed")


@app.get("/history")
def history(limit: int = Query(default=50, ge=1, le=200)):
    try:
        rows = fetch_history(limit=limit)
        return JSONResponse(content={"rows": rows, "count": len(rows)})
    except Exception as exc:
        logger.error("History fetch failed: %s", exc)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail="History fetch failed")


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
