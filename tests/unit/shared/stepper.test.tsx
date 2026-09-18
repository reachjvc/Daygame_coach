import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

import { Stepper } from '@/components/ui/stepper'

afterEach(cleanup)

/**
 * WHY THIS TEST EXISTS.
 *
 * The stepper this replaces lived in the training-only "kit" and did one thing
 * genuinely well: it held what you typed until you were finished with it. Type
 * "12" into a naive stepper and the "1" is applied the moment you press it --
 * so the program is briefly prescribed one rep, the field re-renders, and the
 * cursor jumps. Rebuilding the control on the app's own Button and Input is
 * exactly the moment that behaviour gets dropped by accident, so it is pinned
 * here alongside the two sizes that made the old one painful on a phone.
 */
describe('The tap-or-type number box', () => {
  test('typing 1 on the way to 12 does not apply 1, and the box is 44 px with 16 px type', () => {
    const onChange = vi.fn()
    render(<Stepper label="Reps" value={5} onChange={onChange} min={1} max={20} />)

    const box = screen.getByLabelText('Reps') as HTMLInputElement

    // Halfway through typing "12" the box reads "1". Nothing may be applied yet.
    fireEvent.change(box, { target: { value: '1' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: '12' } })
    expect(onChange).not.toHaveBeenCalled()

    // Leaving the box is what commits it.
    fireEvent.blur(box)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(12)

    // 44px tall and 16px type: under either, a phone makes this control hard to
    // hit and Safari zooms the whole page when you tap it.
    expect(box.className).toContain('h-11')
    expect(box.className).toContain('text-base')
    expect(box.className, 'no hand-set pixel font').not.toContain('text-[1')

    const minus = screen.getByRole('button', { name: 'One fewer Reps' })
    const plus = screen.getByRole('button', { name: 'One more Reps' })
    for (const button of [minus, plus]) {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.className).toContain('size-11')
    }
  })

  test('stepping from a half-typed number moves from what is on screen', () => {
    const onChange = vi.fn()
    render(<Stepper label="Sets" value={3} onChange={onChange} min={1} max={20} />)

    fireEvent.change(screen.getByLabelText('Sets'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'One more Sets' }))

    // 8, not 4: the number you can see is the number you are stepping from.
    expect(onChange).toHaveBeenCalledWith(8)
  })

  test('an empty or nonsense box reverts instead of erroring', () => {
    const onChange = vi.fn()
    render(<Stepper label="Sets" value={3} onChange={onChange} />)

    const box = screen.getByLabelText('Sets') as HTMLInputElement
    fireEvent.change(box, { target: { value: '' } })
    fireEvent.blur(box)

    expect(onChange).not.toHaveBeenCalled()
    expect(box.value).toBe('3')
  })

  test('it cannot step past its own bounds', () => {
    const onChange = vi.fn()
    render(<Stepper label="Sets" value={1} onChange={onChange} min={1} max={3} />)
    expect(screen.getByRole('button', { name: 'One fewer Sets' })).toBeDisabled()

    cleanup()
    render(<Stepper label="Sets" value={3} onChange={onChange} min={1} max={3} />)
    expect(screen.getByRole('button', { name: 'One more Sets' })).toBeDisabled()

    // ...and a typed number outside the bounds is refused, not clamped silently
    // into something the person did not ask for.
    fireEvent.change(screen.getByLabelText('Sets'), { target: { value: '99' } })
    fireEvent.blur(screen.getByLabelText('Sets'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
