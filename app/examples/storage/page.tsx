'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Link from 'next/link'

export default function StorageExample() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadUrl(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Generate a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `public/${fileName}`

      // Upload file to Supabase Storage
      // Replace 'your-bucket' with your actual bucket name
      const { error: uploadError } = await supabase.storage
        .from('your-bucket')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('your-bucket')
        .getPublicUrl(filePath)

      setUploadUrl(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6">Storage Examples</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload File</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select a file
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
                <p className="text-red-800 dark:text-red-200">Error: {error}</p>
              </div>
            )}
            
            {uploadUrl && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
                <p className="text-green-800 dark:text-green-200 mb-2">
                  ✓ File uploaded successfully!
                </p>
                <a
                  href={uploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {uploadUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Example Operations</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Upload a file</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('path/to/file.jpg', file)`}</code>
              </pre>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Get public URL</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('path/to/file.jpg')`}</code>
              </pre>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">List files</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase.storage
  .from('bucket-name')
  .list('path/to/folder')`}</code>
              </pre>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Delete a file</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase.storage
  .from('bucket-name')
  .remove(['path/to/file.jpg'])`}</code>
              </pre>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Download a file</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('path/to/file.jpg')`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

