from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path("output") / "history.sqlite"


def _ensure_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at_iso TEXT NOT NULL,
            mode TEXT NOT NULL,
            baseline_text TEXT,
            variant_text TEXT,
            response_json TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


CONN = _ensure_db()


def insert_run(
    mode: str,
    response: Dict[str, Any],
    baseline_text: Optional[str] = None,
    variant_text: Optional[str] = None,
) -> None:
    conn = CONN
    conn.execute(
        """
        INSERT INTO runs (created_at_iso, mode, baseline_text, variant_text, response_json)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            response.get("meta", {}).get("timestamp_iso") or response.get("meta", {}).get("timestamp"),
            mode,
            baseline_text,
            variant_text,
            json.dumps(response),
        ),
    )
    conn.commit()


def fetch_history(limit: int = 50) -> List[Dict[str, Any]]:
    conn = CONN
    cur = conn.execute(
        """
        SELECT id, created_at_iso, mode, baseline_text, variant_text, response_json
        FROM runs
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = cur.fetchall()
    results: List[Dict[str, Any]] = []
    for row in rows:
        rid, created, mode, baseline, variant, resp = row
        try:
            resp_obj = json.loads(resp)
        except json.JSONDecodeError:
            resp_obj = resp
        results.append(
            {
                "id": rid,
                "created_at_iso": created,
                "mode": mode,
                "baseline_text": baseline,
                "variant_text": variant,
                "response": resp_obj,
            }
        )
    return results
