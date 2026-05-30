import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Next.js keeps local secrets in .env.local; load that (falling back to .env)
config({ path: '.env.local' })
config()

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
