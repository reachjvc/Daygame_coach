/**
 * Source-level guard for the bug class this slice has hit three times:
 *
 *   1. a calendar's events were tagged with an id read out of a setState updater
 *      React had not run yet, so they never rendered;
 *   2. validation toasts fired twice because pushToast sat inside an updater
 *      (StrictMode invokes updaters twice);
 *   3. creating a tag from an entry row lost the tag, because create and assign
 *      were two updates both computed from the same stale render snapshot.
 *
 * Behaviour is covered by statefulPickers.test.tsx; this catches the shape
 * anywhere in the slice, including code paths no test drives yet.
 */

import { describe, expect, test } from "vitest"
import * as fs from "fs"
import * as path from "path"

const SLICE = path.resolve(__dirname, "../../../src/timetrack")

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(item.name) ? [full] : []
  })
}

const files = sourceFiles(SLICE).map((file) => ({
  path: path.relative(path.resolve(__dirname, "../../.."), file),
  text: fs.readFileSync(file, "utf-8"),
}))

/** Body of every `setState((x) => { … })` updater in a file */
function updaterBodies(text: string): string[] {
  const bodies: string[] = []
  const opener = /setState\(\s*\(\w+\)\s*=>\s*\{/g
  while (opener.exec(text) !== null) {
    let depth = 1
    let index = opener.lastIndex
    while (index < text.length && depth > 0) {
      if (text[index] === "{") depth++
      else if (text[index] === "}") depth--
      index++
    }
    bodies.push(text.slice(opener.lastIndex, index))
  }
  return bodies
}

describe("state updates in the time-tracking slice", () => {
  test("no side effects inside a setState updater", () => {
    // StrictMode runs updaters twice, so anything user-visible in there happens twice
    const forbidden = /\b(pushToast|notify|window\.alert|navigator\.clipboard|downloadFile)\s*\(/
    const violations: string[] = []

    for (const file of files) {
      for (const body of updaterBodies(file.text)) {
        const hit = forbidden.exec(body)
        if (hit) violations.push(`${file.path}: ${hit[1]}() runs inside a setState updater`)
      }
    }

    expect(
      violations,
      `Move the effect out of the updater and call it after the state change:\n${violations.join("\n")}`,
    ).toHaveLength(0)
  })

  test("no new-entity id is read out of a setState updater", () => {
    // `let created = -1; setState(cur => { created = f(cur).id; ... }); return created`
    // depends on React running the updater synchronously, which it does not promise
    const violations: string[] = []

    for (const file of files) {
      for (const body of updaterBodies(file.text)) {
        if (/^\s*\w+\s*=\s*\w+\.id\b/m.test(body)) {
          violations.push(`${file.path}: assigns an id out of a setState updater`)
        }
      }
    }

    expect(
      violations,
      `Take the id from the current render's state instead:\n${violations.join("\n")}`,
    ).toHaveLength(0)
  })

  test("creating an entity and using it never spans two state updates", () => {
    // The exact shape that lost a tag: make the entity from this render's state,
    // save it, then save again from the same stale snapshot — the second write
    // discards the first. Creating and using must share one updater.
    const creators = /\b(createTag|createProject|createTask|createMember|addClient)\s*\(\s*state\b/
    // This is a cheap net over shapes; statefulPickers.test.tsx is the real
    // behavioural check and catches cases the regex cannot see.
    const violations: string[] = []

    for (const file of files) {
      // one chunk per handler, so sibling handlers are not merged
      const handlers = file.text.split(/\n(?=\s*(?:const\s+\w+\s*=|function\s|on[A-Z]\w*=\{|\}))/)
      for (const handler of handlers) {
        if (!creators.test(handler)) continue
        // count helpers that write state too — the tag bug hid its second
        // write inside patch(), so counting setState alone missed it
        const writes = (handler.match(/\b(?:setState|patch|apply)\s*\(/g) ?? []).length
        if (writes > 1) {
          violations.push(
            `${file.path}: creates an entity from the render snapshot, then writes state ${writes} times`,
          )
        }
      }
    }

    expect(
      violations,
      `Do both inside one setState((current) => …):\n${violations.join("\n")}`,
    ).toHaveLength(0)
  })
})
