// @vitest-environment jsdom
import * as React from 'react'
import { createPortal } from 'react-dom'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

import { BottomSheet, OVER_SHEET } from '@/components/BottomSheet'

afterEach(cleanup)

/**
 * A BAR OVER THE SHEET IS HEARD (p10-sheets-02). A modal sheet hides
 * everything outside it from screen readers (aria-hidden on the page behind).
 * The audit's "Deleted · Undo" bar and the time tracker's toasts are meant to
 * work while a sheet is open; a finger could tap Undo, but a screen reader was
 * told nothing and could not find the button.
 */
describe('a bar marked to sit over a sheet', () => {
  function Page({ sheet }: { sheet: boolean }) {
    return (
      <>
        {createPortal(
          <div {...OVER_SHEET} role="status" data-testid="bar">
            Deleted <button type="button">Undo</button>
          </div>,
          document.body,
        )}
        <main>
          <p data-testid="behind">The page</p>
        </main>
        <BottomSheet open={sheet} onClose={vi.fn()} title="Mute pings">
          <button type="button">Mute</button>
        </BottomSheet>
      </>
    )
  }

  test('stays visible to a screen reader while a sheet opens over the page', async () => {
    const { rerender } = render(<Page sheet={false} />)
    rerender(<Page sheet />)
    await act(async () => {})
    // the page behind IS hidden: the sheet is modal
    expect(screen.getByTestId('behind').closest('[aria-hidden="true"]')).not.toBeNull()
    // the bar is not, and its Undo is found as a button
    expect(screen.getByTestId('bar').closest('[aria-hidden="true"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    // and is announced: a live region
    expect(screen.getByTestId('bar')).toHaveAttribute('aria-live', 'polite')
  })
})
