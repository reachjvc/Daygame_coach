import { defineConfig } from 'vitest/config'
import { BaseSequencer, type TestSpecification } from 'vitest/node'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * FILES THAT NEED THEIR OWN MODULE CACHE, FOUND BY WHAT THEY DO.
 *
 * Vitest cannot split projects by pragma, so the config reads each test file
 * once. A file lands in the isolated project when it replaces modules
 * (`vi.mock`, `vi.doMock`, `vi.resetModules`). Such a file must not share a
 * cache: a repo module imported earlier by another file keeps that file's
 * replacement (2026-11-18: `rePush`, `climbsDoNotRoll` and three more failed
 * only in a full run). New files sort themselves; there is no list to keep.
 *
 * Fake clocks, a set system time, stubbed globals and env vars, and spies do
 * not need a fresh module cache: tests/setup.ts undoes them after each file's
 * last test. Until 2026-11-18 those files were isolated too, which cost each
 * of them its own jsdom and its own imports (Phase 3 of
 * Plans/tests-green-and-fast.md).
 */
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(full)
    return /\.test\.tsx?$/.test(e.name) ? [full] : []
  })
}
const excluded = /[\\/]tests[\\/](integration|manual)[\\/]/
const LEAKS = /\bvi\.(mock|doMock|resetModules)\(/
const sources = walk(path.resolve(__dirname, 'tests'))
  .filter((f) => !excluded.test(f))
  .map((f) => ({ file: path.relative(__dirname, f).split(path.sep).join('/'), text: fs.readFileSync(f, 'utf8') }))
const wantsDom = (t: string) => /@vitest-environment\s+jsdom/.test(t)
const isolatedFiles = sources.filter((x) => LEAKS.test(x.text)).map((x) => x.file)
/** A browser, and no replaced modules: shares one jsdom per worker. */
const domFiles = sources.filter((x) => wantsDom(x.text) && !LEAKS.test(x.text)).map((x) => x.file)

/**
 * CI SHARDS OF EQUAL WORK, NOT ONLY OF EQUAL FILE COUNT.
 *
 * `--shard=i/n` (ci.yml) splits the files by a hash of their path, so one
 * shard can draw more of the expensive kind: a file that replaces modules
 * builds its own module cache, and in a browser its own jsdom too. On
 * 2026-11-18 the hash gave shard 1 27 such browser files and shard 2 18. This
 * deals each kind out separately, biggest file first, each to the shard that
 * has the fewest of that kind so far (then the fewest bytes), so every shard
 * gets the same mix. It depends only on the files in the checkout, so every
 * CI job computes the same split. Used only with `--shard`: a custom sequencer
 * replaces the one `--sequence.shuffle` picks, and shuffling the file order
 * is how a leak between files is found.
 */
const sharded = process.argv.some((arg) => arg.startsWith('--shard'))
const kindOf = new Map(
  sources.map((x) => [x.file, `${LEAKS.test(x.text) ? 'isolated' : 'shared'}-${wantsDom(x.text) ? 'dom' : 'node'}`]),
)
class EvenShards extends BaseSequencer {
  async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
    const { index, count } = this.ctx.config.shard!
    const rel = (spec: TestSpecification) => path.relative(__dirname, spec.moduleId).split(path.sep).join('/')
    const rows = files.map((spec) => {
      const file = rel(spec)
      return { spec, file, kind: `${spec.project.name}:${kindOf.get(file) ?? 'other'}`, size: fs.statSync(spec.moduleId).size }
    })
    rows.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : b.size - a.size || (a.file < b.file ? -1 : 1)))
    const shards = Array.from({ length: count }, () => ({ specs: [] as TestSpecification[], kinds: new Map<string, number>(), bytes: 0 }))
    for (const row of rows) {
      const n = (s: (typeof shards)[number]) => s.kinds.get(row.kind) ?? 0
      const target = shards.reduce((best, s) => (n(s) < n(best) || (n(s) === n(best) && s.bytes < best.bytes) ? s : best))
      target.specs.push(row.spec)
      target.kinds.set(row.kind, n(target) + 1)
      target.bytes += row.size
    }
    return shards[index - 1].specs
  }
}

