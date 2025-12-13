'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ContactSubmission {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'new' | 'read' | 'replied'
  created_at: string
}

export default function TestPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const supabase = createClient()

  // Read data from Supabase
  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setSubmissions(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch submissions')
      console.error('Error fetching submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  // Write data to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      const { data, error: insertError } = await supabase
        .from('contact_submissions')
        .insert([formData])
        .select()

      if (insertError) throw insertError

      // Reset form and refresh list
      setFormData({ name: '', email: '', subject: '', message: '' })
      await fetchSubmissions()
      alert('Submission created successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to create submission')
      console.error('Error creating submission:', err)
    }
  }

  // Update status
  const updateStatus = async (id: string, newStatus: 'new' | 'read' | 'replied') => {
    try {
      setError(null)
      const { error: updateError } = await supabase
        .from('contact_submissions')
        .update({ status: newStatus })
        .eq('id', id)

      if (updateError) throw updateError
      await fetchSubmissions()
    } catch (err: any) {
      setError(err.message || 'Failed to update submission')
      console.error('Error updating submission:', err)
    }
  }

  // Delete submission
  const deleteSubmission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return

    try {
      setError(null)
      const { error: deleteError } = await supabase
        .from('contact_submissions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await fetchSubmissions()
    } catch (err: any) {
      setError(err.message || 'Failed to delete submission')
      console.error('Error deleting submission:', err)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Supabase Test Page
        </h1>
        <p className="text-gray-600 mb-8">
          This page demonstrates reading and writing to the contact_submissions table in Supabase.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Write Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Create New Submission</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Create Submission
            </button>
          </form>
        </div>

        {/* Read Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Existing Submissions</h2>
            <button
              onClick={fetchSubmissions}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No submissions found.</div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{submission.name}</h3>
                      <p className="text-sm text-gray-600">{submission.email}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        submission.status === 'new'
                          ? 'bg-blue-100 text-blue-800'
                          : submission.status === 'read'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {submission.status}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800 mb-1">{submission.subject}</p>
                  <p className="text-gray-600 mb-3">{submission.message}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      {new Date(submission.created_at).toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={submission.status}
                        onChange={(e) =>
                          updateStatus(
                            submission.id,
                            e.target.value as 'new' | 'read' | 'replied'
                          )
                        }
                        className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="replied">Replied</option>
                      </select>
                      <button
                        onClick={() => deleteSubmission(submission.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

