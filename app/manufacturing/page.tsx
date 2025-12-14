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
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedImages(files)
      
      // Create previews
      const previews = files.map(file => URL.createObjectURL(file))
      setImagePreviews(previews)
    }
  }

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setSelectedImages(newImages)
    setImagePreviews(newPreviews)
    // Revoke object URLs to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!postContent.trim() && selectedImages.length === 0) {
      setError('Please enter text content or upload at least one image')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const formData = new FormData()
      formData.append('content', postContent.trim())
      selectedImages.forEach((image) => {
        formData.append('images', image)
      })

      const response = await fetch('/api/drafts', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create draft')
      }

      setPostContent('')
      setSelectedImages([])
      // Revoke all preview URLs
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
      setImagePreviews([])
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
              />
            </div>
            
            <div>
              <label 
                htmlFor="images" 
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
              >
                Images (optional)
              </label>
              <input
                id="images"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You can upload multiple images. Supported formats: JPEG, PNG, WebP (max 20MB each)
              </p>
            </div>

            {imagePreviews.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Image Previews
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (!postContent.trim() && selectedImages.length === 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit for Processing'}
            </button>
          </form>
        </div>

        {/* To Do Visual Posts */}
        {draftsByStatus.pending.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                To Do - Pending Posts ({draftsByStatus.pending.length})
              </h2>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full text-sm font-medium">
                Needs Action
              </span>
            </div>
            
            {loading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftsByStatus.pending.map((draft) => (
                  <Link
                    key={draft.id}
                    href={`/manufacturing/drafts/${draft.id}`}
                    className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-orange-500 overflow-hidden group"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <span className="px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs font-semibold uppercase">
                          Pending
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(draft.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        {draft.content && (
                          <p className="text-gray-900 dark:text-gray-100 line-clamp-4 text-sm leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {draft.content}
                          </p>
                        )}
                        {draft.image_urls && (draft.image_urls as string[]).length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {(draft.image_urls as string[]).slice(0, 3).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Draft image ${idx + 1}`}
                                className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
                              />
                            ))}
                            {(draft.image_urls as string[]).length > 3 && (
                              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400">
                                +{(draft.image_urls as string[]).length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {draft.content.length} characters
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

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

