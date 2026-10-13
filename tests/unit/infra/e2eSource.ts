/**
 * Reading the browser suite's source, for the checks that police it.
 *
 * Parsed with the TypeScript compiler rather than matched with regexes, for two
 * reasons the checks depend on: a comment that MENTIONS `waitForTimeout(` or a
 * `/test/` address is not a use of one, and "which test is this call inside?"
 * is a question about the syntax tree, not about which `test(` line came last.
 */

import * as fs from "node:fs"
import * as path from "node:path"
import ts from "typescript"

export const ROOT = path.resolve(__dirname, "../../..")
const E2E_DIR = path.join(ROOT, "tests/e2e")

/** Every TypeScript file under tests/e2e — specs and helpers — as repo-relative paths. */
export function e2eSourceFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // saved login state, not code
        if (entry.name === ".auth") continue
        walk(full)
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(path.relative(ROOT, full).replace(/\\/g, "/"))
      }
    }
  }
  walk(E2E_DIR)
  return out.sort()
}

export function parse(file: string, text = fs.readFileSync(path.join(ROOT, file), "utf-8")): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node)
  node.forEachChild((child) => walk(child, visit))
}

function literalText(node: ts.Node | undefined): string | null {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) return node.text
  return null
}

/** `test(...)`, `test.describe(...)` and their variants: the calls that name a block */
interface Block {
  kind: "test" | "describe"
  title: string
  start: number
  end: number
}

function blocks(source: ts.SourceFile): Block[] {
  const found: Block[] = []
  walk(source, (node) => {
    if (!ts.isCallExpression(node)) return
    const callee = node.expression.getText(source)
    const title = literalText(node.arguments[0])
    if (title === null) return
    const last = node.arguments[node.arguments.length - 1]
    if (!last || !(ts.isArrowFunction(last) || ts.isFunctionExpression(last))) return
    if (/^test(\.(only|skip|fixme|fail|slow))?$/.test(callee)) {
      found.push({ kind: "test", title, start: node.getStart(source), end: node.getEnd() })
    } else if (/^test\.describe(\.(only|skip|fixme|serial|parallel))?$/.test(callee)) {
      found.push({ kind: "describe", title, start: node.getStart(source), end: node.getEnd() })
    }
  })
  return found
}

export interface CallSite {
  /** The callee as written: `page.waitForTimeout`, `test.skip`, … */
  callee: string
  line: number
  /**
   * Where it is: the title of the innermost test around it; failing that the
   * innermost describe, as `describe: <title>`; failing that `(file)`. A
   * `test.skip("title", fn)` that DECLARES a skipped test is its own title.
   */
  where: string
  /** True only when `where` is a test title */
  inTest: boolean
}

/** Every call whose callee text passes `match`, and where in the file it sits */
export function callSites(source: ts.SourceFile, match: (callee: string) => boolean): CallSite[] {
  const all = blocks(source)
  const sites: CallSite[] = []
  walk(source, (node) => {
    if (!ts.isCallExpression(node)) return
    const callee = node.expression.getText(source)
    if (!match(callee)) return
    const at = node.getStart(source)
    const line = source.getLineAndCharacterOfPosition(at).line + 1

    const declared = all.find((b) => b.kind === "test" && b.start === at)
    if (declared) {
      sites.push({ callee, line, where: declared.title, inTest: true })
      return
    }
    const around = all
      .filter((b) => b.start < at && at < b.end)
      .sort((a, b) => b.start - a.start)
    const test = around.find((b) => b.kind === "test")
    const describe = around.find((b) => b.kind === "describe")
    if (test) sites.push({ callee, line, where: test.title, inTest: true })
    else if (describe) sites.push({ callee, line, where: `describe: ${describe.title}`, inTest: false })
    else sites.push({ callee, line, where: "(file)", inTest: false })
  })
  return sites
}

/** Every string a file spells out — plain, template heads and import paths — with its line. Comments are not strings. */
export function stringsIn(source: ts.SourceFile): { text: string; line: number; isImport: boolean }[] {
  const out: { text: string; line: number; isImport: boolean }[] = []
  const lineOf = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
  walk(source, (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const isImport =
        (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) &&
        node.parent.moduleSpecifier === node
      out.push({ text: node.text, line: lineOf(node), isImport })
    } else if (ts.isTemplateExpression(node)) {
      out.push({ text: node.head.text, line: lineOf(node), isImport: false })
    }
  })
  return out
}
