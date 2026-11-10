// @vitest-environment jsdom
import * as React from 'react'
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'

import { BottomSheet } from '@/components/BottomSheet'
import { HistoryBarrierProvider } from '@/src/shared/HistoryBarrierContext'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useRouter } from 'next/navigation'

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
  window.history.replaceState({ page: 'a' }, '', '/a')
  window.history.pushState({ page: 'b' }, '', '/b')
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
            window.history.pushState({ page: 'elsewhere' }, '', '/elsewhere')
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

  test('Back, then Forward, gets back to the page the link opened', async () => {
    render(<Kept />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await settle()
    fireEvent.click(screen.getByRole('link', { name: 'Elsewhere' }))
    await settle()

    await back()
    await settle()
    expect(at().page).toBe('b')

    await act(async () => {
      window.history.forward()
      await new Promise((r) => setTimeout(r, 20))
    })
    await settle()
    expect(at().page).toBe('elsewhere')

    // and Back from there still goes to page b
    await back()
    await settle()
    expect(at().page).toBe('b')
  })
})

/**
 * What Next's router does with push/replace: the history entry is written a
 * moment later, when the new page is ready, and a Back/Forward (popstate) in
 * between cancels it (app-router-instance: a restore pre-empts the navigation).
 */
function fakeRouter() {
  let pending: { cancelled: boolean } | null = null
  const onPop = () => { if (pending) pending.cancelled = true }
  window.addEventListener('popstate', onPop)
  const go = (kind: 'push' | 'replace') => (href: string) => {
    const p = { cancelled: false }
    pending = p
    setTimeout(() => {
      if (p.cancelled) return
      pending = null
      if (kind === 'push') window.history.pushState({ page: href }, '')
      else window.history.replaceState({ page: href }, '')
    }, 10)
  }
  const router = {
    push: go('push'),
    replace: go('replace'),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => {},
  } as unknown as AppRouterInstance
  return { router, stop: () => window.removeEventListener('popstate', onPop) }
}

/** A sheet whose rows go to another page through the router (the programs ⋮ sheets). */
function Routed({ kind, closeFirst }: { kind: 'push' | 'replace'; closeFirst: boolean }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Program" testId="sheet">
        <button
          type="button"
          onClick={() => {
            if (closeFirst) setOpen(false)
            router[kind]('/next')
          }}
        >
          Go
        </button>
      </BottomSheet>
    </>
  )
}

describe.each([
  ['replace', true],
  ['replace', false],
  ['push', true],
  ['push', false],
] as const)('a sheet row that calls router.%s (closing the sheet itself: %s)', (kind, closeFirst) => {
  let fake: ReturnType<typeof fakeRouter>
  beforeEach(() => { fake = fakeRouter() })
  afterEach(() => fake.stop())

  test('goes to the page, and leaves the history as if the sheet took no step', async () => {
    render(
      <AppRouterContext.Provider value={fake.router}>
        <HistoryBarrierProvider>
          <Routed kind={kind} closeFirst={closeFirst} />
        </HistoryBarrierProvider>
      </AppRouterContext.Provider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    await settle()
    await settle()
    expect(at().page).toBe('/next')
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()

    // Back: replace took page b's place, so it goes to a; push goes to b
    await back()
    await settle()
    expect(at().page).toBe(kind === 'replace' ? 'a' : 'b')
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
