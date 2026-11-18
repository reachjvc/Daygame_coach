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
 * WHAT IT CANNOT SEE: a test that reads a file with `fs` instead of importing
 * it. Those tests run in CI, and in the full-suite branch of the hook when a
 * config, setup or workflow file is staged.
 *
 * Usage: node scripts/related-tests.mjs <staged file>…   (one test path per line)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'docs', 'Plans', 'public', 'supabase', 'infra', 'data', 'new_new_clean_attempt'])
const CODE = /\.(tsx?|mjs|js|json)$/
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.json']
// `import type { X } from …` and `export type … from …` vanish when TypeScript
// compiles, so a test that only borrows a type does not run the file; vitest's
// own graph skips them too. `import { type X, y }` still loads `y` and counts.
const TYPE_ONLY = /^\s*(?:import|export)\s+type\s[^;]*?\bfrom\s*(['"])[^'"\n]+\1/gm
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bvi\.(?:mock|doMock|importActual|importMock)\s*\(\s*)(['"])([^'"\n]+)\1/g

function walk(dir, root, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      const rel = path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/')
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
  const queue = staged.filter((f) => known.has(f) || isUnitTest(f))
  while (queue.length) {
    const file = queue.pop()
    if (seen.has(file)) continue
    seen.add(file)
    for (const parent of importedBy.get(file) ?? []) queue.push(parent)
  }
  return [...seen].filter(isUnitTest).sort()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const tests = relatedTests(process.argv.slice(2))
  if (tests.length) console.log(tests.join('\n'))
}
