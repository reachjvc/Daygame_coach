import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import type { VariantProps } from 'class-variance-authority'

import { buttonVariants } from '@/components/ui/button'

const projectRoot = path.resolve(__dirname, '../../..')
/**
 * Reads a file with its comments removed.
 *
 * Every comment in these files explains the 44px rule, so a naive scan finds
 * `h-11` in the prose and passes on a file whose actual classes have been
 * reverted. The code is what ships; the comments are not.
 */
const read = (rel: string) =>
  fs
    .readFileSync(path.join(projectRoot, rel), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[^\n'"`]*\/\/.*$/gm, '')

/**
 * 44 PIXELS, OR YOU MISS IT.
 *
 * A control smaller than about 44px square is one an adult thumb cannot hit
 * reliably. This app measured 250 of them across 25 pages on an iPhone 14, and
 * almost all of them came from a handful of shared parts: the button, the
 * input, the tabs, the timetrack segmented control and the bottom tab bar. Fix
 * those five and hundreds of individual controls come up with them; let any
 * one of them slip back and hundreds go down again.
 *
 * So this reads the shared parts themselves rather than any screen. It is a
 * source read on purpose: jsdom has no layout engine and would report every
 * height as zero, and a browser test only covers the pages it happens to visit.
 * The browser check that actually measures pixels is
 * tests/e2e/programs-one-language.spec.ts.
 *
 * `sm:` heights are not this test's business -- those apply on a desktop, where
 * the pointer is a mouse.
 */
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>

/**
 * Every Button size, typed against the variant itself. Add a size to
 * components/ui/button.tsx and this record stops compiling (the typecheck
 * ratchet fails) until the size is listed here -- so a new size cannot skip the
 * 44px check the way `sm` and `icon-sm` once sat at 40px.
 */
const BUTTON_SIZES: Record<ButtonSize, true> = {
  default: true,
  sm: true,
  lg: true,
  icon: true,
  'icon-sm': true,
  'icon-lg': true,
}

describe('Every shared control is 44 px on a phone', () => {
  test('every shared control is 44 px on a phone', () => {
    const failures: string[] = []
    const require = (file: string, what: string, ok: boolean) => {
      if (!ok) failures.push(`${file}: ${what}`)
    }

    // The Button's sizes, as the component computes them. A phone sees only
    // the unprefixed height: `sm:h-11` would be a desktop height, and a second
    // bare `h-*` beside `h-11` would be a conflict, so exactly one is allowed.
    for (const size of Object.keys(BUTTON_SIZES) as ButtonSize[]) {
      const heights = buttonVariants({ size })
        .split(/\s+/)
        .filter((c) => /^(h|size)-/.test(c))
      require(
        'components/ui/button.tsx',
        `size "${size}" is [${heights.join(' ')}] on touch, not h-11 or size-11`,
        heights.length === 1 && (heights[0] === 'h-11' || heights[0] === 'size-11'),
      )
    }

    const input = read('components/ui/input.tsx')
    require('components/ui/input.tsx', 'Input is not h-11 on touch', /\bh-11\b/.test(input))

    // Tabs: the list grows to fit its triggers, and the triggers carry the
    // height. A fixed-height list with short triggers looks right and is not.
    const tabs = read('components/ui/tabs.tsx')
    const tabsList = tabs.slice(tabs.indexOf('const TabsList'), tabs.indexOf('const TabsTrigger'))
    const tabsTrigger = tabs.slice(tabs.indexOf('const TabsTrigger'), tabs.indexOf('const TabsContent'))
    require('components/ui/tabs.tsx', 'TabsList must be h-auto', /\bh-auto\b/.test(tabsList))
    require('components/ui/tabs.tsx', 'TabsTrigger is under 44px on touch', /\bh-11\b/.test(tabsTrigger))

    // The timetrack segmented control, both of its sizes.
    const primitives = read('src/timetrack/components/primitives.tsx')
    const segmented = primitives.slice(
      primitives.indexOf('export function Segmented'),
      primitives.indexOf('export function ToggleRow'),
    )
    const branches = segmented.match(/size === "sm" \? "([^"]*)" : "([^"]*)"/)
    expect(branches, 'could not read the Segmented size branches').not.toBeNull()
    require('src/timetrack/components/primitives.tsx', 'Segmented sm is under 44px on touch', /\bh-11\b/.test(branches![1]))
    require('src/timetrack/components/primitives.tsx', 'Segmented default is under 44px on touch', /\bh-11\b/.test(branches![2]))

    // The bottom tab bar's six items, on every page in the app.
    const bar = read('components/MobileTabBar.tsx')
    require('components/MobileTabBar.tsx', 'the bar items are under 44px', /\bmin-h-11\b/.test(bar))

    expect(
      failures,
      'These shared controls are under the 44px a thumb needs on a phone.\n' +
        'Each one of them carries hundreds of controls across the app:\n' +
        failures.join('\n'),
    ).toEqual([])
  })

  test('no text in the shared controls is under 12 px', () => {
    // 11px labels on the tab bar were the last sub-12px text on every page.
    const shared = [
      'components/ui/button.tsx',
      'components/ui/input.tsx',
      'components/ui/tabs.tsx',
      'components/BottomSheet.tsx',
      'components/MobileTabBar.tsx',
    ]
    const offenders = shared.filter((rel) => /text-\[(9|10|11)(\.5)?px\]/.test(read(rel)))
    expect(offenders, `These set a font under 12px:\n${offenders.join('\n')}`).toEqual([])
  })
})
