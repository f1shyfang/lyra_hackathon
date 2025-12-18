'use client'

import { useState } from 'react'
import { analyzeText } from '@/lib/api/ml'
import { AnalyzeResponse } from '@/types/ml'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { ProbabilityBars } from '../components/ProbabilityBars'
import { RoleBars } from '../components/RoleBars'
import { NarrativeList } from '../components/NarrativeList'
import { ImageUpload, UploadedImage, prepareImagesForAPI } from '../components/ImageUpload'

export default function AnalyzePage() {
  const [draftText, setDraftText] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contrastMode, setContrastMode] = useState(false)

  const handleAnalyze = async () => {
    if (!draftText.trim()) {
      setError('Please enter a draft post')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // If images are attached, use the image-aware API
      if (images.length > 0) {
        const preparedImages = await prepareImagesForAPI(images)
        const response = await fetch('/api/analyze-with-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft_text: draftText,
            images: preparedImages,
          }),
        })
        
        if (!response.ok) {
          throw new Error('Analysis failed')
        }
        
        const data = await response.json()
        // Map the response to match AnalyzeResponse structure
        setResult({
          role_distribution_all: data.predictions.role_distribution_top5,
          role_distribution_top5: data.predictions.role_distribution_top5,
          risk: data.predictions.risk,
          narratives: {
            narrative_probs: Object.fromEntries(
              data.predictions.narratives.map((n: any) => [n.name, n.prob])
            ),
          },
        } as AnalyzeResponse)
      } else {
        // No images, use regular API
        const data = await analyzeText(draftText)
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze draft')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">Analyze Draft</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            See who your words attract before you publish.
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-purple-500/10">
            <label htmlFor="draft-input" className="block text-lg font-semibold mb-3 text-white">
              Your LinkedIn Draft
            </label>
            <textarea
              id="draft-input"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Paste your LinkedIn post draft here..."
              className="w-full h-48 bg-black/30 border border-white/10 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
              disabled={loading}
            />

            <div className="mt-4">
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={4}
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleAnalyze}
                disabled={loading || !draftText.trim()}
                className="px-8 py-3 bg-white text-black hover:bg-slate-100 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed rounded-full font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200"
              >
                {loading ? 'Analyzing...' : 'Analyze Draft'}
              </button>

              {result && (
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contrastMode}
                    onChange={(e) => setContrastMode(e.target.checked)}
                    className="rounded"
                  />
                  Contrast Mode
                </label>
              )}
            </div>
          </div>

          {loading && <LoadingSkeleton />}

          {result && !loading && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-purple-500/10">
                <h2 className="text-2xl font-bold mb-6 text-white">
                  Recruiting Risk
                </h2>
                
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`px-4 py-2 rounded-full border font-semibold ${
                      result.risk.risk_class === 'Helpful'
                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                        : result.risk.risk_class === 'Harmless'
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                        : 'bg-red-500/20 border-red-500/50 text-red-300'
                    }`}>
                      {result.risk.risk_class}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {result.risk.risk_level} confidence
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    {result.risk.primary_risk_reason}
                  </p>
                </div>

                <ProbabilityBars probs={result.risk.risk_probs} contrastMode={contrastMode} />
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-purple-500/10">
                <h2 className="text-2xl font-bold mb-6 text-white">
                  Who This Attracts
                </h2>
                <p className="text-slate-400 mb-6">
                  Top roles drawn to this post
                </p>
                <RoleBars roles={result.role_distribution_all} contrastMode={contrastMode} maxVisible={5} />
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-purple-500/10">
                <h2 className="text-2xl font-bold mb-6 text-white">
                  Narrative Signals
                </h2>
                <p className="text-slate-400 mb-6">
                  Strongest detected signals
                </p>
                <NarrativeList 
                  narratives={Object.entries(result.narratives.narrative_probs).map(([name, prob]) => ({ name, prob }))} 
                  topOnly={true} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
