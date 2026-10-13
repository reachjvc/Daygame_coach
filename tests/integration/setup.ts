/**
 * HELPERS FOR THE RAW-SQL DATABASE TESTS (tests/integration/db/), ON THE ONE
 * TEST BACKEND.
 *
 * The backend is the local Supabase built from production's own schema
 * (tests/db/harness.ts explains it; scripts/db/test-stack.mjs starts it). These
 * helpers are thin on purpose: a connection as the table owner, the harness's
 * `asUser`, and a real account. There is no wipe between tests and there must
 * never be one — every test makes its own users and asserts only about rows
 * that hang off them, which is what lets the files run in parallel against a
 * backend other runs are using too.
 *
 * So a test that counts rows counts THEIR rows: `WHERE user_id = $1`, or by the
 * ids it inserted. A count over a whole table is a count of every other test
 * running at the same moment.
 */
import { Client } from "pg"
import { newUser, stackEnv } from "@/tests/db/harness"

export { asUser } from "@/tests/db/harness"

/**
 * A connection as the database owner. Row security does not apply to it, so it
 * arranges and inspects; a test about who may see or write what goes through
 * `asUser`. The caller closes it.
 */
export async function getClient(): Promise<Client> {
  const client = new Client({ connectionString: stackEnv().DB_URL })
  await client.connect()
  return client
}

/**
 * A real account, and its id. It goes through Supabase's own signup path, so
 * its profile row comes from the real `handle_new_user` trigger — not from an
 * INSERT this file wrote, which is what the old harness did and why a trigger
 * bug could not reach these tests.
 *
 * The argument only labels the address, to make a failure readable; an email
 * passed in is cut at the `@`. Every call is a NEW account, unless
 * `TEST_SHARED_USER=1`, when every call returns the same one (the isolation
 * proof, Plans/tests-worth-their-keep.md R5).
 */
export async function createTestUser(label = "user"): Promise<string> {
  const safe = label.split("@")[0]!.replace(/[^a-z0-9-]/gi, "-") || "user"
  return (await newUser(safe)).id
}

/**
 * Insert a goal for `userId` and return its id. Raw SQL as the owner, so the
 * database's own refusals (unique indexes, foreign keys) are what answer.
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
