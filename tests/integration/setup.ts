/**
 * Testcontainers setup for integration tests.
 * Provides isolated PostgreSQL database per test run.
 *
 * Architecture:
 * - globalSetup starts container, writes connection info to temp file
 * - Tests read connection info from temp file to connect
 * - globalTeardown stops container and cleans up temp file
 */

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Client } from "pg"
import fs from "fs"
import path from "path"

/**
 * HOW A TEST FINDS THE DATABASE — and why it is not simply a file.
 *
 * This was one path, `tests/integration/.test-connection.json`, written by
 * `startContainer`, DELETED by `stopContainer`, and re-read from disk on every
 * single `getClient()` call. One file, no lock, no per-run identity.
 *
 * Three agents share this checkout, so two integration runs overlap often. On
 * 2026-09-20 that produced 165 failures across 17 files and a confident wrong
 * diagnosis ("infrastructure"), because the two ways it goes wrong both look
 * like something else:
 *
 *   - run A finishes and deletes the file; run B's remaining files then fail
 *     with "container may not be started", which reads as a broken harness
 *   - while both are up, the file points at whichever container wrote it last,
 *     so `createTestUser()` inserts a profile into container A and the NEXT
 *     query runs against container B. The profile is missing, and the error is
 *     `user_goals_user_id_fkey` — which reads as a schema or a repo bug, and
 *     sent somebody through src/db looking for one.
 *
 * The environment is per-process, so it cannot be overwritten or deleted by
 * another run. The file stays as a fallback for anything that reaches these
 * helpers without `globalSetup` having run in the same process tree.
 */
const CONNECTION_FILE = path.join(__dirname, ".test-connection.json")
const CONNECTION_ENV = "INTEGRATION_DB_CONNECTION"

let container: StartedPostgreSqlContainer | null = null

interface ConnectionInfo {
  host: string
  port: number
  database: string
  user: string
  password: string
}

/**
 * Start the PostgreSQL container and initialize schema.
 * Call this in globalSetup.
 */
export async function startContainer(): Promise<void> {
  if (container) {
    return // Already started
  }

  // Start PostgreSQL container
  container = await new PostgreSqlContainer("postgres:15-alpine")
    .withDatabase("test_db")
    .withUsername("test_user")
    .withPassword("test_pass")
    .start()

  // Write connection info to temp file for tests to read
  const connectionInfo: ConnectionInfo = {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  }
  // Both: the env var is what this run's own workers read, the file is the
  // fallback. The file is shared and another run may clobber it; the env
  // cannot be reached by another process.
  process.env[CONNECTION_ENV] = JSON.stringify(connectionInfo)
  fs.writeFileSync(CONNECTION_FILE, JSON.stringify(connectionInfo))

  // Initialize schema
  const client = new Client(connectionInfo)
  await client.connect()

  try {
    const schemaPath = path.join(__dirname, "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf-8")
    await client.query(schema)
  } finally {
    await client.end()
  }
}

/**
 * Stop the container and clean up.
 * Call this in globalTeardown.
 */
export async function stopContainer(): Promise<void> {
  // Clean up temp file
  if (fs.existsSync(CONNECTION_FILE)) {
    fs.unlinkSync(CONNECTION_FILE)
  }

  if (container) {
    await container.stop()
    container = null
  }
}

/**
 * Where this run's database is. The environment first — see `CONNECTION_ENV`.
 *
 * Read on every `getClient()` call, which is what made the shared file so
 * dangerous: two statements in one test could go to two different databases
 * because the file changed between them. `process.env` cannot change under a
 * running process, so within one run every call agrees.
 */
function getConnectionInfo(): ConnectionInfo {
  const fromEnv = process.env[CONNECTION_ENV]
  if (fromEnv) return JSON.parse(fromEnv) as ConnectionInfo

  if (!fs.existsSync(CONNECTION_FILE)) {
    throw new Error(
      `No test database to connect to: ${CONNECTION_ENV} is unset and ` +
        `${path.basename(CONNECTION_FILE)} does not exist.\n` +
        "Either globalSetup did not run, or ANOTHER integration run finished " +
        "and deleted the shared file while this one was still going — three " +
        "agents share this checkout, and that is what a wall of failures in " +
        "unrelated files usually means. Run `npm run test:integration` on its " +
        "own before believing them."
    )
  }

  const content = fs.readFileSync(CONNECTION_FILE, "utf-8")
  return JSON.parse(content) as ConnectionInfo
}

/**
 * Get a database client for running queries.
 * Creates a new client each time (caller must close it).
 */
export async function getClient(): Promise<Client> {
  const connectionInfo = getConnectionInfo()

  const client = new Client(connectionInfo)
  await client.connect()
  return client
}

/**
 * Get the connection string for the test database.
 * Useful for passing to code that needs a connection string.
 */
export function getConnectionString(): string {
  const info = getConnectionInfo()
  return `postgresql://${info.user}:${info.password}@${info.host}:${info.port}/${info.database}`
}

