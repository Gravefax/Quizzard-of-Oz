import path from 'path'

import { loadEnvConfig } from '@next/env'

// Load environment variables from the repository root (two levels up from this
// file) so the frontend shares a single .env with the backend and
// docker-compose, instead of requiring a duplicate .env inside the frontend.
// loadEnvConfig never overrides variables already present in process.env, so
// real environment / Docker build args still take precedence.
const repoRoot = path.resolve(__dirname, '..', '..')
loadEnvConfig(repoRoot)
