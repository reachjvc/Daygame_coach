import { describe, test, expect } from 'vitest'
import { buttonVariants } from '@/components/ui/button'

/**
 * WHAT BROKE, AND WHY THIS TEST EXISTS.
 *
 * `--background` in this app is the page's near-black and `--accent` is the
 * sunset red. A bordered ("outline") button that paints itself `bg-background`
 * while sitting on a slate card looks switched off -- that is exactly what
 * happened to "Start" on the Tracking card, which the owner read as disabled.
 * Hovering it, or any transparent ("ghost") button, flashed the red accent,
 * which reads as a warning rather than an invitation.
 *
 * Both variants also carried `dark:` classes. In this app `dark:` only applies
 * inside an element with the `dark` class (app/globals.css), and nothing ever
 * sets that class -- so those classes were dead, and their presence is what
 * made the real colours hard to see when reading the file. A `dark:` fragment
 * coming back on these two variants is the sign someone has "fixed" this by
 * reintroducing the confusion.
 */
/**
 * `buttonVariants()` returns the shared base classes plus the variant's own.
 * Only the variant's own are this test's business, so the base -- the classes
 * every variant gets -- is subtracted first. (The base legitimately carries a
 * `dark:aria-invalid:` rule; that is not these two variants' doing.)
 */
function variantOnly(variant: 'outline' | 'ghost'): string {
  const tokens = (v: 'default' | 'outline' | 'ghost' | 'link') =>
    buttonVariants({ variant: v }).split(/\s+/).filter(Boolean)
  const base = new Set(
    tokens('default').filter(
      (c) => tokens('outline').includes(c) && tokens('ghost').includes(c) && tokens('link').includes(c),
    ),
  )
  return tokens(variant)
    .filter((c) => !base.has(c))
    .join(' ')
}

describe('The app\'s bordered and transparent buttons', () => {
  test('outline and ghost buttons never paint the page background or the red accent', () => {
    const outline = variantOnly('outline')
    const ghost = variantOnly('ghost')

    // The border has to be the card's own border colour, not the default
    // `border` (which resolves to the same token but says nothing about intent).
    expect(outline, 'outline must draw its edge with the shared border token').toContain('border-border')
    expect(outline, 'outline must let the card show through').toContain('bg-transparent')

    for (const [name, classes] of [['outline', outline], ['ghost', ghost]] as const) {
      expect(classes, `${name} must not paint the page background`).not.toContain('bg-background')
      expect(classes, `${name} must not flash the red accent on hover`).not.toContain('hover:bg-accent')
      expect(classes, `${name} must not tint its text with the accent`).not.toContain('accent-foreground')
      expect(classes, `${name} must not carry dead dark: classes`).not.toContain('dark:')
    }

    // The hover state still has to be visible -- "no red" must not become "no feedback".
    expect(outline).toContain('hover:bg-muted/50')
    expect(ghost).toContain('hover:bg-muted/50')
  })

  test('the variants this phase did not touch are unchanged', () => {
    // `destructive` keeps its dark: fragment on purpose: dead like the others,
    // but deleting it app-wide is a different piece of work and changing it
    // here would be an unreviewed colour change on every delete button.
    expect(buttonVariants({ variant: 'destructive' })).toContain('bg-destructive')
    expect(buttonVariants({ variant: 'default' })).toContain('bg-primary')
  })
})
