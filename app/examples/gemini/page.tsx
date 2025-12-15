'use client'

import { useState } from 'react'
import Link from 'next/link'

const AVAILABLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
  'Gemini 2.5 Pro',
]

export default function GeminiTestPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [responseModel, setResponseModel] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResponse(null)
      setResponseModel(null)

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim(), model }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to generate response')
      }

      if (data.success) {
        setResponse(data.response)
        setResponseModel(data.model)
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setPrompt('')
    setResponse(null)
    setError(null)
    setResponseModel(null)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Gemini API Test
        </h1>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Test Gemini API
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="model" 
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
              >
                Model
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label 
                htmlFor="prompt" 
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
              >
                Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Enter your prompt here..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Response'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">
              Error
            </h3>
            <p className="text-red-700 dark:text-red-300 whitespace-pre-wrap">
              {error}
            </p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Response
              </h3>
              {responseModel && (
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {responseModel}
                </span>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {response}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Generating response...
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!loading && !response && !error && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
              How to use
            </h3>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>Select a model from the dropdown</li>
              <li>Enter your prompt in the text area</li>
              <li>Click "Generate Response" to send the request</li>
              <li>The response will appear below</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}





