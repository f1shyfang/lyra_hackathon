'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DatabaseExample() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        
        // Example: Query from a table (replace 'your_table' with your actual table name)
        // const { data: result, error: queryError } = await supabase
        //   .from('your_table')
        //   .select('*')
        //   .limit(10)
        
        // For now, we'll just test the connection
        const { data: result, error: queryError } = await supabase
          .from('_test_connection')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (queryError) {
          // This is expected if the table doesn't exist - it's just a connection test
          console.log('Connection test:', queryError.message)
          setData([])
        } else {
          setData(result ? [result] : [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6">Database Examples</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          
          {loading && (
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
              <p className="text-red-800 dark:text-red-200">Error: {error}</p>
            </div>
          )}
          
          {!loading && !error && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
              <p className="text-green-800 dark:text-green-200">
                ✓ Successfully connected to Supabase
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                To query your tables, update the code in app/examples/database/page.tsx
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Example Queries</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Select all rows</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase
  .from('your_table')
  .select('*')`}</code>
              </pre>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Insert a row</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase
  .from('your_table')
  .insert([{ column1: 'value1', column2: 'value2' }])`}</code>
              </pre>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Update rows</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase
  .from('your_table')
  .update({ column1: 'new_value' })
  .eq('id', 1)`}</code>
              </pre>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <h3 className="font-semibold mb-2">Delete rows</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{`const { data, error } = await supabase
  .from('your_table')
  .delete()
  .eq('id', 1)`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

