import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

import { ProgramRow } from '@/src/programs/components/ProgramRow'

afterEach(cleanup)

/**
 * WHY THIS TEST EXISTS.
 *
 * Five lists of programs had grown five different rows. The one that hurt was
 * "Finished", whose controls measured 26px -- too small to hit on a phone. The
 * way that happens is not carelessness; it is five files each making the same
 * decision separately, months apart.
 *
 * So the contract pinned here is the row's shape, not its colours: what element
 * it is (a link goes somewhere, a button does something), that it is big enough
 * to hit, and that a long program name truncates instead of making one row in
 * the list taller than the rest.
 */
describe('One row shape for every program list', () => {
  test('one row shape for every program list', () => {
    render(
      <ProgramRow
        name="StrongLifts 5×5"
        meta="Beginner · 12 weeks"
        href="/programs/strong-lifts"
        right={<span data-testid="right-slot">Week 3</span>}
        testId="row-link"
      />,
    )

    // A row that navigates is a link: it opens in a new tab, it is announced as
    // a link, and the browser's own back button works afterwards.
    const link = screen.getByTestId('row-link')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/programs/strong-lifts')
    expect(link.className).toContain('min-h-14')

    const name = screen.getByText('StrongLifts 5×5')
    // jsdom cannot measure overflow, so the class is the contract.
    expect(name.className).toContain('truncate')
    expect(name.className).toContain('font-medium')

    expect(screen.getByText('Beginner · 12 weeks').className).toContain('text-xs')
    expect(screen.getByTestId('right-slot')).toBeTruthy()
  })

  test('a row that acts rather than navigates is a real button', () => {
    const onClick = vi.fn()
    render(<ProgramRow name="Upper / Lower" onClick={onClick} testId="row-button" />)

    const row = screen.getByTestId('row-button')
    expect(row.tagName).toBe('BUTTON')
    expect(row).toHaveAttribute('type', 'button')
    expect(row.className).toContain('min-h-14')

    fireEvent.click(row)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('the meta line and the right slot are optional', () => {
    render(<ProgramRow name="Couch to 5K" testId="bare" />)
    const row = screen.getByTestId('bare')
    expect(row.textContent).toBe('Couch to 5K')
  })
})
