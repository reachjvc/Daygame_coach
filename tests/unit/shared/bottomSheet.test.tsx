// @vitest-environment jsdom
import * as React from 'react'
import { ROUTES } from "@/src/shared/routes"
import { describe, test, expect, vi, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

import { BottomSheet, SheetRow } from '@/components/BottomSheet'

const projectRoot = path.resolve(__dirname, '../../..')

afterEach(cleanup)

/**
 * WHY THIS TEST EXISTS.
 *
 * The app had one bottom sheet, hand-built inside the bottom tab bar, and four
 * more screens were about to need one. The risk is not that the new ones look
 * wrong -- it is that somebody hand-builds a fifth, and the fixes that went
 * into the shared one (44px rows, a real close button, Escape, an announced
 * dialog) exist in one sheet out of five.
 *
 * So this checks that the shared sheet behaves, and that no sheet row both
 * submits a form and closes the sheet.
 */
describe('One bottom sheet for every menu', () => {
  test('the More menu and a training menu are the same sheet', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} title="More" testId="more-sheet">
        <SheetRow href={ROUTES.settings}>Settings</SheetRow>
        <SheetRow destructive testId="delete-row">
          Delete this program
        </SheetRow>
      </BottomSheet>,
    )

    // A screen reader has to be told this is a dialog and that the page behind
    // it is out of reach. The hand-built sheet said neither.
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('data-testid', 'more-sheet')
    expect(dialog).toHaveAccessibleName('More')

    // Every row is at least 44px -- the whole point of moving them here.
    const settings = screen.getByRole('link', { name: 'Settings' })
    const destructive = screen.getByTestId('delete-row')
    for (const row of [settings, destructive]) {
      expect(row.className).toContain('min-h-11')
    }
    expect(destructive.className).toContain('text-destructive')
    expect(settings.className).not.toContain('text-destructive')

    // The close control is the app's own Button, not a bare 20px icon.
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close).toHaveAttribute('data-slot', 'button')

    // Escape closes. Before the move, the only way out was the X or the exact
    // strip of backdrop above the panel.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  test('no sheet row both submits a form and closes the sheet', () => {
    /**
     * CAUGHT IN A BROWSER, NOT BY A TEST.
     *
     * "Log Out" sat inside a form and also closed the sheet on click. Closing
     * unmounts the form, and React flushes that before the browser dispatches
     * the submit — so the menu slid away and you stayed signed in. The button
     * looked like it worked, which is the worst kind of broken.
     *
     * jsdom cannot reproduce it (it has no real default-action dispatch), so
     * the guard is on the source: the four sheets still to be built each have
     * a row like this — delete a program, end a week — and each would find the
     * same trap on its own. This one catches the shape, everywhere, at once.
     */
    const roots = ['components', 'src', 'app']
    const files: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`
        if (entry.isDirectory()) walk(rel)
        else if (/\.tsx$/.test(entry.name)) files.push(rel)
      }
    }
    roots.forEach(walk)

    const offenders: string[] = []
    for (const rel of files) {
      const source = fs.readFileSync(path.join(projectRoot, rel), 'utf-8')
      // Each <SheetRow ...> opening tag, brace-aware so an arrow function in a
      // prop does not end the tag early.
      const finder = /<SheetRow\b/g
      let match: RegExpExecArray | null
      while ((match = finder.exec(source)) !== null) {
        let depth = 0
        let quote: string | null = null
        let i = match.index
        for (; i < source.length; i++) {
          const c = source[i]
          if (quote) {
            if (c === quote) quote = null
            continue
          }
          if (c === '"' || c === "'" || c === '`') quote = c
          else if (c === '{') depth++
          else if (c === '}') depth--
          else if (c === '>' && depth === 0) break
        }
        const tag = source.slice(match.index, i + 1)
        finder.lastIndex = i + 1
        if (tag.includes('type="submit"') && tag.includes('onClick')) {
          offenders.push(`${rel}: ${tag.replace(/\s+/g, ' ').slice(0, 90)}`)
        }
      }
    }

    expect(
      offenders,
      'A submitting row must not close the sheet: closing unmounts the form\n' +
        'before the browser submits it, and the row silently does nothing.\n' +
        'The navigation or refresh that follows takes the sheet away by itself:\n' +
        offenders.join('\n'),
    ).toEqual([])
  })

  test('a closed sheet renders nothing at all', () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="More">
        <SheetRow>Settings</SheetRow>
      </BottomSheet>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('a double click on the panel is one intent (alpha p9-saves-04)', () => {
  test('the second press of a double click, landing just off a panel that shrank, does not close it', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} title="Answer">
        <button type="button">Save</button>
      </BottomSheet>,
    )
    // Radix starts listening for outside presses a tick after it opens
    await new Promise((r) => setTimeout(r, 10))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Save' }), { clientX: 300, clientY: 400 })
    fireEvent.pointerDown(document.body, { clientX: 302, clientY: 401 })
    expect(onClose).not.toHaveBeenCalled()
    // a press off the panel somewhere else still closes it
    fireEvent.pointerDown(document.body, { clientX: 20, clientY: 20 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

/**
 * A BAR MARKED TO STAY USABLE OVER A SHEET (review of 12c050e4, sev 3/4).
 *
 * The sheet is a modal dialog at every width, so a press outside it closes it
 * and the page behind takes no presses. The audit's "Deleted · Undo" bar sits
 * above the sheet: tapping Undo closed the sheet and did nothing else. A bar
 * marked `OVER_SHEET` takes its presses and leaves the sheet open.
 */
describe('a bar over the sheet (review of 12c050e4)', () => {
  test('a press on it does not close the sheet, and its button works', async () => {
    const { OVER_SHEET } = await import('@/components/BottomSheet')
    const onClose = vi.fn()
    const onUndo = vi.fn()
    render(
      <>
        <BottomSheet open onClose={onClose} title="Answer">
          <button type="button">Save</button>
        </BottomSheet>
        <div {...OVER_SHEET} className="pointer-events-auto">
          <button type="button" onClick={onUndo}>Undo</button>
        </div>
      </>,
    )
    await new Promise((r) => setTimeout(r, 10))
    const undo = screen.getByRole('button', { name: 'Undo', hidden: true })
    fireEvent.pointerDown(undo, { clientX: 20, clientY: 20 })
    fireEvent.focusIn(undo)
    fireEvent.click(undo)
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    // a press anywhere else off the panel still closes it
    fireEvent.pointerDown(document.body, { clientX: 20, clientY: 20 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('the audit Undo bar and the time tracker toasts are marked', () => {
    for (const file of ['src/audit/components/AuditScreen.tsx', 'src/timetrack/components/TogglLab.tsx']) {
      expect(fs.readFileSync(path.join(projectRoot, file), 'utf8')).toMatch(/\{\.\.\.OVER_SHEET\}/)
    }
  })
})
