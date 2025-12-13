# Next.js + Supabase

A Next.js application with Supabase integration for Database and Storage features.

## Features

- ⚡ Next.js 14+ with App Router
- 🔷 TypeScript
- 🎨 Tailwind CSS
- 🗄️ Supabase Database integration
- 📦 Supabase Storage integration
- 🔐 Server-side and client-side Supabase clients

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase project (create one at [supabase.com](https://supabase.com))

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings:
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Navigate to Settings → API
- Copy the Project URL and anon/public key

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
├── app/
│   ├── examples/
│   │   ├── database/      # Database example page
│   │   └── storage/       # Storage example page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── lib/
│   └── supabase/
│       ├── client.ts      # Browser-side Supabase client
│       └── server.ts      # Server-side Supabase client
├── types/
│   └── supabase.ts        # Generated TypeScript types
└── .env.local             # Environment variables (not committed)
```

## Supabase Setup

### Database

1. Create tables in your Supabase project using the SQL Editor or Table Editor
2. Generate TypeScript types (optional but recommended):

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Generate types (replace YOUR_PROJECT_ID with your actual project ID)
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

Or update the `types:generate` script in `package.json` with your project ID and run:

```bash
npm run types:generate
```

3. Update the example pages in `app/examples/database/page.tsx` to query your tables

### Storage

1. Create a storage bucket in your Supabase project:
   - Go to Storage in your Supabase dashboard
   - Click "New bucket"
   - Give it a name and configure permissions

2. Update the bucket name in `app/examples/storage/page.tsx` (replace `'your-bucket'` with your actual bucket name)

## Usage

### Using Supabase Client in Client Components

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export default function MyComponent() {
  const supabase = createClient()
  
  // Use supabase client for queries, storage, etc.
}
```

### Using Supabase Client in Server Components

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function MyServerComponent() {
  const supabase = await createClient()
  
  // Use supabase client for server-side queries
}
```

### Database Queries

```typescript
// Select
const { data, error } = await supabase
  .from('your_table')
  .select('*')

// Insert
const { data, error } = await supabase
  .from('your_table')
  .insert([{ column1: 'value1' }])

// Update
const { data, error } = await supabase
  .from('your_table')
  .update({ column1: 'new_value' })
  .eq('id', 1)

// Delete
const { data, error } = await supabase
  .from('your_table')
  .delete()
  .eq('id', 1)
```

### Storage Operations

```typescript
// Upload
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('path/to/file.jpg', file)

// Get public URL
const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('path/to/file.jpg')

// List files
const { data, error } = await supabase.storage
  .from('bucket-name')
  .list('path/to/folder')

// Delete
const { data, error } = await supabase.storage
  .from('bucket-name')
  .remove(['path/to/file.jpg'])

// Download
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('path/to/file.jpg')
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run types:generate` - Generate TypeScript types from Supabase schema

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

## License

ISC
