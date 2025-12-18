export type AnalyzeRequest = {
  post_text: string
  company_hint?: string
  variant_id?: 'A' | 'B'
  user_id?: string
}

export type RoleDistribution = Record<string, number>

export type NarrativeResult = {
  prob: number
  flag: boolean
}

export type NarrativeResults = Record<string, NarrativeResult>

export type RiskModelResult = {
  probs: Record<'Helpful' | 'Harmless' | 'Harmful', number> | Record<string, number>
  pred: string
}

export type RiskResult = {
  final_class: 'Helpful' | 'Harmless' | 'Harmful'
  rule_based_class: 'Helpful' | 'Harmless' | 'Harmful'
  model_based: RiskModelResult
}

export type EvidencePost = {
  company: string
  post_url: string
  post_text_snippet: string
  score: number
}

export type AnalyzeResponse = {
  role_distribution: RoleDistribution
  narratives: NarrativeResults
  risk: RiskResult
  reasons: string[]
  evidence: { similar_posts: EvidencePost[] }
  explainability: {
    top_ngrams: {
      role_model?: { ngram: string; weight: number }[]
      risk_model?: { ngram: string; weight: number }[]
      narratives?: Record<string, { ngram: string; weight: number }[]>
    }
  }
  meta: {
    request_id: string
    latency_ms: number
    timestamp: string
  }
}
