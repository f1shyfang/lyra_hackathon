export type AnalyzeRequest = {
  post_text: string
  company_hint?: string
  variant_id?: 'A' | 'B'
  user_id?: string
}

export type RoleDistributionItem = {
  role: string
  pct: number
}

export type RiskResult = {
  risk_class: 'Helpful' | 'Harmless' | 'Harmful'
  risk_probs: {
    Helpful: number
    Harmless: number
    Harmful: number
  }
  risk_level: 'High' | 'Medium' | 'Low'
  primary_risk_reason: string
}

export type NarrativeResult = {
  prob: number
  flag: boolean
}

export type AnalyzeResponse = {
  input_text: string
  audience: string | null
  role_distribution_top5: RoleDistributionItem[]
  role_distribution_all: RoleDistributionItem[]
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
