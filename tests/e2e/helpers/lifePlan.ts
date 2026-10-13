/**
 * A LIFE PLAN ON THE ACCOUNT, PUT THROUGH THE APP'S OWN ROUTE.
 *
 * Phase 8 of Plans/tests-worth-their-keep.md gives every worker a fresh,
 * empty account. The Life Mastery specs used to lean on whatever plan the
 * shared test account happened to hold — a routine step to tick, a step that
 * runs every day — and failed with "add one by hand" when it did not. Here a
 * spec says which plan it needs and gets exactly that.
 *
 * THE SAME TWO REQUESTS THE BROWSER SENDS. `POST /api/life-plan` starts the
 * plan row (or hands back the one the account has), and `PUT /api/life-plan`
 * saves the whole plan against that row's revision. The rows are built by the
 * app's own mapper (`planToRows`) from a plan run through the app's own loader
 * (`normalizeNsPlan`), so a seed is a plan the flow could have written, not a
 * set of rows a test made up. Nothing here touches the database directly.
 *
 * EVERY SEED IS A CLEAN SLATE. Each part gets a new id, so the save deletes
 * the account's previous plan parts and, with them, every tick and rating
 * made against them (the day tables cascade from the plan's nodes). That is
 * what lets a test that ticks a step assert it was not ticked before, on an
 * account an earlier test in the same worker already used. Day notes and
 * journal lines are rows of the DAY, not of a plan part, and survive a seed;
 * a test that reads one back writes it first.
 */

import { expect, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { planToRows } from '@/src/goals/lifePlanMapper'
import { normalizeNsPlan } from '@/src/goals/northStarService'

export interface SeededPlan {
  /** The revision the account's plan is at after the seed. */
  revision: number
  /** The account's node id for one of the plan's own ids. Throws on an id the plan does not have. */
  nodeId: (localId: string) => string
}

/**
 * Makes `plan` the account's Life Mastery plan.
 *
 * `plan` is the shape the flow keeps in the browser (`NsPlan`); anything it
 * leaves out is filled in by the loader, the same way a short plan in
 * localStorage is. `userId` is the signed-in account's id — the server stamps
 * the owner from the session anyway, so a wrong one cannot write anywhere else.
 */
export async function seedLifePlan(page: Page, userId: string, plan: object): Promise<SeededPlan> {
  const normalized = normalizeNsPlan(plan)
  if (!normalized) throw new Error('seedLifePlan: the loader refused this plan outright')

  const started = await page.request.post('/api/life-plan')
  expect(started.status(), `could not start a plan on the account: ${await started.text()}`).toBe(200)
  const row = (await started.json()) as { id: string; revision: number }

  const ids = new Map<string, string>()
  const rows = planToRows(normalized, {
    planId: row.id,
    userId,
    idFor: (localId) => {
      const id = randomUUID()
      ids.set(localId, id)
      return id
    },
  })

  const saved = await page.request.put('/api/life-plan', { data: { plan: rows, revision: row.revision } })
  expect(saved.status(), `the account refused the seeded plan: ${await saved.text()}`).toBe(200)
  const { revision } = (await saved.json()) as { revision: number }

  return {
    revision,
    nodeId: (localId) => {
      const id = ids.get(localId)
      if (!id) throw new Error(`seedLifePlan: the seeded plan has no part called "${localId}"`)
      return id
    },
  }
}

/**
 * A plan holding one routine with the given steps, and nothing else.
 *
 * `daysPerWeek: 7` with no `days` is a step that runs every day — the one the
 * Today screen draws with a checkbox on any date. A step placed on named days
 * is listed under "On other days" on the rest, without one.
 */
export function planWithSteps(
  steps: Array<{ id: string; title: string; daysPerWeek: number; days?: number[]; startMin?: number | null }>,
): object {
  return {
    version: 1,
    seq: 10,
    areas: [{ id: 'lm_fitness', label: 'Fitness', sublabel: 'Strength', color: '#0ea5e9', custom: false }],
    routines: [
      {
        id: 'r1',
        label: 'Morning',
        blueprintId: 'morning',
        kind: 'sequence',
        areaId: null,
        serves: [],
        daysPerWeek: 7,
        splitDays: [],
        steps: steps.map((step) => ({
          libraryStepId: null,
          minutes: 5,
          dimension: 'body',
          servesGoalIds: [],
          days: [],
          startMin: 420,
          ...step,
        })),
      },
    ],
    goals: [],
    priorityIds: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}
