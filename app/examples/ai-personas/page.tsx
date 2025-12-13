'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tables } from '@/types/supabase'

type AIPersona = Tables<'ai_personas'>

export default function AIPersonasPage() {
  const [personas, setPersonas] = useState<AIPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    system_prompt: '',
    active: true,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchPersonas()
  }, [showActiveOnly])

  const fetchPersonas = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('ai_personas')
        .select('*')
        .order('name', { ascending: true })

      if (showActiveOnly) {
        query = query.eq('active', true)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setPersonas(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch personas')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.system_prompt.trim()) {
      setError('Name and system prompt are required')
      return
    }

    try {
      setError(null)
      setSuccess(null)

      if (editingId) {
        // Update existing persona
        const { error: updateError } = await supabase
          .from('ai_personas')
          .update({
            name: formData.name.trim(),
            system_prompt: formData.system_prompt.trim(),
            active: formData.active,
          })
          .eq('id', editingId)

        if (updateError) throw updateError
        setSuccess('Persona updated successfully!')
      } else {
        // Create new persona
        const { error: insertError } = await supabase
          .from('ai_personas')
          .insert([{
            name: formData.name.trim(),
            system_prompt: formData.system_prompt.trim(),
            active: formData.active,
          }])

        if (insertError) throw insertError
        setSuccess('Persona created successfully!')
      }

      // Reset form
      setFormData({ name: '', system_prompt: '', active: true })
      setEditingId(null)
      fetchPersonas()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save persona')
    }
  }

  const handleEdit = (persona: AIPersona) => {
    setFormData({
      name: persona.name || '',
      system_prompt: persona.system_prompt || '',
      active: persona.active ?? true,
    })
    setEditingId(persona.id)
    setError(null)
    setSuccess(null)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      const { error: deleteError } = await supabase
        .from('ai_personas')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setSuccess('Persona deleted successfully!')
      setDeleteConfirmId(null)
      fetchPersonas()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete persona')
    }
  }

  const handleToggleActive = async (persona: AIPersona) => {
    try {
      setError(null)
      const { error: updateError } = await supabase
        .from('ai_personas')
        .update({ active: !persona.active })
        .eq('id', persona.id)

      if (updateError) throw updateError
      fetchPersonas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update persona')
    }
  }

  const cancelEdit = () => {
    setFormData({ name: '', system_prompt: '', active: true })
    setEditingId(null)
    setError(null)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <Link 
          href="/" 
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6">AI Personas Management</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4 mb-6">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Create/Edit Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Persona' : 'Create New Persona'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                maxLength={50}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., The Cynic, The Mercenary, The Academic"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.name.length}/50 characters</p>
            </div>

            <div>
              <label htmlFor="system_prompt" className="block text-sm font-medium mb-2">
                System Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                id="system_prompt"
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="You are a senior Rust dev. You hate buzzwords..."
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="active" className="ml-2 text-sm font-medium">
                Active
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {editingId ? 'Update Persona' : 'Create Persona'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Filter and List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Personas ({personas.length})
            </h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Show active only</span>
            </label>
          </div>

          {loading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          ) : personas.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No personas found. Create your first one above!
            </p>
          ) : (
            <div className="space-y-4">
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className={`border rounded-lg p-4 ${
                    persona.active
                      ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 opacity-75'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{persona.name || 'Unnamed'}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            persona.active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {persona.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-3">
                        {persona.system_prompt || 'No system prompt'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(persona)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(persona)}
                      className={`px-3 py-1 text-sm rounded ${
                        persona.active
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {persona.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(persona.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Delete Confirmation */}
                  {deleteConfirmId === persona.id && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                        Are you sure you want to delete this persona? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(persona.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

