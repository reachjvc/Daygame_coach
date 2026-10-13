/**
 * THE THREE OLD TEST ACCOUNTS, RECREATED IN THE TEST BACKEND — A BRIDGE.
 *
 * The specs not yet converted to `fixtures/test.ts` still sign in through the
 * `setup`, `setup-user-b` and `training-setup` projects as TEST_USER,
 * TEST_USER_B and TEST_USER_TRAINING. Those accounts live in the live project;
 * the app under test now talks to the local backend, where they do not exist.
 * So each is made here, confirmed, with the address and password from the env
 * (`.env.local`, or CI's secrets). One that already signs in is left alone:
 * setting its password again would end the sessions the setup projects saved,
 * and a `--no-deps` run reuses those. One that exists but refuses the password
 * (a changed `.env.local`) gets the password set again.
 *
 * They start EMPTY: whatever the live accounts had accumulated (a training
 * year, health logs, old goals) is not here. A spec that leaned on that is
 * leaning on production data, and its conversion has to seed what it needs.
 *
 * Delete this file, and `globalSetup` in playwright.config.ts, with the setup
 * projects, once every spec is converted.
 */
import { createClient } from '@supabase/supabase-js'
import { TEST_USER, TEST_USER_B, TEST_USER_TRAINING } from './test-user'
import { findUserId, stackAdmin, testStackEnv } from './stack'

const LEGACY = [
  ['TEST_USER', TEST_USER],
  ['TEST_USER_B', TEST_USER_B],
  ['TEST_USER_TRAINING', TEST_USER_TRAINING],
] as const

export default async function globalSetup(): Promise<void> {
  const env = testStackEnv()
  for (const [name, { email, password }] of LEGACY) {
    // Unset: that setup project fails on its own, naming the variable.
    if (!email || !password) continue
    const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    if (!(await anon.auth.signInWithPassword({ email, password })).error) continue
    const id = await findUserId(email)
    const { error } = id
      ? await stackAdmin().auth.admin.updateUserById(id, { password, email_confirm: true })
      : await stackAdmin().auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw new Error(`could not ${id ? 'reset' : 'create'} ${name} in the test backend: ${error.message}`)
  }
}
