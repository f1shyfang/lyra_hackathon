'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Tables } from '@/types/supabase'

type ABTest = Tables<'ab_tests'> & {
  drafts?: {
    id: string
    content: string
    status: string
  }
}

export default function ABTestsPage() {
  const [abTests, setAbTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchABTests()
  }, [])

  const fetchABTests = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/ab-tests')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch A/B tests')
      }

      setAbTests(data.abTests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch A/B tests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <Link 
          href="/manufacturing" 
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
        >
          ← Back to Manufacturing Line
        </Link>
        
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          A/B Tests
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        ) : abTests.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No A/B tests yet. Ship an approved draft to create one!
          </p>
        ) : (
          <div className="space-y-4">
            {abTests.map((test) => (
              <Link
                key={test.id}
                href={`/manufacturing/ab-tests/${test.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {test.name}
                    </h2>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Algorithm: {test.algorithm}</span>
                      {test.epsilon !== null && (
                        <span>Epsilon: {test.epsilon}</span>
                      )}
                    </div>
                    {test.drafts && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {test.drafts.content.substring(0, 150)}
                        {test.drafts.content.length > 150 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(
                      test.status
                    )}`}
                  >
                    {test.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created: {new Date(test.created_at).toLocaleString()}
                  {test.started_at && (
                    <> • Started: {new Date(test.started_at).toLocaleString()}</>
                  )}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}





