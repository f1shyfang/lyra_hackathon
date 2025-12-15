#  - AI-Powered LinkedIn Content Optimization Platform

<div align="center">
Amplify
**Optimize your LinkedIn content with AI-powered persona critiques, quality scoring, and A/B testing**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API Reference](#-api-reference)

</div>

---

## 🎯 Overview

Amplify is an AI-powered platform that helps content creators optimize LinkedIn posts before publishing. By leveraging multiple AI personas representing different professional archetypes, Amplify provides comprehensive feedback, quality scoring, and A/B testing capabilities to ensure your content resonates with your target audience.

### What Amplify Does

- **🤖 AI Council Simulation**: Get parallel feedback from multiple AI personas on your LinkedIn posts
- **📊 Quality Scoring**: Automated evaluation using excitement and cringe metrics
- **🧪 A/B Testing**: Test multiple post variants with persona-based evaluation
- **🏭 Manufacturing Workflow**: Streamlined process from draft creation to final approval
- **🖼️ Multimodal Support**: Evaluate both text and image content

---

## ✨ Features

### 🤖 AI Personas

Create and manage AI personas representing different professional roles:
- **Software Engineers** - Technical perspective on content
- **Product Managers** - Business and user-focused critiques
- **Founders** - Entrepreneurial and growth-oriented feedback
- **Marketing Professionals** - Engagement and messaging insights
- **And more...**

Each persona provides unique critiques based on their professional perspective, evaluating posts on:
- **Excitement Score** (0-100): How engaging and exciting the content is
- **Cringe Score** (0-100): How cringeworthy or inappropriate the content is

### 🎭 Simulation Engine

Run simulations with selected personas to get instant feedback:

1. **Select Personas**: Choose which AI personas should evaluate your content
2. **Submit Content**: Enter your LinkedIn post text and optionally attach images
3. **Get Results**: View detailed critiques, scores, and suggested fixes from each persona
4. **Review Scores**: See aggregated quality scores (excitement, cringe, overall quality)

**New**: Results are now displayed on a dedicated results page with a beautiful, dark-themed UI matching the simulation interface.

### 🏭 Manufacturing Line

Complete workflow for content creation and optimization:

1. **Draft Creation** - Create LinkedIn post drafts with text and images
2. **AI Council Processing** - Process drafts through selected personas
3. **Quality Evaluation** - Automatic quality gate checks based on thresholds
4. **Approval Workflow** - Approve or reject drafts based on feedback
5. **A/B Test Shipping** - Convert approved drafts into A/B tests

### 🧪 A/B Testing

Test multiple post variants to find the best performing content:

- Create A/B tests with multiple variants
- Run tests using AI personas as simulated users
- Track variant performance and identify winners
- Support for multiple algorithms:
  - **Epsilon-Greedy**: Balances exploration and exploitation
  - **Fixed Split**: Even distribution across variants

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16+ (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **AI** | Google Gemini API (`@google/genai`) |
| **Styling** | Tailwind CSS |
| **Authentication** | Supabase Auth (SSR) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ installed
- **Supabase** project ([create one here](https://supabase.com))
- **Google Gemini API** key ([get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/f1shyfang/lyra_hackathon.git
   cd lyra_hackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key

   # Optional: Quality Gate Thresholds
   QUALITY_THRESHOLD_EXCITEMENT=70
   QUALITY_THRESHOLD_CRINGE=30
   ```

   **Finding your Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project → Settings → API
   - Copy the Project URL and anon/public key

   **Getting your Gemini API key:**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create an API key
   - Add it to your `.env.local` file

4. **Set up the database**

   You'll need to create the following tables in Supabase. See the [Database Schema](#-database-schema) section for detailed table structures.

   **Quick setup:**
   - Use the Supabase SQL Editor to run the schema migrations
   - Or use the Supabase CLI to apply migrations

5. **Set up storage**

   Create a storage bucket in Supabase:
   - Go to Storage in your Supabase dashboard
   - Click "New bucket"
   - Name it `draft-images`
   - Make it public (or configure RLS policies as needed)

6. **Generate TypeScript types**

   ```bash
   # Install Supabase CLI globally (if not already installed)
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

7. **Start the development server**

   ```bash
   npm run dev
   ```

8. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000) - you'll be automatically redirected to `/examples/ai-personas`.

---

## 📁 Project Structure

```
lyra_hackathon/
├── app/
│   ├── api/                      # API Routes
│   │   ├── ab-tests/            # A/B test endpoints
│   │   ├── drafts/              # Draft management endpoints
│   │   ├── gemini/              # Gemini API proxy
│   │   └── simulation/          # Simulation run endpoint
│   ├── examples/                # Example/Development Pages
│   │   ├── ai-personas/         # AI Persona management UI
│   │   ├── simulation/          # Simulation interface & results
│   │   ├── database/            # Database examples
│   │   ├── storage/             # Storage examples
│   │   └── gemini/              # Gemini API testing
│   ├── manufacturing/           # Manufacturing Workflow UI
│   │   ├── drafts/              # Draft detail pages
│   │   └── ab-tests/            # A/B test management
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home (redirects to ai-personas)
│   └── globals.css              # Global styles
├── lib/
│   ├── google-ai/
│   │   └── client.ts            # Gemini API client
│   ├── services/
│   │   ├── ab-test-engine.ts    # A/B test execution logic
│   │   ├── council-processor.ts # AI Council simulation
│   │   └── quality-gate.ts      # Quality evaluation
│   ├── storage/
│   │   └── image-upload.ts      # Image upload utilities
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       └── server.ts            # Server Supabase client
├── types/
│   └── supabase.ts              # Generated TypeScript types
└── data/                        # Sample datasets
```

---

## 🗄️ Database Schema

### Core Tables

#### `ai_personas`
Stores AI persona definitions for content evaluation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Persona name (e.g., "Software Engineer") |
| `system_prompt` | text | Persona definition for AI (includes description and tags) |
| `active` | boolean | Whether the persona is active |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `drafts`
LinkedIn post drafts with status tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `content` | text | Post text content |
| `image_urls` | text[] | Array of image URLs from Supabase Storage |
| `status` | enum | `pending`, `processing`, `approved`, `rejected`, `shipped` |
| `avg_excitement_score` | integer | Average excitement score (0-100) |
| `avg_cringe_score` | integer | Average cringe score (0-100) |
| `quality_score` | integer | Calculated quality score (0-100) |
| `iteration_count` | integer | Number of processing iterations |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `council_feedback`
Feedback from AI personas on drafts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `draft_id` | uuid | Foreign key → `drafts.id` |
| `persona_id` | uuid | Foreign key → `ai_personas.id` |
| `cringe_score` | integer | Cringe score (0-100) |
| `excitement_score` | integer | Excitement score (0-100) |
| `critique` | text | Detailed critique text |
| `specific_fix` | text | Suggested fix (nullable) |
| `iteration_number` | integer | Iteration number |
| `created_at` | timestamp | Creation timestamp |

#### `ab_tests`
A/B test definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Test name |
| `draft_id` | uuid | Foreign key → `drafts.id` |
| `algorithm` | text | `epsilon_greedy` or `fixed_split` |
| `epsilon` | float | Exploration rate (0-1, for epsilon-greedy) |
| `status` | enum | `draft`, `running`, `paused`, `completed` |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `ab_test_variants`
Variants within A/B tests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `ab_test_id` | uuid | Foreign key → `ab_tests.id` |
| `name` | text | Variant name (e.g., "Variant A") |
| `content` | text | Variant text content |
| `image_urls` | text[] | Array of image URLs (nullable) |
| `avg_score` | float | Average evaluation score |
| `total_evaluations` | integer | Total number of evaluations |
| `total_score` | integer | Sum of all scores |
| `win_rate` | float | Win rate percentage (nullable) |
| `created_at` | timestamp | Creation timestamp |

#### `ab_test_evaluations`
Persona evaluations of A/B test variants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `ab_test_id` | uuid | Foreign key → `ab_tests.id` |
| `variant_id` | uuid | Foreign key → `ab_test_variants.id` |
| `persona_id` | uuid | Foreign key → `ai_personas.id` |
| `score` | integer | Evaluation score (0-100) |
| `preference_rank` | integer | Ranking among variants (nullable) |
| `created_at` | timestamp | Creation timestamp |

---

## 🎮 Usage Guide

### Creating AI Personas

1. Navigate to `/examples/ai-personas` (default route)
2. Click "Create Persona"
3. Enter:
   - **Name**: Persona name (e.g., "Software Engineer")
   - **Description**: Detailed persona description
   - **Tags**: Comma-separated tags (e.g., "technical, code, engineering")
4. Save the persona

### Running a Simulation

1. Go to `/examples/simulation`
2. Enter your LinkedIn post content in the text area
3. Optionally attach images using the "Attach media" button
4. Select one or more personas from the reviewers list
5. Click "Run simulation"
6. Wait for processing (you'll see a loading state)
7. View results on the dedicated results page showing:
   - Original content and images
   - Quality scores (excitement, cringe, quality)
   - Individual persona feedback with critiques and suggested fixes

### Manufacturing Workflow

#### 1. Create Draft
- Navigate to `/manufacturing`
- Enter post content and upload images
- Submit to create a draft

#### 2. Process Draft
- Go to `/manufacturing/drafts/[id]`
- Click "Process with AI Council"
- All active personas will evaluate the draft in parallel
- View feedback and quality scores

#### 3. Review & Approve
- Review persona feedback and critiques
- Check quality scores against thresholds
- Approve or reject the draft

#### 4. Ship to A/B Test (if approved)
- Click "Ship to A/B Test"
- Create multiple variants
- Configure test algorithm (epsilon-greedy or fixed-split)
- Run the test

### Running A/B Tests

1. Navigate to `/manufacturing/ab-tests/[id]`
2. Click "Run Test"
3. AI personas evaluate all variants
4. View results and identify the winner based on average scores

---

## 🔌 API Reference

### Simulation

#### `POST /api/simulation/run`

Run a simulation with selected personas.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `content` (string): Post text content
  - `personaIds` (string): JSON array of persona IDs
  - `images` (File[]): Optional image files

**Response:**
```json
{
  "success": true,
  "draftId": "uuid",
  "result": {
    "draftId": "uuid",
    "feedback": [...],
    "avgCringeScore": 25,
    "avgExcitementScore": 75,
    "qualityScore": 80
  }
}
```

### Drafts

#### `GET /api/drafts`
List all drafts with optional status filter.

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

#### `POST /api/drafts`
Create a new draft.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `content` (string): Post text content
  - `images` (File[]): Optional image files

#### `GET /api/drafts/[id]`
Get draft details with feedback.

**Response:**
```json
{
  "success": true,
  "draft": {...},
  "feedback": [...]
}
```

#### `PATCH /api/drafts/[id]`
Update a draft.

**Request:**
- Content-Type: `multipart/form-data` or `application/json`
- Body: Partial draft fields

#### `POST /api/drafts/[id]/process`
Process a draft with the AI Council.

**Request:**
- Content-Type: `application/json`
- Body:
  - `iterationNumber` (optional): Iteration number

#### `POST /api/drafts/[id]/ship`
Ship a draft to an A/B test.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `name` (string): Test name
  - `algorithm` (string): `epsilon_greedy` or `fixed_split`
  - `epsilon` (number): Exploration rate (0-1)
  - `variantCount` (number): Number of variants
  - `variants[i][content]` (string): Variant content
  - `variants[i][images]` (File[]): Variant images

### A/B Tests

#### `GET /api/ab-tests`
List all A/B tests.

#### `POST /api/ab-tests`
Create a new A/B test.

#### `GET /api/ab-tests/[id]`
Get A/B test details with evaluations.

#### `POST /api/ab-tests/[id]/run`
Run an A/B test with AI personas.

---

## 📊 Quality Scoring

Posts are evaluated on two primary metrics:

### Metrics

- **Excitement Score** (0-100): How engaging and exciting the content is
  - Higher is better
  - Indicates content's ability to capture attention

- **Cringe Score** (0-100): How cringeworthy or inappropriate the content is
  - Lower is better
  - Indicates potential negative reactions

### Quality Score Formula

```
quality_score = (excitement_score × 0.7) + ((100 - cringe_score) × 0.3)
```

Higher quality scores indicate better content. The formula weights excitement more heavily (70%) than avoiding cringe (30%).

### Quality Gates

Quality gates can be configured via environment variables:

- `QUALITY_THRESHOLD_EXCITEMENT` (default: 70)
  - Minimum excitement score to pass

- `QUALITY_THRESHOLD_CRINGE` (default: 30)
  - Maximum cringe score to pass

Drafts that pass quality gates are automatically marked as `approved`, while those that fail are marked as `rejected`.

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on `http://localhost:3000` |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run types:generate` | Generate TypeScript types from Supabase schema |

---

## 🔒 Security Best Practices

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

ISC

---

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 💡 Tips & Best Practices

- **Start small**: Begin with a few personas to test the system
- **Use simulations**: Iterate on content using the simulation feature before creating drafts
- **Review feedback**: Quality scores are calculated automatically, but always review individual persona critiques
- **Run multiple tests**: A/B tests can be run multiple times to gather more data
- **Image optimization**: Images are stored in Supabase Storage - optimize them before upload for better performance
- **Persona diversity**: Create personas representing different perspectives for more comprehensive feedback

---

<div align="center">


[Report Bug](https://github.com/f1shyfang/lyra_hackathon/issues) • [Request Feature](https://github.com/f1shyfang/lyra_hackathon/issues)

</div>
