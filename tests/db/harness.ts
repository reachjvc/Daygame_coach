/**
 * THE TEST BACKEND, FROM A TEST'S SIDE.
 *
 * The backend is a throwaway local Supabase built from production's schema
 * (scripts/db/test-stack.mjs). Its address and keys reach each test process in
 * one environment variable, set by the suite's global setup.
 *
 * ISOLATION COMES FROM USERS, NOT FROM TRUNCATION. Every test makes its own
 * user with `newUser()`. Every user-owned row hangs off a user and is fenced by
 * row security, so two tests — or two workers — never see each other's data,
 * and nothing has to be wiped between them. That is what lets the suite run in
 * parallel. `TEST_SHARED_USER=1` hands every caller the same user instead; a
 * suite that stays green with it set is not relying on its isolation, which is
 * the proof the plan asks for (docs/plans/tests-worth-their-keep.md, R5).
 *
 * THE APP'S OWN DATA CODE RUNS UNCHANGED. Repos build their client through
 * `src/db/supabase.ts`. A test file replaces that one module:
 *
 *   vi.mock("@/src/db/supabase", async (importOriginal) =>
 *     (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal()))
 *
 * and then `actAs(user)` decides whose session the repo runs with — through
 * real PostgREST and real row security, as in production.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { Client } from "pg"

export const STACK_ENV = "TEST_STACK_ENV"

export interface StackEnv {
  API_URL: string
  ANON_KEY: string
  SERVICE_ROLE_KEY: string
  DB_URL: string
  MAILPIT_URL?: string
}

export function stackEnv(): StackEnv {
  const raw = process.env[STACK_ENV]
  if (!raw) {
    throw new Error(
      `${STACK_ENV} is unset, so the test backend was never started. Run the suite ` +
        "through its vitest config, which starts it, or start it by hand with " +
        "`node scripts/db/test-stack.mjs up`."
    )
  }
  return JSON.parse(raw) as StackEnv
}

const NO_SESSION_STORAGE = { auth: { persistSession: false, autoRefreshToken: false } }

let adminClient: SupabaseClient | null = null

/** The service-role client. Bypasses row security — use it to arrange, never to assert access. */
export function admin(): SupabaseClient {
  if (!adminClient) {
    const env = stackEnv()
    adminClient = createClient(env.API_URL, env.SERVICE_ROLE_KEY, NO_SESSION_STORAGE)
  }
  return adminClient
}

export interface TestUser {
  id: string
  email: string
  /** Signed in as this user: everything it does is fenced by row security. */
  client: SupabaseClient
}

let sharedUser: Promise<TestUser> | null = null

/** A confirmed account of its own, signed in. Its profile row comes from the real trigger. */
export function newUser(label = "user"): Promise<TestUser> {
  if (process.env.TEST_SHARED_USER === "1") {
    sharedUser ??= theSharedUser()
    return sharedUser
  }
  return createUser(label)
}

async function createUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID()}@test.local`
  const password = randomUUID()
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`newUser: could not create ${email}: ${error?.message}`)
  return signIn(email, password)
}

/**
 * ONE ACCOUNT FOR THE WHOLE RUN — every file, every worker. Vitest gives each
 * test file a fresh copy of this module, so a user kept in a module variable is
 * shared only within one file, and a test that leans on another FILE's rows
 * being somewhere else would stay green. A fixed address makes it the same
 * account everywhere. Whichever worker arrives first creates it. The rest are
 * refused — as `email_exists`, or, when two creates race inside the auth
 * service, as a bare "Database error creating new user" — and then sign in to
 * the one that exists. A refusal followed by a failed sign-in throws both.
 */
async function theSharedUser(): Promise<TestUser> {
  const email = "shared-user@test.local"
  const password = "shared-user-password"
  const { error } = await admin().auth.admin.createUser({ email, password, email_confirm: true })
  if (!error) return signIn(email, password)
  try {
    return await signIn(email, password)
  } catch (signInError) {
    throw new Error(
      `newUser: could not create the shared user (${error.message}) and could not sign in to it ` +
        `either (${(signInError as Error).message})`
    )
  }
}

async function signIn(email: string, password: string): Promise<TestUser> {
  const env = stackEnv()
  const client = createClient(env.API_URL, env.ANON_KEY, NO_SESSION_STORAGE)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(`newUser: could not sign in as ${email}: ${error?.message}`)
  return { id: data.user.id, email, client }
}

let actingAs: TestUser | null = null

/** Whose session `createServerSupabaseClient()` hands to the app's code from now on. */
export function actAs(user: TestUser): void {
  actingAs = user
}

/** The replacement for `src/db/supabase.ts` — see the header for how a test file uses it. */
export function stackSupabaseModule<T extends Record<string, unknown>>(original: T): T {
  return {
    ...original,
    createServerSupabaseClient: async () => {
      if (!actingAs) throw new Error("The app asked for a signed-in client before the test called actAs(user).")
      return actingAs.client
    },
    createAdminSupabaseClient: () => admin(),
  }
}

type Query = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>

/** SQL as the database owner. Row security does not apply — arrange and inspect only. */
export async function asOwner<T>(run: (q: Query) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: stackEnv().DB_URL })
  await client.connect()
  try {
    return await run(async (text, params = []) => (await client.query(text, params)).rows)
  } finally {
    await client.end()
  }
}

/**
 * SQL as a signed-in user, on ONE connection, so row security is consulted.
 * Sets the same JWT claims PostgREST would, so `auth.uid()` answers exactly as
 * it does for a request from the app.
 */
export async function asUser<T>(userId: string, run: (q: Query) => Promise<T>): Promise<T> {
  return asOwner(async (q) => {
    const claims = JSON.stringify({ sub: userId, role: "authenticated" })
    await q("select set_config('request.jwt.claims', $1, false)", [claims])
    await q("select set_config('request.jwt.claim.sub', $1, false)", [userId])
    await q("set role authenticated")
    return run(q)
  })
}