/**
 * Run statements as a signed-in person rather than as the table owner.
 *
 * WHY IT MATTERS. The account that owns the tables is exempt from the row rules
 * — Postgres lets an owner see everything on its own tables — so a test that
 * asks "is someone else refused?" while connected as the owner passes without
 * the rules ever being consulted. `SET ROLE authenticated` steps down to the
 * role a signed-in person actually has.
 *
 * ON ONE CONNECTION, which is the whole trick. `getClient()` opens a NEW
 * connection every call, so a `SET ROLE` issued on one and a query issued on
 * another are two different sessions — the role never applies, RLS is never
 * exercised, and every denial test passes while proving nothing.
 *
 * `test.uid` is what the schema's stub of Supabase's `auth.uid()` reads, so
 * setting it here is how the database is told who is asking.
 *
 * It lives here rather than in one spec because a second copy would drift, and
 * a drifted copy of this is a suite that quietly stops checking anything.
 */
export async function asUser<T>(
  userId: string,
  run: (q: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>
): Promise<T> {
  const client = await getClient()
  try {
    await client.query("SELECT set_config('test.uid', $1, false)", [userId])
    await client.query("SET ROLE authenticated")
    return await run(async (text, params = []) => (await client.query(text, params)).rows)
  } finally {
    await client.end()
  }
}

/**
 * Truncate all tables to reset state between tests.
 * Call this in beforeEach to ensure test isolation.
 */
export async function truncateAllTables(): Promise<void> {
  const client = await getClient()

  try {
    // Truncate in correct order to handle foreign key constraints
    // user_values must come before profiles and values due to FKs.
    // `program_session_logs` is gone — a program session IS a workout now
    // (20260907100000), so `workout_logs` is what has to be cleared, and its
    // sets before it.
    await client.query(`
      TRUNCATE TABLE
        life_plan_day_journal,
        life_plan_day_ticks,
        life_plan_day_ratings,
        life_plan_days,
        life_plan_nodes,
        life_plans,
        workout_sets,
        workout_logs,
        program_enrollments,
        program_drafts,
        user_goals,
        milestones,
        sticking_points,
        approaches,
        field_reports,
        reviews,
        sessions,
        user_tracking_stats,
        inner_game_progress,
        value_comparisons,
        user_values,
        scenarios,
        purchases,
        profiles,
        values,
        embeddings
      RESTART IDENTITY CASCADE
    `)
  } finally {
    await client.end()
  }
}

/**
 * Insert a test user and return the user ID.
 * Helper for tests that need a user context.
 */
export async function createTestUser(email = "test@example.com"): Promise<string> {
  const client = await getClient()

  try {
    const result = await client.query(`
      INSERT INTO profiles (id, email, has_purchased)
      VALUES (gen_random_uuid(), $1, false)
      RETURNING id
    `, [email])

    return result.rows[0].id
  } finally {
    await client.end()
  }
}

/**
 * Create user tracking stats for a test user.
 * Required before testing tracking operations.
 */
export async function createTestUserStats(userId: string): Promise<void> {
  const client = await getClient()

  try {
    await client.query(`
      INSERT INTO user_tracking_stats (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId])
  } finally {
    await client.end()
  }
}

/**
 * Insert a test goal and return the goal ID.
 * Helper for tests that need goal data.
 * Uses raw SQL INSERT following the createTestUser pattern.
 */
export async function createTestGoal(
  userId: string,
  overrides: Partial<{
    title: string; category: string; target_value: number;
    period: string; tracking_type: string; life_area: string;
    parent_goal_id: string | null; template_id: string | null;
    goal_level: number | null; goal_type: string; position: number;
    is_active: boolean; is_archived: boolean; linked_metric: string | null;
    current_value: number; display_category: string | null; goal_nature: string | null
  }> = {}
): Promise<string> {
  const client = await getClient()

  try {
    const defaults = {
      title: "Test Goal",
      category: "custom",
      target_value: 10,
      period: "weekly",
      tracking_type: "counter",
      life_area: "custom",
      parent_goal_id: null,
      template_id: null,
      goal_level: null,
      goal_type: "recurring",
      position: 0,
      is_active: true,
      is_archived: false,
      linked_metric: null,
      current_value: 0,
      display_category: null,
      goal_nature: null,
    }

    const goal = { ...defaults, ...overrides }

    const result = await client.query(`
      INSERT INTO user_goals (
        user_id, title, category, target_value, period,
        tracking_type, life_area, parent_goal_id, template_id,
        goal_level, goal_type, position, is_active, is_archived,
        linked_metric, current_value, display_category, goal_nature
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18
      )
      RETURNING id
    `, [
      userId, goal.title, goal.category, goal.target_value, goal.period,
      goal.tracking_type, goal.life_area, goal.parent_goal_id, goal.template_id,
      goal.goal_level, goal.goal_type, goal.position, goal.is_active, goal.is_archived,
      goal.linked_metric, goal.current_value, goal.display_category, goal.goal_nature,
    ])

    return result.rows[0].id
  } finally {
    await client.end()
  }
}

/**
 * Create a 3-level goal hierarchy (L1 → L2 → L3) for tree tests.
 * Returns the IDs of all three goals.
 */
export async function createTestGoalTree(
  userId: string
): Promise<{ l1Id: string; l2Id: string; l3Id: string }> {
  const l1Id = await createTestGoal(userId, {
    title: "L1 Vision Goal",
    goal_level: 1,
    parent_goal_id: null,
  })

  const l2Id = await createTestGoal(userId, {
    title: "L2 Outcome Goal",
    goal_level: 2,
    parent_goal_id: l1Id,
  })

  const l3Id = await createTestGoal(userId, {
    title: "L3 Action Goal",
    goal_level: 3,
    parent_goal_id: l2Id,
  })

  return { l1Id, l2Id, l3Id }
}
