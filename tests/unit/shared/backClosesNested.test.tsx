// @vitest-environment jsdom
/**
 * BACK CLOSES THE TOP LAYER, WHEREVER IT CAME FROM (alpha p10-retest-01, -05).
 *
 * - A sheet opened by a row of another sheet ("Last times" from the lift menu):
 *   the menu's step was being taken back while the new sheet pushed its own, so
 *   the browser ended on the page's entry with the new sheet still open, and
 *   Back left the live workout.
 * - A question asked over a sheet (the program sheet's "Skip this session?"):
 *   Back closed the sheet behind it and left the question on screen.
 */
import * as React from 'react'
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'

import { BottomSheet } from '@/components/BottomSheet'
import { HistoryBarrierProvider } from '@/src/shared/HistoryBarrierContext'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { LiftMenu } from '@/src/programs/components/live/LiftMenu'
import { ProgramSheet } from '@/src/programs/components/ProgramSheet'
import { seedEnrollment } from '@/src/programs/runtime'
import { requireProgram } from '@/src/programs/data/catalog'
import type { PrescribedExercise, ProgramEnrollment } from '@/src/programs/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const at = () => (window.history.state as { page?: string; __barrier?: number } | null) ?? {}
async function back() {
  await act(async () => {
    window.history.back()
    await new Promise((r) => setTimeout(r, 20))
  })
}
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)) })

beforeEach(() => {
  window.history.replaceState({ page: 'a' }, '', '/a')
  window.history.pushState({ page: 'b' }, '', '/b')
})

const squat = {
  exerciseId: 'squat',
  name: 'Squat',
  sets: [{ setNumber: 1, weight: 100, reps: 5 }],
  restSec: 180,
} as PrescribedExercise

/** The live workout's lift: its menu, and the history sheet one of its rows opens. */
function LiveLift() {
  const [menu, setMenu] = React.useState(false)
  const [history, setHistory] = React.useState(false)
  return (
    <HistoryBarrierProvider>
      <button type="button" onClick={() => setMenu(true)}>Options</button>
      <LiftMenu
        open={menu}
        onClose={() => setMenu(false)}
        exercise={squat}
        adjustments={{}}
        alreadyHere={['Squat']}
        wasAdded={false}
        skipped={false}
        position={{ index: 0, count: 1 }}
        onAdjust={() => {}}
        onAddWarmup={() => {}}
        onMove={() => {}}
        onHistory={() => setHistory(true)}
      />
      {history && (
        <BottomSheet open onClose={() => setHistory(false)} title="Last times" testId="lift-history-sheet">
          <p>sessions</p>
        </BottomSheet>
      )}
    </HistoryBarrierProvider>
  )
}

describe('a sheet opened from a row of another sheet', () => {
  test('Back closes it and stays on the page', async () => {
    render(<LiveLift />)
    fireEvent.click(screen.getByRole('button', { name: 'Options' }))
    await settle()
    fireEvent.click(screen.getByTestId('lift-history'))
    await settle()
    await settle()
    expect(screen.queryByTestId('lift-menu')).not.toBeInTheDocument()
    expect(screen.getByTestId('lift-history-sheet')).toBeInTheDocument()
    // the history sheet holds the newest step, right above the page's own
    expect(at().__barrier).toBeDefined()

    await back()
    expect(screen.queryByTestId('lift-history-sheet')).not.toBeInTheDocument()
    expect(at().page).toBe('b')
    expect(at().__barrier).toBeUndefined()

    // and the next Back is a real one
    await back()
    expect(at().page).toBe('a')
  })
})

function enrollment(): ProgramEnrollment {
  const program = requireProgram('stronglifts-5x5')
  const { exerciseState, cursor } = seedEnrollment(program, 'beginner', 'kg')
  return {
    id: 'e1',
    user_id: 'u1',
    program_id: 'stronglifts-5x5',
    level: 'beginner',
    unitSystem: 'kg',
    exerciseState,
    cursor,
    is_active: true,
    started_at: '2026-01-01T00:00:00.000Z',
    customSchedule: null,
  }
}

const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  refresh: () => {},
  prefetch: () => {},
} as unknown as AppRouterInstance

function Program() {
  const [open, setOpen] = React.useState(false)
  return (
    <AppRouterContext.Provider value={router}>
      <HistoryBarrierProvider>
        <button type="button" onClick={() => setOpen(true)}>Menu</button>
        <ProgramSheet open={open} onClose={() => setOpen(false)} enrollment={enrollment()} onChanged={() => {}} />
      </HistoryBarrierProvider>
    </AppRouterContext.Provider>
  )
}

async function askSkip() {
  render(<Program />)
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
  await settle()
  fireEvent.click(screen.getByTestId('sheet-skip'))
  await settle()
  expect(screen.getByTestId('sheet-confirm')).toBeInTheDocument()
}

describe('a question asked over the program sheet', () => {
  test('Back closes the question first, then the sheet, then leaves', async () => {
    await askSkip()

    await back()
    expect(screen.queryByTestId('sheet-confirm')).not.toBeInTheDocument()
    expect(screen.getByTestId('program-sheet')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/b')
    expect(at().__barrier).toBeDefined() // the sheet's own step, still there

    await back()
    expect(screen.queryByTestId('program-sheet')).not.toBeInTheDocument()
    expect(at().page).toBe('b')
    expect(at().__barrier).toBeUndefined()

    await back()
    expect(at().page).toBe('a')
  })

  test('dismissed with Escape, it leaves the sheet and its one step', async () => {
    await askSkip()
    fireEvent.keyDown(screen.getByTestId('sheet-confirm'), { key: 'Escape' })
    await settle()
    expect(screen.queryByTestId('sheet-confirm')).not.toBeInTheDocument()
    expect(screen.getByTestId('program-sheet')).toBeInTheDocument()

    await back()
    expect(screen.queryByTestId('program-sheet')).not.toBeInTheDocument()
    expect(at().page).toBe('b')
    await back()
    expect(at().page).toBe('a')
  })

  test('answered, it closes with the sheet and leaves no dead Back press', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))
    await askSkip()
    fireEvent.click(screen.getByTestId('sheet-confirm'))
    await settle()
    await settle()
    await settle()
    expect(screen.queryByTestId('sheet-confirm')).not.toBeInTheDocument()
    expect(screen.queryByTestId('program-sheet')).not.toBeInTheDocument()
    expect(at().page).toBe('b')
    expect(at().__barrier).toBeUndefined()

    await back()
    expect(at().page).toBe('a')
  })
})
