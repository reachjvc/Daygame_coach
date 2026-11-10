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
import { describe, test, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'

import { BottomSheet } from '@/components/BottomSheet'
import { HistoryBarrierProvider } from '@/src/shared/HistoryBarrierContext'
import { LiftMenu } from '@/src/programs/components/live/LiftMenu'
import type { PrescribedExercise } from '@/src/programs/types'

afterEach(cleanup)

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
