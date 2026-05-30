import { createBrowserClient } from '@supabase/ssr'

// Used only for Supabase Storage (the database has moved to Neon + Drizzle).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

