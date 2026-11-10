// @vitest-environment jsdom
import * as React from 'react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'

import { BottomSheet } from '@/components/BottomSheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ActionToast } from '@/src/goals/components/ActionToast'
import { CelebrationOverlay } from '@/src/goals/components/CelebrationOverlay'

afterEach(cleanup)

/** The `z-[N]` a class list sets, or the Tailwind `z-N`. */
function zOf(el: Element): number {
  const m = el.className.toString().match(/(?:^|\s)z-\[?(\d+)\]?(?:\s|$)/)
  if (!m) throw new Error(`no z-index class on ${el.outerHTML.slice(0, 80)}`)
  return Number(m[1])
}

/**
 * A QUESTION ASKED FROM INSIDE A SHEET (p10-deletes-02, code review of
 * eb3338f3). Every sheet became a modal dialog at z 9600; an ordinary dialog
 * was z 50, so "Skip this session?" or Log Out's "Not saved yet" opened from a
 * sheet was drawn under it, and the first tap on the sheet closed the question.
 */
describe('a dialog opened from inside a sheet', () => {
  function Both({ onSheetClose }: { onSheetClose: () => void }) {
    const [confirm, setConfirm] = React.useState(true)
    return (
      <BottomSheet open onClose={onSheetClose} title="Program" testId="sheet">
        <p>rows</p>
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogContent>
            <DialogTitle>Skip this session?</DialogTitle>
            <button type="button">Skip</button>
          </DialogContent>
        </Dialog>
      </BottomSheet>
    )
  }

  test('is drawn above the sheet and below the toasts', () => {
    render(<Both onSheetClose={vi.fn()} />)
    const sheet = screen.getByTestId('sheet')
    const content = document.querySelector('[data-slot="dialog-content"]')!
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    for (const el of [content, overlay]) {
      expect(zOf(el)).toBeGreaterThan(zOf(sheet))
      expect(zOf(el)).toBeLessThan(9700)
    }
  })

  test('a press on its buttons leaves both open, and Escape closes only the question', async () => {
    const onSheetClose = vi.fn()
    render(<Both onSheetClose={onSheetClose} />)
    await act(async () => {})
    const skip = screen.getByRole('button', { name: 'Skip' })
    fireEvent.pointerDown(skip)
    fireEvent.click(skip)
    expect(screen.getByText('Skip this session?')).toBeInTheDocument()
    expect(onSheetClose).not.toHaveBeenCalled()

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(screen.queryByText('Skip this session?')).not.toBeInTheDocument()
    expect(onSheetClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('sheet')).toBeInTheDocument()
  })
})

/**
 * TOASTS OVER DIALOGS (alpha p9, review of 39f9193e). Dialogs moved up to 9650;
 * the goals page's toasts stayed at 100 and 50, so a toast reporting what a
 * dialog just did was drawn under the dialog's dark overlay.
 */
describe('a toast', () => {
  test('is drawn above dialogs', () => {
    render(
      <>
        <ActionToast message="Failed to delete goal" variant="error" onDismiss={vi.fn()} />
        <CelebrationOverlay tier="subtle" goalTitle="Run" onDismiss={vi.fn()} />
        <CelebrationOverlay tier="toast" goalTitle="Read" onDismiss={vi.fn()} />
      </>,
    )
    const toasts = [
      screen.getByText('Failed to delete goal').parentElement!,
      screen.getByText('Done!').parentElement!.parentElement!,
      screen.getByText('Goal complete: Read').parentElement!.parentElement!,
    ]
    for (const el of toasts) expect(zOf(el)).toBeGreaterThanOrEqual(9700)
  })
})
