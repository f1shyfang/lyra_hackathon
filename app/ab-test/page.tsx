'use client'

import { useState } from 'react'
import { compareTexts } from '@/lib/api/ml'
import { CompareResponse } from '@/types/ml'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { ProbabilityBars } from '../components/ProbabilityBars'
import { RoleBars } from '../components/RoleBars'
import { NarrativeList } from '../components/NarrativeList'
import { SignalMovement } from '../components/SignalMovement'
import { ImageUpload, UploadedImage, prepareImagesForAPI } from '../components/ImageUpload'

export default function ABTestPage() {
  const [draftA, setDraftA] = useState('')
  const [draftB, setDraftB] = useState('')
  const [imagesA, setImagesA] = useState<UploadedImage[]>([])
  const [imagesB, setImagesB] = useState<UploadedImage[]>([])
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contrastMode, setContrastMode] = useState(false)

  const handleCompare = async () => {
    if (!draftA.trim() || !draftB.trim()) {
      setError('Please enter both drafts')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Check if either draft has images
      const hasImagesA = imagesA.length > 0
      const hasImagesB = imagesB.length > 0

      if (hasImagesA || hasImagesB) {
        // Use image-aware API for both
        const [preparedA, preparedB] = await Promise.all([
          hasImagesA ? prepareImagesForAPI(imagesA) : Promise.resolve([]),
          hasImagesB ? prepareImagesForAPI(imagesB) : Promise.resolve([]),
        ])

        const [responseA, responseB] = await Promise.all([
          fetch('/api/analyze-with-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draft_text: draftA, images: preparedA }),
          }),
          fetch('/api/analyze-with-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draft_text: draftB, images: preparedB }),
          }),
        ])

        if (!responseA.ok || !responseB.ok) {
          throw new Error('Analysis failed')
        }

        const [dataA, dataB] = await Promise.all([responseA.json(), responseB.json()])

        // Build comparison result from individual analyses
        const baseline = {
          role_distribution_all: dataA.predictions.role_distribution_top5,
          role_distribution_top5: dataA.predictions.role_distribution_top5,
          risk: dataA.predictions.risk,
          narratives: {
            narrative_probs: Object.fromEntries(
              dataA.predictions.narratives.map((n: any) => [n.name, n.prob])
            ),
          },
        }

        const variant = {
          role_distribution_all: dataB.predictions.role_distribution_top5,
          role_distribution_top5: dataB.predictions.role_distribution_top5,
          risk: dataB.predictions.risk,
          narratives: {
            narrative_probs: Object.fromEntries(
              dataB.predictions.narratives.map((n: any) => [n.name, n.prob])
            ),
          },
        }

        // Calculate deltas
        const allRoles = new Set([
          ...baseline.role_distribution_all.map((r: any) => r.role),
          ...variant.role_distribution_all.map((r: any) => r.role),
        ])

        const role_deltas: Record<string, number> = {}
        allRoles.forEach((role) => {
          const baselinePct = baseline.role_distribution_all.find((r: any) => r.role === role)?.pct || 0
          const variantPct = variant.role_distribution_all.find((r: any) => r.role === role)?.pct || 0
          role_deltas[role] = variantPct - baselinePct
        })

        const risk_prob_deltas = {
          Helpful: variant.risk.risk_probs.Helpful - baseline.risk.risk_probs.Helpful,
          Harmless: variant.risk.risk_probs.Harmless - baseline.risk.risk_probs.Harmless,
          Harmful: variant.risk.risk_probs.Harmful - baseline.risk.risk_probs.Harmful,
        }

        setResult({
          baseline,
          variant,
          delta: { role_deltas, risk_prob_deltas, narrative_deltas: {} },
        } as CompareResponse)
      } else {
        // No images, use regular compare API
        const data = await compareTexts(draftA, draftB)
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to compare drafts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">Compare Signals</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            See how different wording shifts who you attract.
          </p>
        </div>

        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
              <label htmlFor="draft-a" className="block text-lg font-semibold mb-3 text-white">
                Current Signal
              </label>
              <textarea
                id="draft-a"
                value={draftA}
                onChange={(e) => setDraftA(e.target.value)}
                placeholder="Paste your current draft here..."
                className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                disabled={loading}
              />
              <div className="mt-3">
                <ImageUpload
                  images={imagesA}
                  onImagesChange={setImagesA}
                  maxImages={2}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
              <label htmlFor="draft-b" className="block text-lg font-semibold mb-3 text-white">
                Adjusted Signal
              </label>
              <textarea
                id="draft-b"
                value={draftB}
                onChange={(e) => setDraftB(e.target.value)}
                placeholder="Paste your adjusted draft here..."
                className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 resize-none"
                disabled={loading}
              />
              <div className="mt-3">
                <ImageUpload
                  images={imagesB}
                  onImagesChange={setImagesB}
                  maxImages={2}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleCompare}
              disabled={loading || !draftA.trim() || !draftB.trim()}
              className="px-8 py-3 bg-white text-black hover:bg-slate-100 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed rounded-full font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200"
            >
              {loading ? 'Analyzing...' : 'Compare Signals'}
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

          {loading && <LoadingSkeleton />}

          {result && !loading && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Signal Comparison</h2>
                <p className="text-slate-400">Current vs Adjusted</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
                  <h3 className="text-xl font-bold mb-4 text-purple-300">Current Signal</h3>
                  <div className="mb-4">
                    <span className={`px-4 py-2 rounded-full border font-semibold inline-block ${
                      result.baseline.risk.risk_class === 'Helpful'
                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                        : result.baseline.risk.risk_class === 'Harmless'
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                        : 'bg-red-500/20 border-red-500/50 text-red-300'
                    }`}>
                      {result.baseline.risk.risk_class}
                    </span>
                  </div>
                  <ProbabilityBars probs={result.baseline.risk.risk_probs} contrastMode={contrastMode} />
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 shadow-2xl shadow-pink-500/10">
                  <h3 className="text-xl font-bold mb-4 text-pink-300">Adjusted Signal</h3>
                  <div className="mb-4">
                    <span className={`px-4 py-2 rounded-full border font-semibold inline-block ${
                      result.variant.risk.risk_class === 'Helpful'
                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                        : result.variant.risk.risk_class === 'Harmless'
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                        : 'bg-red-500/20 border-red-500/50 text-red-300'
                    }`}>
                      {result.variant.risk.risk_class}
                    </span>
                  </div>
                  <ProbabilityBars probs={result.variant.risk.risk_probs} contrastMode={contrastMode} />
                </div>
              </div>

              <SignalMovement 
                deltas={result.delta.risk_prob_deltas} 
                title="Risk Movement"
                isPercentage={true}
                maxVisible={3}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
                  <h3 className="text-xl font-bold mb-4 text-purple-300">Current Signal</h3>
                  <RoleBars roles={result.baseline.role_distribution_all} contrastMode={contrastMode} maxVisible={5} />
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 shadow-2xl shadow-pink-500/10">
                  <h3 className="text-xl font-bold mb-4 text-pink-300">Adjusted Signal</h3>
                  <RoleBars roles={result.variant.role_distribution_all} contrastMode={contrastMode} maxVisible={5} />
                </div>
              </div>

              <SignalMovement 
                deltas={result.delta.role_deltas} 
                title="Audience Shift"
                isPercentage={false}
                maxVisible={5}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
