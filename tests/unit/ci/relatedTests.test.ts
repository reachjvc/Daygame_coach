// @vitest-environment node
/**
 * THE PRE-COMMIT HOOK RUNS THE TESTS THAT REACH A STAGED FILE (D2).
 *
 * `scripts/related-tests.mjs` finds them by reading import specifiers, not by
 * running vitest. These pin what it must follow (so a commit cannot skip the
 * test that covers it) and what it must not drag in.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { relatedTests } from '../../../scripts/related-tests.mjs'

let root: string
const write = (file: string, text = '') => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), text)
}

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'related-'))
  write('src/a/leaf.ts', 'export const leaf = 1')
  write('src/a/mid.ts', "import { leaf } from './leaf'\nexport const mid = leaf")
  write('src/a/top.ts', "import { mid } from '@/src/a/mid'\nexport const top = mid")
  write('src/b/index.ts', 'export const b = 1')
  write('src/b/user.ts', "import { b } from './index'\nexport const u = b")
  write('src/c/lazy.ts', 'export const lazy = 1')
  write('src/c/loader.ts', "export const load = () => import('./lazy')")
  write('src/d/mocked.ts', 'export const m = 1')
  write('src/d/data.json', '{}')
  write('src/d/readsJson.ts', "import data from './data.json'\nexport default data")
  write('src/e/alone.ts', 'export const alone = 1')
  write('src/f/shape.ts', 'export type Shape = { a: number }\nexport const shapeValue = 1')
  write('src/f/typeUser.ts', "import type { Shape } from './shape'\nexport const t: Shape = { a: 1 }")
  write('src/f/reExport.ts', "export type { Shape } from './shape'")
  write('src/f/mixedUser.ts', "import { type Shape, shapeValue } from './shape'\nexport const m: Shape = { a: shapeValue }")
  write('tests/unit/direct.test.ts', "import { leaf } from '@/src/a/leaf'")
  write('tests/unit/transitive.test.tsx', "import { top } from '@/src/a/top'")
  write('tests/unit/viaIndex.test.ts', "import { u } from '@/src/b/user'")
  write('tests/unit/viaDynamic.test.ts', "import { load } from '@/src/c/loader'")
  write('tests/unit/viaMock.test.ts', "import { vi } from 'vitest'\nvi.mock('@/src/d/mocked', () => ({}))")
  write('tests/unit/viaJson.test.ts', "import d from '@/src/d/readsJson'")
  write('tests/unit/unrelated.test.ts', "import { x } from 'some-package'")
  write('tests/unit/viaTypeOnly.test.ts', "import { t } from '@/src/f/typeUser'\nimport type { Shape } from '@/src/f/reExport'")
  write('tests/unit/viaMixed.test.ts', "import { m } from '@/src/f/mixedUser'")
  write('tests/e2e/browser.spec.ts', "import { leaf } from '@/src/a/leaf'")
  write('tests/e2e/helper.test.ts', "import { leaf } from '@/src/a/leaf'")
  write('node_modules/pkg/index.ts', "import { leaf } from '@/src/a/leaf'")
})
afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

describe('which tests a staged file reaches', () => {
  test('a test that imports it directly, and one that reaches it through two files', () => {
    expect(relatedTests(['src/a/leaf.ts'], root)).toEqual(['tests/unit/direct.test.ts', 'tests/unit/transitive.test.tsx'])
  })

  test('a file in the middle reaches only the tests above it', () => {
    expect(relatedTests(['src/a/mid.ts'], root)).toEqual(['tests/unit/transitive.test.tsx'])
  })

  test('an index file is found by its folder, a dynamic import and a vi.mock count as imports', () => {
    expect(relatedTests(['src/b/index.ts'], root)).toEqual(['tests/unit/viaIndex.test.ts'])
    expect(relatedTests(['src/c/lazy.ts'], root)).toEqual(['tests/unit/viaDynamic.test.ts'])
    expect(relatedTests(['src/d/mocked.ts'], root)).toEqual(['tests/unit/viaMock.test.ts'])
  })

  test('a data file a source file imports reaches the tests of that source file', () => {
    expect(relatedTests(['src/d/data.json'], root)).toEqual(['tests/unit/viaJson.test.ts'])
  })

  test('a type-only import does not run the file it names; an import that also takes a value does', () => {
    expect(relatedTests(['src/f/shape.ts'], root)).toEqual(['tests/unit/viaMixed.test.ts'])
    expect(relatedTests(['src/f/typeUser.ts'], root)).toEqual(['tests/unit/viaTypeOnly.test.ts'])
  })

  test('a staged test file is itself run', () => {
    expect(relatedTests(['tests/unit/unrelated.test.ts'], root)).toEqual(['tests/unit/unrelated.test.ts'])
  })

  test('a file nothing imports reaches no test; browser specs and packages are not unit tests', () => {
    expect(relatedTests(['src/e/alone.ts'], root)).toEqual([])
    expect(relatedTests(['src/a/leaf.ts'], root)).not.toContain('tests/e2e/helper.test.ts')
    expect(relatedTests(['src/a/leaf.ts'], root)).not.toContain('tests/e2e/browser.spec.ts')
  })
})
