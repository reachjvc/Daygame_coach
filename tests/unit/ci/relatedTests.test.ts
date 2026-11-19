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

describe('review findings, pinned (Phase 7 step 3)', () => {
  let r: string
  const put = (file: string, text = '') => {
    fs.mkdirSync(path.dirname(path.join(r, file)), { recursive: true })
    fs.writeFileSync(path.join(r, file), text)
  }
  beforeAll(() => {
    r = fs.mkdtempSync(path.join(os.tmpdir(), 'related-review-'))
    // 1: folders named data/infra/docs/public are code folders below the root
    put('src/tracking/data/rules.ts', 'export const rules = 1')
    put('tests/unit/tracking/rules.test.ts', "import { rules } from '@/src/tracking/data/rules'")
    put('app/api/healthz/route.ts', 'export const GET = 1')
    put('tests/unit/infra/healthz.test.ts', "import { GET } from '@/app/api/healthz/route'")
    put('public/sw.js', 'self.x = 1')
    put('tests/unit/shared/sw.test.ts', "import sw from '@/public/sw.js'")
    put('docs/ignored.ts', 'export const d = 1')
    put('tests/unit/docs/readsDocs.test.ts', "import { d } from '@/docs/ignored'")
    // 2: a deleted file is not on disk; its importers still are
    put('src/gone/user.ts', "import { gone } from './removed'")
    put('tests/unit/gone.test.ts', "import { u } from '@/src/gone/user'")
    put('tests/unit/removedItself.test.ts', "import { x } from 'pkg'")
    // 3: tests that read files with fs
    put('supabase/migrations/001_a.sql', 'select 1')
    put('tests/unit/db/migrations.test.ts', "fs.readdirSync('supabase/migrations')")
    put('infra/deploy.sh', 'echo')
    put('tests/unit/infra/deploy.test.ts', "fs.readFileSync('infra/deploy.sh')")
    put('tests/unit/other.test.ts', "fs.readFileSync('infra/other.sh')")
    // 7: a semicolon-free type export must not swallow the next real import
    put('src/tracking/types.ts', "export type Foo = { a: number }\nimport { real } from './real'\nexport const t = real")
    put('src/tracking/real.ts', 'export const real = 1')
    put('tests/unit/tracking/real.test.ts', "import { real } from '@/src/tracking/real'")
    put('tests/unit/tracking/typesUser.test.ts', "import { t } from '@/src/tracking/types'")
    put('src/tracking/barrel.ts', "export type { Foo }\nimport { real2 } from './real2'\nexport const b = real2")
    put('src/tracking/real2.ts', 'export const real2 = 1')
    put('tests/support/appRoutes.ts', 'export const walk = 1')
    put('tests/unit/navigation/gated.test.ts', "import { walk } from '@/tests/support/appRoutes'")
    put('app/quit/lab/page.tsx', 'export default function P() { return null }')
  })
  afterAll(() => fs.rmSync(r, { recursive: true, force: true }))

  test('data, infra, docs and public below the root are searched; public/sw.js resolves', () => {
    expect(relatedTests(['src/tracking/data/rules.ts'], r)).toEqual(['tests/unit/tracking/rules.test.ts'])
    expect(relatedTests(['app/api/healthz/route.ts'], r)).toEqual(['tests/unit/infra/healthz.test.ts'])
    expect(relatedTests(['public/sw.js'], r)).toEqual(['tests/unit/shared/sw.test.ts'])
    // a root folder is not searched for importers, but a staged file in it is still found by path
    expect(relatedTests(['docs/ignored.ts'], r)).toEqual(['tests/unit/docs/readsDocs.test.ts'])
  })

  test('a deleted or renamed file runs the tests that import its old path; a deleted test is not run', () => {
    expect(relatedTests(['src/gone/removed.ts'], r)).toEqual(['tests/unit/gone.test.ts'])
    expect(relatedTests(['tests/unit/neverExisted.test.ts'], r)).toEqual([])
  })

  test('a staged sql or shell file finds the tests that read it by path or folder, and nothing else', () => {
    expect(relatedTests(['supabase/migrations/002_new.sql'], r)).toEqual(['tests/unit/db/migrations.test.ts'])
    expect(relatedTests(['infra/deploy.sh'], r)).toEqual(['tests/unit/infra/deploy.test.ts'])
    expect(relatedTests(['docs/product/note.md'], r)).toEqual([])
  })

  test('a type export without semicolons does not erase the real import after it', () => {
    expect(relatedTests(['src/tracking/real.ts'], r)).toEqual(['tests/unit/tracking/real.test.ts', 'tests/unit/tracking/typesUser.test.ts'])
    expect(relatedTests(['src/tracking/real2.ts'], r)).toEqual([])
  })

  test('a staged app page runs the tests that import the route walker, a non-page does not', () => {
    expect(relatedTests(['app/quit/lab/page.tsx'], r)).toEqual(['tests/unit/navigation/gated.test.ts'])
    expect(relatedTests(['app/(app)/plan/page.tsx'], r)).toEqual(['tests/unit/navigation/gated.test.ts'])
    expect(relatedTests(['app/quit/lab/helper.ts'], r)).toEqual([])
  })
})
