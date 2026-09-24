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

  /**
   * A CONTROL IN THE `right` SLOT IS A SIBLING OF THE ROW, NEVER A CHILD.
   *
   * It used to be rendered inside the row's own `<button>`/`<Link>`, and this
   * prop's doc comment said "a ⋮ button" — which invited exactly what happened.
   * A `<button>` inside a `<button>` is invalid HTML, so React's server and
   * client trees disagreed and the whole subtree was discarded and re-rendered:
   * a hydration failure on the Training tab for anybody with a finished
   * program, live for weeks.
   *
   * NO TEST COULD SEE IT. Every one asked for "the" control by test id and got
   * one; the nesting only shows if you ask the DOM about ancestry, or open the
   * page cold in a browser and read the console. So it is asked here directly.
   */
  test('an interactive right slot is not nested inside the row control', () => {
    const { container } = render(
      <ProgramRow
        name="StrongLifts 5x5"
        testId="with-actions"
        onClick={() => {}}
        right={<button type="button">Start again</button>}
      />
    )

    expect(
      container.querySelectorAll('button button, a button, button a'),
      'a control inside a control is invalid HTML and fails hydration',
    ).toHaveLength(0)
    // And the slot is still there, next to the row rather than gone.
    expect(screen.getByRole('button', { name: 'Start again' })).toBeTruthy()
    expect(screen.getByTestId('with-actions')).toBeTruthy()
  })

  test('a link row with an interactive slot does not nest either', () => {
    // The `href` branch had the same shape: a button inside an anchor.
    const { container } = render(
      <ProgramRow
        name="StrongLifts 5x5"
        testId="with-link"
        href="/programs?program=e1"
        right={<button type="button">Options</button>}
      />
    )
    expect(container.querySelectorAll('a button, button a')).toHaveLength(0)
  })
})
