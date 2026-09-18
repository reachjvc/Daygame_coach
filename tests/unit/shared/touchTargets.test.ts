import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

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
 * input, the tabs, the timetrack segmented control, the stepper and the bottom
 * tab bar. Fix those six and hundreds of individual controls come up with them;
 * let any one of them slip back and hundreds go down again.
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
describe('Every shared control is 44 px on a phone', () => {
  test('every shared control is 44 px on a phone', () => {
    const failures: string[] = []
    const require = (file: string, what: string, ok: boolean) => {
      if (!ok) failures.push(`${file}: ${what}`)
    }

    // The Button's sizes. Every one of them, because a new size added without
    // a touch height is exactly how `sm` and `icon-sm` ended up at 40px.
    const button = read('components/ui/button.tsx')
    const sizeBlock = button.slice(button.indexOf('size: {'), button.indexOf('defaultVariants'))
    // Key-then-value: some of the keys are quoted too ('icon-sm'), so a bare
    // scan for quoted strings would test the names rather than the classes.
    const sizes = [...sizeBlock.matchAll(/(?:'([\w-]+)'|(\w+))\s*:\s*'([^']*)'/g)].map((m) => ({
      name: m[1] ?? m[2],
      classes: m[3],
    }))
    expect(sizes.length, 'could not read the Button size variants').toBeGreaterThanOrEqual(6)
    for (const { name, classes } of sizes) {
      require('components/ui/button.tsx', `size "${name}" is under 44px on touch`, /\b(h-11|size-11)\b/.test(classes))
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

    // The stepper: a 44px box between two 44px buttons.
    const stepper = read('components/ui/stepper.tsx')
    require('components/ui/stepper.tsx', 'the stepper box is under 44px', /\bh-11\b/.test(stepper))
    require('components/ui/stepper.tsx', 'the stepper buttons must be icon-sm Buttons', stepper.includes('size="icon-sm"'))

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
      'components/ui/stepper.tsx',
      'components/BottomSheet.tsx',
      'components/MobileTabBar.tsx',
    ]
    const offenders = shared.filter((rel) => /text-\[(9|10|11)(\.5)?px\]/.test(read(rel)))
    expect(offenders, `These set a font under 12px:\n${offenders.join('\n')}`).toEqual([])
  })
})
