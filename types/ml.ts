export type RoleComposition = {
  role: string
  pct: number
}

export type RiskClassification = 'Helpful' | 'Harmless' | 'Harmful'

export type RiskResult = {
  risk_class: RiskClassification
  risk_probs: {
    Helpful: number
    Harmless: number
    Harmful: number
  }
  risk_level: 'High' | 'Medium' | 'Low'
  primary_risk_reason: string
}

export type Narrative = {
  name: string
  prob: number
}

export type AnalyzeResponse = {
  input_text: string
  audience: string | null
  role_distribution_top5: RoleComposition[]
  role_distribution_all: RoleComposition[]
  confidence_entropy: number
  risk: RiskResult
  narratives: {
    narrative_probs: Record<string, number>
    narrative_flags: Record<string, boolean>
  }
  evidence: {
    risk_top_ngrams: { ngram: string; weight: number }[]
    narrative_top_ngrams: Record<string, { ngram: string; weight: number }[]>
    role_top_ngrams: Record<string, { ngram: string; weight: number }[]>
  }
  meta: {
    model_dir_used: string
    timestamp_iso: string
    latency_ms: number
    request_id: string
  }
}

export type CompareResponse = {
  baseline: AnalyzeResponse
  variant: AnalyzeResponse
  delta: {
    role_deltas: Record<string, number>
    risk_prob_deltas: {
      Helpful: number
      Harmless: number
      Harmful: number
    }
    narrative_deltas: Record<string, number>
  }
}
