'use client'

import { useState } from 'react'
import { AnalyzeRequest, AnalyzeResponse } from '@/types/analyze'
import { RoleCompositionPanel } from './RoleCompositionPanel'
import { RiskAssessmentPanel } from './RiskAssessmentPanel'

export function DraftAnalyzer() {
  const [draftText, setDraftText] = useState('')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!draftText.trim()) {
      setError('Please enter a draft post')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const request: AnalyzeRequest = {
        post_text: draftText,
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data: AnalyzeResponse = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze draft')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <label htmlFor="draft-input" className="block text-lg font-semibold mb-3 text-slate-200">
          Your LinkedIn Draft
        </label>
        <textarea
          id="draft-input"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="Paste your LinkedIn post draft here..."
          className="w-full h-48 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
          disabled={loading}
        />
        
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !draftText.trim()}
          className="mt-6 w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-full font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200"
        >
          {loading ? 'Analyzing...' : 'Analyze Your Draft'}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <RoleCompositionPanel roles={result.role_distribution_top5} />
          <RiskAssessmentPanel risk={result.risk} />
        </div>
      )}
    </div>
  )
}
