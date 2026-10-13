/**
 * THE BACKEND THE BROWSER SUITE RUNS AGAINST.
 *
 * A throwaway local Supabase built from production's schema by
 * `scripts/db/test-stack.mjs` (Phase 7 of docs/plans/tests-worth-their-keep.md),
 * never the live project. Until Phase 8 every browser run signed in to three
 * real accounts in production and created and wiped rows there.
 *
 * `playwright.config.ts` starts it — or reuses the running one, in about a
 * second — once, in the runner process, and puts its address and keys in one
 * environment variable. Playwright forks its workers after the config has
 * loaded, so every worker inherits that variable and none of them starts the
 * stack again: four workers each running `up` would race on the migrations
 * folder the script rewrites.
 *
 * The keys are the local stack's own, the same on every machine. They open
 * nothing outside it.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client } from 'pg'

export const STACK_ENV_VAR = 'E2E_STACK_ENV'

export interface StackEnv {
  API_URL: string
  ANON_KEY: string
  SERVICE_ROLE_KEY: string
  DB_URL: string
  MAILPIT_URL: string
}

const REQUIRED: (keyof StackEnv)[] = ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY', 'DB_URL', 'MAILPIT_URL']

/** Starts the stack, or reuses it, unless this process already has its env. For the config only. */
export function startTestStack(): StackEnv {
  if (!process.env[STACK_ENV_VAR]) {
    const script = path.resolve(__dirname, '../../../scripts/db/test-stack.mjs')
    // stderr inherited: the script says why it failed (wrong CLI, Docker down)
    process.env[STACK_ENV_VAR] = execFileSync('node', [script, 'up'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }).trim()
  }
  return testStackEnv()
}

/** The running stack's address and keys, as the config found them. */
export function testStackEnv(): StackEnv {
  const raw = process.env[STACK_ENV_VAR]
  if (!raw) {
    throw new Error(
      `${STACK_ENV_VAR} is unset, so this process does not know where the test backend is. ` +
        'playwright.config.ts sets it when it loads; run the browser suite through `npx playwright test`.',
    )
  }
  const env = JSON.parse(raw) as Partial<StackEnv>
  const missing = REQUIRED.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(`The test backend's env has no ${missing.join(', ')}. Is scripts/db/test-stack.mjs up to date?`)
  }
  return env as StackEnv
}

/** The id of the account with this address in the test backend, or null. Read as the database owner. */
export async function findUserId(email: string): Promise<string | null> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    const { rows } = await db.query<{ id: string }>('select id from auth.users where email = $1', [email])
    return rows[0]?.id ?? null
  } finally {
    await db.end()
  }
}

let adminClient: SupabaseClient | null = null

/**
 * The service-role client of the LOCAL stack. Creates accounts; never asserts
 * anything, because it walks past row security.
 */
export function stackAdmin(): SupabaseClient {
  if (!adminClient) {
    const env = testStackEnv()
    adminClient = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}
