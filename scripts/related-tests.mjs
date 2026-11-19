#!/usr/bin/env node
/**
 * WHICH UNIT TESTS TOUCH THESE FILES, WITHOUT RUNNING VITEST TO FIND OUT.
 *
 * The pre-commit hook used to ask `vitest related`, which transforms every test
 * file to build its import graph: about 20 s, even when no test is related.
 * This reads the import specifiers with a regular expression instead (about
 * 0.3 s): `import … from`, `import(…)`, `require(…)`, `vi.mock(…)`,
 * `vi.doMock(…)`, `vi.importActual(…)`. `@/…` resolves from the repo root, as in
 * tsconfig; relative paths from the importing file; packages are ignored.
 * Then it walks the graph backwards from the staged files and prints every unit
 * test file that reaches one, transitively.
 *
 * A test that reads a file with `fs` instead of importing it is found by the
 * file's path (or its folder, two segments or more) appearing in the test's
 * source. What neither finds runs in CI, and in the full-suite branch of the
 * hook when a config, setup or workflow file is staged.
 * A staged page file under `app/` (any `page.tsx`) also runs every test that imports the route walker
 * (`tests/support/appRoutes.ts`), since those tests read pages by walking `app/`.
 * Deleted and renamed files count: pass the old path.
 *
 * Usage: node scripts/related-tests.mjs <staged file>…   (one test path per line)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Skipped by name at any depth: dependencies and build output.
const SKIP_NAMES = new Set(['node_modules', '.next', '.git'])
// Skipped only where they sit at the repo root (a `data` or `infra` folder
// deeper down, like src/tracking/data/ or tests/unit/infra/, holds real code).
// `public` is NOT skipped: tests import `@/public/sw.js`.
const SKIP_ROOT = new Set(['docs', 'Plans', 'supabase', 'infra', 'data', 'new_new_clean_attempt', 'assets-aside'])
const CODE = /\.(tsx?|mjs|js|json)$/
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.json']
// `import type { X } from …` and `export type … from …` vanish when TypeScript
// compiles, so a test that only borrows a type does not run the file; vitest's
// own graph skips them too. `import { type X, y }` still loads `y` and counts.
// The clause may not cross `;`, `=`, `(` or another `import`/`export`: this
// repo has no semicolons, so `export type A = B` followed by a real import must
// not be read as one statement.
const TYPE_ONLY = /^\s*(?:import|export)\s+type\s(?:(?!\b(?:import|export)\b)[^;=(])*?\bfrom\s*(['"])[^'"\n]+\1/gm
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bvi\.(?:mock|doMock|importActual|importMock)\s*\(\s*)(['"])([^'"\n]+)\1/g

function walk(dir, root, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const rel = path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/')
      if (SKIP_NAMES.has(entry.name) || entry.name.startsWith('.') || SKIP_ROOT.has(rel)) continue
      if (rel === 'tests/e2e' || rel === 'tests/manual' || rel === 'tests/integration') continue
      walk(path.join(dir, entry.name), root, out)
    } else if (CODE.test(entry.name)) {
      out.push(path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/'))
    }
  }
}

export const isUnitTest = (file) => /^tests\/.*\.test\.tsx?$/.test(file) && !/^tests\/(e2e|manual|integration)\//.test(file)

export function relatedTests(staged, root = process.cwd()) {
  const files = []
  walk(root, root, files)
  const known = new Set(files)
  // A deleted or renamed file is no longer on disk, but the tests in the working
  // tree still import it by the old path: those are the ones to run.
  for (const f of staged) known.add(f)

  const resolve = (spec, from) => {
    let base
    if (spec.startsWith('@/')) base = spec.slice(2)
    else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))
    else return null
    if (known.has(base)) return base
    for (const ext of EXTENSIONS) if (known.has(base + ext)) return base + ext
    for (const ext of EXTENSIONS) if (known.has(`${base}/index${ext}`)) return `${base}/index${ext}`
    return null
  }

  // importedBy: file -> the files that import it
  const importedBy = new Map()
  for (const file of files) {
    if (file.endsWith('.json')) continue
    const text = fs.readFileSync(path.join(root, file), 'utf8').replace(TYPE_ONLY, '')
    for (const match of text.matchAll(SPECIFIER)) {
      const target = resolve(match[2], file)
      if (!target) continue
      if (!importedBy.has(target)) importedBy.set(target, new Set())
      importedBy.get(target).add(file)
    }
  }

  const seen = new Set()
  const queue = [...staged]
  // The route guards read every `app/**/page.tsx` by walking the folder
  // (tests/support/appRoutes.ts), so no test names a page file. A staged page
  // therefore counts as a change to that walker: every test that imports it
  // runs (gatedPagesAreNotSwept, routeList, sweepCoverage, ...).
  if (staged.some((f) => /^app\/.*\/?page\.tsx$/.test(f))) queue.push('tests/support/appRoutes.ts')
  while (queue.length) {
    const file = queue.pop()
    if (seen.has(file)) continue
    seen.add(file)
    for (const parent of importedBy.get(file) ?? []) queue.push(parent)
  }
  const result = new Set([...seen].filter(isUnitTest))

  // A test that reads a file with `fs` has no import to follow. Find it by the
  // staged path or its folder (two or more segments, so `src` does not match
  // everything) written in its source: supabase/migrations, infra/deploy.sh.
  const needles = new Set()
  for (const f of staged) {
    needles.add(f)
    // A source file's folder is named in every import of its siblings: only
    // files the import graph cannot see (sql, sh, yaml, md) match by folder.
    if (CODE.test(f)) continue
    const parts = f.split('/')
    for (let n = 2; n < parts.length; n++) needles.add(parts.slice(0, n).join('/'))
  }
  for (const file of files) {
    if (!isUnitTest(file) || result.has(file)) continue
    const text = fs.readFileSync(path.join(root, file), 'utf8')
    for (const needle of needles) {
      if (text.includes(needle)) {
        result.add(file)
        break
      }
    }
  }
  // A deleted test file is staged too; there is nothing to run for it.
  return [...result].filter((f) => fs.existsSync(path.join(root, f))).sort()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const tests = relatedTests(process.argv.slice(2))
  if (tests.length) console.log(tests.join('\n'))
}
