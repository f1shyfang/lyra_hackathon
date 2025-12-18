from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field, validator


class AnalyzeRequest(BaseModel):
    post_text: str = Field(..., min_length=1)
    company_hint: Optional[str] = None
    variant_id: Optional[str] = Field(default=None, pattern="^(A|B)$")
    user_id: Optional[str] = None

    @validator("post_text")
    def trim_text(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("post_text cannot be empty or whitespace")
        return cleaned


class CompareRequest(BaseModel):
    baseline_text: str
    variant_text: str

    @validator("baseline_text", "variant_text")
    def trim(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("text cannot be empty or whitespace")
        return cleaned


class Contribution(BaseModel):
    ngram: str
    weight: float


class AnalyzeResponse(BaseModel):
    input_text: str
    audience: Optional[str]
    role_distribution_top5: List[Dict[str, float]]
    role_distribution_all: List[Dict[str, float]]
    confidence_entropy: float
    risk: Dict[str, object]
    narratives: Dict[str, object]
    evidence: Dict[str, object]
    meta: Dict[str, object]