export default defineConfig({
  plugins: [react()],
  /**
   * ABSOLUTE, SO THE SUITE SURVIVES A GIT WORKTREE.
   *
   * `root` and `setupFiles` were relative. Vite then resolved them against
   * whatever it decided the project root was, and inside a `git worktree` it
   * decides on the PARENT checkout — so every one of the 178 test files failed
   * with `Cannot find module '/@fs/<parent>/tests/setup.ts'`, all at once, for a
   * reason that looks nothing like its cause.
   *
   * That matters more than it sounds. This repository is worked on by more than
   * one agent at a time, and a worktree is the one safe way to check out a
   * second branch without disturbing the shared checkout. Making the safe move
   * break the entire test suite pushes people back to switching branches under
   * each other's feet, which is how main was broken on 2026-09-09.
   */
  root: path.resolve(__dirname),
  test: {
    /**
     * A PINNED ZONE, BECAUSE SOME OF THESE TESTS ARE ABOUT CLOCKS.
     *
     * The calendar's day totals are built from local midnights, and one test
     * covers the 25-hour day at the end of European summer time. With no `TZ`
     * the suite inherits the machine's: it passes here, where the owner is, and
     * in a UTC CI that date becomes an ordinary 24-hour day, so the test still
     * passes while testing nothing at all. Pinned to the zone the product is
     * used in, so the assertion means the same thing everywhere.
     */
    env: { TZ: 'Europe/Copenhagen' },
    ...(sharded ? { sequence: { sequencer: EvenShards } } : {}),
    /**
     * NODE BY DEFAULT; A FILE THAT RENDERS ASKS FOR A BROWSER.
     *
     * Three quarters of these files never touch the DOM, and building a fake
     * browser for each of them was most of the suite's run time. A file that
     * renders, or uses `window`, `document` or user-event, starts with
     * `// @vitest-environment jsdom`. Classified 2026-10-13 by running the whole
     * suite under Node and marking exactly the files that failed for want of a
     * DOM — by what a file does, not by its extension.
     */
    environment: 'node',
    /**
     * THREE PROJECTS. `node` AND `dom` SHARE ONE MODULE CACHE PER WORKER; `isolated` DOES NOT.
     *
     * Most of the unit time was importing the same modules again for every
     * file, and building a fresh jsdom for every browser file. Files that
     * replace no module skip both; tests/setup.ts and tests/setupDom.ts reset
     * what one file could leave for the next. Files that replace modules keep
     * the per-file reset.
     */
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          isolate: false,
          include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
          exclude: ['tests/integration/**/*', 'tests/manual/**/*', 'node_modules/**/*', ...isolatedFiles, ...domFiles],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          isolate: false,
          include: domFiles,
          setupFiles: [path.resolve(__dirname, './tests/setupDom.ts')],
        },
      },
      {
        extends: true,
        test: { name: 'isolated', isolate: true, include: isolatedFiles },
      },
    ],
    // tests/manual/** talks to the REAL project database and creates and deletes
    // its own accounts. It is never part of `npm test` — run it deliberately with
    // `npx vitest run --config vitest.manual.config.ts`.
    globals: true,
    /**
     * NOT THE DEFAULT 5s, because nothing here is measuring speed.
     *
     * 2026-09-24: two different tests timed out at 5000ms in full-suite runs
     * minutes apart — a 2,520-row paging simulation at 5043ms, then a mocked
     * repo test — and both passed alone. Neither asserts a duration; they
     * assert that no row is lost at size and that a closed workout returns its
     * summary. This checkout is worked on by more than one agent at a time with
     * a `next dev` compiling beside them, so a five-second budget on 5,901
     * mocked tests fails on contention rather than on defects, and a build that
     * goes red for the machine it ran on teaches people to re-run it rather
     * than read it.
     *
     * A genuine hang now takes 20s to report instead of 5. That is the trade,
     * and it is the right way round. Anything that wants a performance bound
     * should assert one out loud, with a number.
     */
    testTimeout: 20000,
    setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
})
