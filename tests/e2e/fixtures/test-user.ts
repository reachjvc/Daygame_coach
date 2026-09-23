/**
 * Test user configuration from environment variables
 */

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? '',
  password: process.env.TEST_USER_PASSWORD ?? '',
}

/**
 * Second test user for RLS/isolation tests.
 * Used to verify users cannot access each other's data.
 */
export const TEST_USER_B = {
  email: process.env.TEST_USER_B_EMAIL ?? '',
  password: process.env.TEST_USER_B_PASSWORD ?? '',
}

/**
 * THE TRAINING SUITE'S OWN ACCOUNT.
 *
 * The four browser training projects wipe it clean on every run — every
 * enrollment, past and present, and any open workout. Until 2026-09-23 they
 * wiped `TEST_USER`, which is also the account the goals and session specs use
 * and, per `.claude/rules/ui.md`, the one a person is sent to for hand-checking:
 * a walkthrough during `npm run test:e2e` lost its program mid-set.
 */
export const TEST_USER_TRAINING = {
  email: process.env.TEST_USER_TRAINING_EMAIL ?? '',
  password: process.env.TEST_USER_TRAINING_PASSWORD ?? '',
}

/**
 * Validates that required test environment variables are set.
 * Throws an error if credentials are missing.
 */
export function validateTestConfig(): void {
  if (!TEST_USER.email || !TEST_USER.password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required. ' +
        'Set them in your .env.local file or export them before running tests.'
    )
  }
}

/**
 * Validates that second user credentials are set.
 * Required for RLS isolation tests.
 */
export function validateSecondUserConfig(): void {
  if (!TEST_USER_B.email || !TEST_USER_B.password) {
    throw new Error(
      'TEST_USER_B_EMAIL and TEST_USER_B_PASSWORD environment variables are required for RLS tests. ' +
        'Set them in your .env.local file or export them before running security tests.'
    )
  }
}

/** Validates the training account's credentials, for the training projects. */
export function validateTrainingUserConfig(): void {
  if (!TEST_USER_TRAINING.email || !TEST_USER_TRAINING.password) {
    throw new Error(
      'TEST_USER_TRAINING_EMAIL and TEST_USER_TRAINING_PASSWORD are required for the ' +
        'browser training projects, which wipe their account clean on every run. ' +
        'Set them in .env.local, or in the workflow env for CI.'
    )
  }
}
