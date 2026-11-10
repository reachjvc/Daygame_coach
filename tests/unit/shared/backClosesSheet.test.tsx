// @vitest-environment jsdom
import * as React from 'react'
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'

import { BottomSheet } from '@/components/BottomSheet'
import { HistoryBarrierProvider } from '@/src/shared/HistoryBarrierContext'

afterEach(cleanup)

/** Where the browser is: the page's own entry is `{ page }`. */
const at = () => (window.history.state as { page?: string; __barrier?: number } | null) ?? {}
/** A Back press, and the popstate it fires (jsdom fires it a task later). */
async function back() {
  await act(async () => {
    window.history.back()
    await new Promise((r) => setTimeout(r, 20))
  })
}
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)) })

beforeEach(async () => {
  // two pages of history, so a stray "back a page" shows up as page "a"
  window.history.replaceState({ page: 'a' }, '')
  window.history.pushState({ page: 'b' }, '')
})

/** A sheet that stays mounted and takes `open` (AnswerSheet, More). */
function Kept() {
  const [open, setOpen] = React.useState(false)
  return (
    <HistoryBarrierProvider>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <p data-testid="typed">kept</p>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Answer" testId="sheet">
        <a
          href="/elsewhere"
          onClick={(e) => {
            // what next/link does: no page load, the router pushes the new page
            e.preventDefault()
            window.history.pushState({ page: 'elsewhere' }, '')
            setOpen(false)
          }}
        >
          Elsewhere
        </a>
      </BottomSheet>
    </HistoryBarrierProvider>
  )
}

/** A sheet that is mounted only while open (PerfectWeek, ProgramEditor). */
function Mounted() {
  const [open, setOpen] = React.useState(false)
  return (
    <HistoryBarrierProvider>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      {open && (
        <BottomSheet open onClose={() => setOpen(false)} title="Block" testId="sheet">
          <p>rows</p>
        </BottomSheet>
      )}
    </HistoryBarrierProvider>
  )
}

/**
 * BACK CLOSES THE SHEET (p10-sheets-01). Android's Back, or the browser's,
 * with a sheet open left the page: a changed audit answer was lost, and opened
 * from a ping as the first page, Back left the app. The time tracker's entry
 * sheet already took a history step so Back closes it; every sheet does now.
 */
describe.each([
  ['kept mounted', Kept],
  ['mounted only while open', Mounted],
])('a sheet %s', (_, Page) => {
  test('Back closes it and stays on the page', async () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await settle()
    expect(screen.getByTestId('sheet')).toBeInTheDocument()

    await back()
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
    expect(at().page).toBe('b')
    expect(at().__barrier).toBeUndefined()
  })

  test('closing it with X leaves no step behind and does not go back a page', async () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await settle()
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
    expect(at().page).toBe('b')
    expect(at().__barrier).toBeUndefined()

    // the next Back is a real one: it goes to page a, and nothing reopens
    await back()
    expect(at().page).toBe('a')
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
  })

  test('closing it with Escape leaves no step behind', async () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await settle()
    fireEvent.keyDown(screen.getByTestId('sheet'), { key: 'Escape' })
    await settle()
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
    expect(at().page).toBe('b')
  })

  test('opening and closing it again still takes one step each time', async () => {
    render(<Page />)
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      await settle()
      await back()
      expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
      expect(at().page).toBe('b')
    }
  })
})

describe('a link in a sheet', () => {
  test('goes to its page without the sheet stepping back over it', async () => {
    const backSpy = vi.spyOn(window.history, 'back')
    render(<Kept />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await settle()
    fireEvent.click(screen.getByRole('link', { name: 'Elsewhere' }))
    await settle()
    expect(backSpy).not.toHaveBeenCalled()
    expect(at().page).toBe('elsewhere')

    // Back from the new page lands on page b, not on a dead copy of it
    await back()
    await settle()
    expect(at().page).toBe('b')
    backSpy.mockRestore()
  })
})

describe('without the history provider (a component test)', () => {
  test('the sheet still opens and closes', () => {
    const onClose = vi.fn()
    render(<BottomSheet open onClose={onClose} title="Plain"><p>x</p></BottomSheet>)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
