'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Tables } from '@/types/supabase'

type Draft = Tables<'drafts'>
type CouncilFeedback = Tables<'council_feedback'> & {
  ai_personas?: {
    id: string
    name: string | null
    system_prompt: string | null
  }
}

export default function DraftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const draftId = params.id as string

  const [draft, setDraft] = useState<Draft | null>(null)
  const [feedback, setFeedback] = useState<CouncilFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [shipping, setShipping] = useState(false)
  const [showShipForm, setShowShipForm] = useState(false)
  const [shipFormData, setShipFormData] = useState({
    name: '',
    variants: ['', ''],
    algorithm: 'epsilon_greedy',
    epsilon: 0.1,
  })

  useEffect(() => {
    fetchDraft()
  }, [draftId])

  const fetchDraft = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/drafts/${draftId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch draft')
      }

      setDraft(data.draft)
      setFeedback(data.feedback || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch draft')
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    try {
      setProcessing(true)
      setError(null)

      const response = await fetch(`/api/drafts/${draftId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process draft')
      }

      await fetchDraft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process draft')
    } finally {
      setProcessing(false)
    }
  }

  const handleShip = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!shipFormData.name.trim() || shipFormData.variants.filter(v => v.trim()).length < 2) {
      setError('Name and at least 2 variants are required')
      return
    }

    try {
      setShipping(true)
      setError(null)

      const response = await fetch(`/api/drafts/${draftId}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: shipFormData.name.trim(),
          variants: shipFormData.variants.filter(v => v.trim()),
          algorithm: shipFormData.algorithm,
          epsilon: shipFormData.epsilon,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to ship draft')
      }

      router.push(`/manufacturing/ab-tests/${data.abTest.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ship draft')
    } finally {
      setShipping(false)
    }
  }

  const handleReject = async () => {
    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject draft')
      }

      await fetchDraft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject draft')
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

  if (!draft) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600 dark:text-red-400">Draft not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <Link 
          href="/manufacturing" 
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
        >
          ← Back to Manufacturing Line
        </Link>
        
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Draft Details
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Draft Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              LinkedIn Post
            </h2>
            <span
              className={`px-3 py-1 text-xs rounded-full font-medium ${
                draft.status === 'pending'
                  ? 'bg-gray-100 text-gray-800'
                  : draft.status === 'processing'
                  ? 'bg-blue-100 text-blue-800'
                  : draft.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : draft.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {draft.status}
            </span>
          </div>
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {draft.content}
          </p>
        </div>

        {/* Quality Scores */}
        {(draft.avg_excitement_score !== null || draft.avg_cringe_score !== null) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Quality Scores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Excitement Score</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {draft.avg_excitement_score}/100
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cringe Score</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {draft.avg_cringe_score}/100
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Quality Score</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {draft.quality_score}/100
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Persona Feedback */}
        {feedback.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              AI Council Feedback ({feedback.length} personas)
            </h2>
            <div className="space-y-4">
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  className="border border-gray-200 dark:border-gray-700 rounded p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {fb.ai_personas?.name || 'Unknown Persona'}
                    </h3>
                    <div className="flex gap-2 text-sm">
                      <span className="text-green-600 dark:text-green-400">
                        Excitement: {fb.excitement_score}/100
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        Cringe: {fb.cringe_score}/100
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{fb.critique}</p>
                  {fb.specific_fix && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        Suggested Fix:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {fb.specific_fix}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Actions
          </h2>
          <div className="flex gap-4 flex-wrap">
            {draft.status === 'pending' && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Process with AI Council'}
              </button>
            )}
            {draft.status === 'approved' && (
              <button
                onClick={() => setShowShipForm(!showShipForm)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Ship to A/B Test
              </button>
            )}
            {draft.status !== 'rejected' && draft.status !== 'shipped' && (
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject
              </button>
            )}
          </div>

          {/* Ship Form */}
          {showShipForm && (
            <form onSubmit={handleShip} className="mt-6 space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Test Name
                </label>
                <input
                  type="text"
                  value={shipFormData.name}
                  onChange={(e) => setShipFormData({ ...shipFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="A/B Test Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Variants (at least 2)
                </label>
                {shipFormData.variants.map((variant, index) => (
                  <textarea
                    key={index}
                    value={variant}
                    onChange={(e) => {
                      const newVariants = [...shipFormData.variants]
                      newVariants[index] = e.target.value
                      setShipFormData({ ...shipFormData, variants: newVariants })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
                    rows={3}
                    placeholder={`Variant ${String.fromCharCode(97 + index)}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setShipFormData({
                      ...shipFormData,
                      variants: [...shipFormData.variants, ''],
                    })
                  }
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add Variant
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Algorithm
                  </label>
                  <select
                    value={shipFormData.algorithm}
                    onChange={(e) =>
                      setShipFormData({ ...shipFormData, algorithm: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="epsilon_greedy">Epsilon-Greedy</option>
                    <option value="fixed_split">Fixed Split</option>
                  </select>
                </div>
                {shipFormData.algorithm === 'epsilon_greedy' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Epsilon (exploration rate)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={shipFormData.epsilon}
                      onChange={(e) =>
                        setShipFormData({
                          ...shipFormData,
                          epsilon: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={shipping}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {shipping ? 'Shipping...' : 'Create A/B Test'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

