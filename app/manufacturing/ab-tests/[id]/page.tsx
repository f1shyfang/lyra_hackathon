'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Tables } from '@/types/supabase'

type ABTest = Tables<'ab_tests'> & {
  drafts?: {
    id: string
    content: string
    status: string
  }
}

type Variant = Tables<'ab_test_variants'>

type Evaluation = Tables<'ab_test_evaluations'> & {
  ab_test_variants?: {
    id: string
    name: string
  }
  ai_personas?: {
    id: string
    name: string | null
  }
}

export default function ABTestDetailPage() {
  const params = useParams()
  const abTestId = params.id as string

  const [abTest, setAbTest] = useState<ABTest | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchABTest()
  }, [abTestId])

  const fetchABTest = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/ab-tests/${abTestId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch A/B test')
      }

      setAbTest(data.abTest)
      setVariants(data.variants || [])
      setEvaluations(data.evaluations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch A/B test')
    } finally {
      setLoading(false)
    }
  }

  const handleRunTest = async () => {
    try {
      setRunning(true)
      setError(null)

      const response = await fetch(`/api/ab-tests/${abTestId}/run`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run A/B test')
      }

      await fetchABTest()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run A/B test')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!abTest) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600 dark:text-red-400">A/B test not found</p>
        </div>
      </div>
    )
  }

  // Calculate variant statistics
  const variantStats = variants.map((variant) => {
    const variantEvals = evaluations.filter((e) => e.variant_id === variant.id)
    const avgScore =
      variantEvals.length > 0
        ? variantEvals.reduce((sum, e) => sum + e.score, 0) / variantEvals.length
        : 0

    return {
      variant,
      evaluations: variantEvals,
      avgScore,
      totalEvaluations: variantEvals.length,
    }
  })

  const winner = variantStats.length > 0
    ? variantStats.reduce((best, current) =>
        current.avgScore > best.avgScore ? current : best
      )
    : null

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <Link 
          href="/manufacturing/ab-tests" 
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
        >
          ← Back to A/B Tests
        </Link>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {abTest.name}
            </h1>
            <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Algorithm: {abTest.algorithm}</span>
              {abTest.epsilon !== null && <span>Epsilon: {abTest.epsilon}</span>}
              <span
                className={`px-2 py-1 rounded text-xs ${
                  abTest.status === 'draft'
                    ? 'bg-gray-100 text-gray-800'
                    : abTest.status === 'running'
                    ? 'bg-blue-100 text-blue-800'
                    : abTest.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {abTest.status}
              </span>
            </div>
          </div>
          {abTest.status === 'draft' && (
            <button
              onClick={handleRunTest}
              disabled={running}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {running ? 'Running...' : 'Run Test'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Winner */}
        {winner && winner.totalEvaluations > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4 mb-6">
            <h2 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2">
              🏆 Winner: {winner.variant.name}
            </h2>
            <p className="text-green-800 dark:text-green-300">
              Average Score: {winner.avgScore.toFixed(2)}/100 ({winner.totalEvaluations} evaluations)
            </p>
          </div>
        )}

        {/* Variants */}
        <div className="space-y-6 mb-6">
          {variantStats.map((stat) => (
            <div
              key={stat.variant.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${
                winner && stat.variant.id === winner.variant.id
                  ? 'ring-2 ring-green-500'
                  : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {stat.variant.name}
                  {winner && stat.variant.id === winner.variant.id && (
                    <span className="ml-2 text-green-600">🏆</span>
                  )}
                </h2>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stat.avgScore.toFixed(2)}/100
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.totalEvaluations} evaluations
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
                {stat.variant.content}
              </p>

              {/* Persona Evaluations */}
              {stat.evaluations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Persona Evaluations:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {stat.evaluations.map((eval_) => (
                      <div
                        key={eval_.id}
                        className="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded"
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {eval_.ai_personas?.name || 'Unknown'}:
                        </span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">
                          {eval_.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* All Evaluations */}
        {evaluations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              All Evaluations ({evaluations.length})
            </h2>
            <div className="space-y-2">
              {evaluations.map((eval_) => (
                <div
                  key={eval_.id}
                  className="flex justify-between items-center p-2 border border-gray-200 dark:border-gray-700 rounded"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {eval_.ai_personas?.name || 'Unknown Persona'}
                    </span>
                    {' → '}
                    <span className="text-gray-700 dark:text-gray-300">
                      {eval_.ab_test_variants?.name || 'Unknown Variant'}
                    </span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {eval_.score}/100
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}





