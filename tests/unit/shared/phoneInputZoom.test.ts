import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const projectRoot = path.resolve(__dirname, '../../..')

/**
 * WHY THIS TEST EXISTS.
 *
 * iOS Safari zooms the entire page when you focus a text box whose font is
 * under 16px, and it does not zoom back out afterwards -- so one tap on a
 * small number box leaves the rest of the screen oversized until the person
 * pinches it back themselves.
 *
 * app/globals.css has had a rule against this for a long time and it never
 * worked: a bare `input` selector is weaker than any Tailwind size class, so
 * all 433 sub-16px boxes in the app beat it. The fix is `!important`, and the
 * danger of `!important` is the other direction -- `max(16px, 1em)` reads the
 * PARENT's size, so an unguarded rule would force the nine boxes the app
 * deliberately makes large back DOWN to 16px on a phone.
 *
 * Both halves matter and neither is visible without a phone, so both are
 * pinned here. The browser check that actually measures a rendered box is
 * tests/e2e/programs-one-language.spec.ts.
 */
describe('The phone zoom rule', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'app/globals.css'), 'utf-8')

  /** The one media block that carries the rule. */
  function phoneBlock(): string {
    const start = css.indexOf('@media screen and (max-width: 767px)')
    expect(start, 'the phone-width media block is gone from app/globals.css').toBeGreaterThan(-1)
    const open = css.indexOf('{', start)
    let depth = 0
    let i = open
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') {
        depth--
        if (depth === 0) break
      }
    }
    return css.slice(start, i + 1)
  }

  test('the phone input rule can no longer be beaten by a size class, and large boxes stay large', () => {
    const block = phoneBlock()

    expect(block, 'the rule itself is missing').toContain('font-size: max(16px, 1em)')
    expect(
      block,
      'without !important any Tailwind size class beats this rule, which is why\n' +
        'it never worked -- 433 boxes in the app are smaller than 16px',
    ).toMatch(/font-size:\s*max\(16px,\s*1em\)\s*!important/)

    // The guard that keeps the deliberately-large boxes large. Without it,
    // `!important` drags quick add, the field report and the report builder
    // down from 18px to 16px on a phone.
    for (const size of ['text-lg', 'text-xl', 'text-2xl', 'text-3xl']) {
      expect(block, `boxes asking to be ${size} must be left alone`).toContain(
        `:not([class~="${size}"])`,
      )
    }

    // All three kinds of box, not just <input>.
    for (const el of ['input', 'textarea', 'select']) {
      expect(block, `${el} is not covered by the rule`).toMatch(
        new RegExp(`(^|[\\s,])${el}:not\\(\\[class~="text-lg"\\]\\)`, 'm'),
      )
    }
  })

  test('the nine boxes the app makes large all ask for it with text-lg', () => {
    // If somebody makes a box large with `text-[18px]` or `text-xl` instead,
    // the guard list above has to grow with it -- so the set is checked rather
    // than assumed. These are the boxes that would otherwise shrink.
    const LARGE_BOXES = [
      'src/exercising/components/ExercisingPage.tsx',
      'src/goals/components/north-star/AreaDialog.tsx',
      'src/goals/components/views/V11ViewA.tsx',
      'src/goals/components/views/V11ViewB.tsx',
      'src/tracking/components/CustomReportBuilder.tsx',
      'src/tracking/components/FieldReportPage.tsx',
      'src/tracking/components/QuickAddModal.tsx',
    ]
    for (const rel of LARGE_BOXES) {
      const source = fs.readFileSync(path.join(projectRoot, rel), 'utf-8')
      expect(source, `${rel} no longer has a large box — check the guard list`).toMatch(
        /text-lg/,
      )
    }
  })
})
