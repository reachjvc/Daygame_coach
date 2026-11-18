import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const ROOTS = ["src/quit", "app/quit", "app/privacy"]
const PROPS = ["aria-label", "placeholder", "title", "alt"]

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p))
    else if (p.endsWith(".tsx")) out.push(p)
  }
  return out
}

/** JSX text nodes and string-literal props with 2+ letters are reader text: they belong in data files. */
export function hardcodedText(source: string): string[] {
  const found: string[] = []
  const sf = ts.createSourceFile("x.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const t = node.text.trim()
      if (/\p{L}{2,}/u.test(t)) found.push(t)
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(sf)
      if (PROPS.includes(name) && /\p{L}{2,}/u.test(node.initializer.text)) found.push(`${name}="${node.initializer.text}"`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

describe("no hard-coded reader text in quit and privacy components", () => {
  it("catches text nodes and literal props", () => {
    expect(hardcodedText("<p>Hello there</p>")).toEqual(["Hello there"])
    expect(hardcodedText('<input aria-label="Name" />')).toEqual(['aria-label="Name"'])
    expect(hardcodedText("<p>{frame.back}</p>")).toEqual([])
  })
  for (const root of ROOTS) {
    for (const file of tsxFiles(root)) {
      it(file, () => {
        expect(hardcodedText(readFileSync(file, "utf8"))).toEqual([])
      })
    }
  }
})
