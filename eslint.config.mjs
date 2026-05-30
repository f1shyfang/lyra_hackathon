import next from 'eslint-config-next/core-web-vitals'

// ESLint 9 flat config for Next.js 16.
// `next lint` was removed in Next 16, so linting runs via the ESLint CLI
// (`eslint .` — see the "lint" script). eslint-config-next@16 ships native
// flat-config arrays, so we import and spread them directly (no FlatCompat).
// Replaces the legacy .eslintrc.json (`extends: next/core-web-vitals`).
const eslintConfig = [
  // Flat config replaces .eslintignore — list non-source paths here.
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      // Python backend / ML training + virtualenv + archived code
      'venv/**',
      '.venv/**',
      'ml_training/**',
      'archive/**',
      'output/**',
      'data/**',
      '**/*.py',
    ],
  },
  ...next,
]

export default eslintConfig
