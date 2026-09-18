import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as styles from '@/src/programs/components/trainingStyles'

const MODULE_PATH = 'src/programs/components/trainingStyles.ts'

/**
 * WHY THIS TEST EXISTS.
 *
 * The training screens used to be three widths, two card paddings and sixteen
 * hand-typed greens. trainingStyles.ts is the single place all of that now
 * lives -- so the one thing that can quietly undo the fix is somebody editing
 * this file itself: pasting a raw palette colour back in, putting a second
 * width in it, or giving green a second job.
 *
 * These assertions are a floor on the file's contents, not a snapshot of every
 * class. Changing `px-4` to `px-5` is a design decision and passes; changing
 * `text-primary` to `text-sky-400` is the old fault coming back and fails.
 */
describe('The training screens speak one visual language', () => {
  /** Every exported string, flattened -- the DONE object's values included. */
  const allValues: [string, string][] = Object.entries(styles).flatMap(([name, value]) =>
    typeof value === 'string'
      ? [[name, value] as [string, string]]
      : Object.entries(value as Record<string, string>).map(
          ([key, v]) => [`${name}.${key}`, v] as [string, string],
        ),
  )

  test('the training screens\' widths, paddings and the colour of done come from one file', () => {
    // A raw palette colour here is the whole failure this file prevents: the
    // blue-grey "kit" that made Training look like a different app was zinc and
    // sky, typed directly into components.
    const RAW_PALETTE = /\b(zinc|sky|slate|neutral|gray|rose|red|green|violet|white|black)\b/
    for (const [name, value] of allValues) {
      expect(RAW_PALETTE.test(value), `${name} uses a raw palette colour: "${value}"`).toBe(false)
    }

    // Exactly one pixel-sized font is allowed in training, and it is the set
    // grid's column captions. Any other means a screen is shrinking text again.
    const source = fs.readFileSync(path.resolve(__dirname, '../../..', MODULE_PATH), 'utf-8')
    const pixelFonts = source.match(/text-\[[\d.]+px\]/g) ?? []
    expect(pixelFonts, 'the only pixel-sized font in training is the grid caption').toEqual([
      'text-[11px]',
    ])
    expect(styles.GRID_CAPTION).toContain('text-[11px]')

    // One width for /programs and /programs/live. Two widths is the bug.
    expect(styles.TRAINING_COLUMN).toContain('max-w-2xl')
    const widths = allValues.filter(([, v]) => /\bmax-w-(xs|sm|md|lg|xl|\dxl)\b/.test(v))
    expect(widths.map(([n]) => n), 'only TRAINING_COLUMN may set a column width').toEqual([
      'TRAINING_COLUMN',
    ])
  })

  test('green is a single object with a fixed set of jobs', () => {
    expect(Object.keys(styles.DONE).sort()).toEqual(['dot', 'notice', 'row', 'text', 'tick'])
    for (const [key, value] of Object.entries(styles.DONE)) {
      expect(value, `DONE.${key} must be the green of done`).toContain('emerald')
    }
    // ...and green appears nowhere else in the file, so no other constant can
    // start meaning "done" by accident.
    const greenElsewhere = allValues.filter(
      ([name, value]) => !name.startsWith('DONE.') && value.includes('emerald'),
    )
    expect(greenElsewhere.map(([n]) => n), 'green lives only in DONE').toEqual([])
  })

  test('it can only ever hold class names', () => {
    // A .ts, not a .tsx: no component can hide in here and start carrying its
    // own colours again.
    expect(fs.existsSync(path.resolve(__dirname, '../../..', MODULE_PATH))).toBe(true)
    for (const [name, value] of allValues) {
      expect(typeof value, `${name} must be a class string`).toBe('string')
      expect(value.trim().length, `${name} must not be empty`).toBeGreaterThan(0)
    }
  })
})
