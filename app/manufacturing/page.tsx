'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Tables } from '@/types/supabase'

type Draft = Tables<'drafts'>

export default function ManufacturingPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [postContent, setPostContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/drafts')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch drafts')
      }

      setDrafts(data.drafts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!postContent.trim()) {
      setError('Please enter a LinkedIn post')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: postContent.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create draft')
      }

      setPostContent('')
      await fetchDrafts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const draftsByStatus = {
    pending: drafts.filter(d => d.status === 'pending'),
    processing: drafts.filter(d => d.status === 'processing'),
    approved: drafts.filter(d => d.status === 'approved'),
    rejected: drafts.filter(d => d.status === 'rejected'),
    shipped: drafts.filter(d => d.status === 'shipped'),
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <Link 
          href="/" 
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Manufacturing Line Dashboard
        </h1>

        {/* LinkedIn Post Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Submit LinkedIn Post
          </h2>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
              <p className="text-red-800 dark:text-red-200">Error: {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="postContent" 
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
              >
                LinkedIn Post Content
              </label>
              <textarea
                id="postContent"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your LinkedIn post here..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit for Processing'}
            </button>
          </form>
        </div>

        {/* Pipeline View */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Pipeline View
          </h2>
          
          {loading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(draftsByStatus).map(([status, statusDrafts]) => (
                <div
                  key={status}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                >
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100 capitalize">
                    {status} ({statusDrafts.length})
                  </h3>
                  <div className="space-y-2">
                    {statusDrafts.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No drafts</p>
                    ) : (
                      statusDrafts.map((draft) => (
                        <Link
                          key={draft.id}
                          href={`/manufacturing/drafts/${draft.id}`}
                          className="block p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                            {draft.content.substring(0, 100)}
                            {draft.content.length > 100 ? '...' : ''}
                          </p>
                          {draft.quality_score !== null && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Quality: {draft.quality_score}/100
                            </p>
                          )}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Drafts List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            All Drafts ({drafts.length})
          </h2>
          
          {loading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          ) : drafts.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No drafts yet. Submit a LinkedIn post above to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/manufacturing/drafts/${draft.id}`}
                  className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-gray-100 mb-2">
                        {draft.content.substring(0, 200)}
                        {draft.content.length > 200 ? '...' : ''}
                      </p>
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {draft.avg_excitement_score !== null && (
                          <span>Excitement: {draft.avg_excitement_score}/100</span>
                        )}
                        {draft.avg_cringe_score !== null && (
                          <span>Cringe: {draft.avg_cringe_score}/100</span>
                        )}
                        {draft.quality_score !== null && (
                          <span className="font-semibold">Quality: {draft.quality_score}/100</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(
                        draft.status
                      )}`}
                    >
                      {draft.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {new Date(draft.created_at).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

