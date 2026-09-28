/**
 * A BUTTON THAT WILL DO NOTHING IS NOT AN ENABLED BUTTON.
 *
 * Found in a browser on 2026-09-28. Three "type a name, press Add" controls — Manage →
 * Clients, Manage → Tags and Reports → Save report — sat fully enabled with the name
 * box empty, and pressing them did nothing at all: no row, no toast, no complaint. On
 * screen that is indistinguishable from a broken button, and the Save one is a
 * full-width primary in a dropdown, so it is the most confident-looking control on the
 * panel. None of the three handled Enter either, though two `autoFocus` the box, so
 * the natural way to finish typing a name was the one gesture with no effect.
 *
 * Reading the source afterwards found SIX, not three — the same handler shape copied
 * into Projects → Add task, Manage → Team groups and Settings → Webhooks. The browser
 * found the half that happened to be on the screens that were driven, which is the
 * argument for scanning the source once a browser has shown you what to scan for.
 *
 * `useAddField` owns both halves now (disabled while blank, Enter submits) and this
 * fails on the next handler written the old way. It scans the SOURCE, for the reason
 * `aDateInputCannotSendNothing` gives: a rendered sweep sees the screens somebody
 * thought to render.
 */

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, test } from "vitest"

const COMPONENTS = join(process.cwd(), "src/timetrack/components")

/**
 * WHY THIS PARSES INSTEAD OF GREPPING, which is the second thing this file got wrong.
 *
 * The first version matched `/if\s*\(\s*!\w+\.trim\(\)\s*\)\s*return\b/` and the
 * commit claimed it "fails on the next one written the old way". A reviewer wrote the
 * IDENTICAL defect five ways and the suite stayed green on all five:
 *
 *   if (!name.trim()) { return }      braces after the paren
 *   if (name.trim() === "") return    equality instead of negation
 *   if (!name?.trim()) return         an optional chain
 *   if (!name) return                 no trim at all
 *   if (!name.trim().length) return   length instead of truthiness
 *
 * A grep keys on the SPELLING of the guard, and the defect is not in the spelling. The
 * structural property is: a button that is pressable whatever the input, whose handler
 * opens by returning without doing anything. So the condition is not read at all — only
 * whether the first statement is a bare early return and whether anything makes the
 * button unpressable.
 *
 * `ManageView`'s form-completeness guard is correctly NOT an offender: its then-branch
 * toasts before returning, so the press does something. That distinction is impossible
 * to draw with a regex over the condition and falls out of this for free.
 */
function offendingButtons(): string[] {
  const offenders: string[] = []
  for (const file of readdirSync(COMPONENTS).filter((f) => f.endsWith(".tsx"))) {
    const source = readFileSync(join(COMPONENTS, file), "utf8")
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    const visit = (node: ts.Node): void => {
      const open = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : null
      if (open) {
        const tag = open.tagName.getText(sf)
        if (tag === "button" || tag === "Button") {
          const attrs = open.attributes.properties.filter(ts.isJsxAttribute)
          const named = (name: string) => attrs.some((a) => a.name.getText(sf) === name)
          // `disabled`, or the hook's props spread in, makes the button honest
          const spreadsHookProps = open.attributes.properties.some(
            (a) => ts.isJsxSpreadAttribute(a) && /\.buttonProps$/.test(a.expression.getText(sf)),
          )
          if (!named("disabled") && !spreadsHookProps) {
            const onClick = attrs.find((a) => a.name.getText(sf) === "onClick")
            const guarded = onClick && opensWithABareReturn(onClick)
            if (guarded) offenders.push(`${file}:${sf.getLineAndCharacterOfPosition(open.pos).line + 1}`)
          }
        }
      }
      node.forEachChild(visit)
    }
    visit(sf)
  }
  return offenders
}

/** True when the handler's FIRST statement is an `if` whose only action is to return. */
function opensWithABareReturn(attr: ts.JsxAttribute): boolean {
  const init = attr.initializer
  if (!init || !ts.isJsxExpression(init) || !init.expression) return false
  const fn = init.expression
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false
  if (!fn.body || !ts.isBlock(fn.body)) return false
  const first = fn.body.statements[0]
  if (!first || !ts.isIfStatement(first) || first.elseStatement) return false
  const then = first.thenStatement
  const onlyStatement = ts.isBlock(then)
    ? then.statements.length === 1
      ? then.statements[0]
      : null
    : then
  // a bare `return` — a then-branch that also toasts or navigates is doing something
  return Boolean(onlyStatement && ts.isReturnStatement(onlyStatement) && !onlyStatement.expression)
}

describe("a control that refuses blank input", () => {
  test("there are components to scan, so the rest of this asserts something", () => {
    expect(
      readdirSync(COMPONENTS).filter((f) => f.endsWith(".tsx")).length,
      "no .tsx found — has the folder moved?",
    ).toBeGreaterThan(5)
  })

  test("does not do it by returning silently from a button that looked pressable", () => {
    expect(
      offendingButtons(),
      "Use `useAddField`: it disables the button while the value is blank and submits on Enter. " +
        "A handler whose first act is to return means the button was pressable when pressing it could not work.",
    ).toEqual([])
  })

  test("and the scan catches the defect however it is SPELLED, not just verbatim", () => {
    /**
     * The five rewrites that defeated the grep, plus the original. Each is parsed here
     * rather than written to the repo, so this cannot be defeated by the next person
     * who phrases the condition differently.
     */
    const conditions = [
      "!name.trim()",
      "name.trim() === \"\"",
      "!name?.trim()",
      "!name",
      "!name.trim().length",
      "name.trim().length === 0",
    ]
    const missed = conditions.filter((condition) => {
      const src = `const x = <Button onClick={() => { if (${condition}) return\n doIt() }}>Add</Button>`
      const sf = ts.createSourceFile("t.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      let caught = false
      const visit = (node: ts.Node): void => {
        if (ts.isJsxElement(node)) {
          const attr = node.openingElement.attributes.properties
            .filter(ts.isJsxAttribute)
            .find((a) => a.name.getText(sf) === "onClick")
          if (attr && opensWithABareReturn(attr)) caught = true
        }
        node.forEachChild(visit)
      }
      visit(sf)
      return !caught
    })
    expect(missed, "these spellings of the defect would slip through").toEqual([])
  })

  test("and it does NOT flag a guard that tells the person something", () => {
    /**
     * The other half: a then-branch that toasts before returning means the press DID
     * something, which is the legitimate pattern `ManageView` uses. Flagging it would
     * make this test noise, and noise gets allowlisted.
     */
    const src =
      'const x = <Button onClick={() => { if (!ready) { pushToast("Fill it in"); return }\n doIt() }}>Go</Button>'
    const sf = ts.createSourceFile("t.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let flagged = false
    const visit = (node: ts.Node): void => {
      if (ts.isJsxElement(node)) {
        const attr = node.openingElement.attributes.properties
          .filter(ts.isJsxAttribute)
          .find((a) => a.name.getText(sf) === "onClick")
        if (attr && opensWithABareReturn(attr)) flagged = true
      }
      node.forEachChild(visit)
    }
    visit(sf)
    expect(flagged, "a guard that toasts is not a silent refusal").toBe(false)
  })

  test("and the hook the others use really does both halves", () => {
    /**
     * The scan above only proves nobody wrote the OLD shape. It cannot see whether the
     * replacement works, and a hook that disabled nothing would satisfy it completely —
     * so the behaviour is asserted here rather than assumed.
     */
    const hook = readFileSync(join(process.cwd(), "src/timetrack/hooks/useAddField.ts"), "utf8")
    expect(hook, "the button must be disabled while the value is blank").toContain("disabled: !ready")
    expect(hook, "Enter must submit").toContain('event.key !== "Enter"')
    expect(hook, "a rejected submit must keep the text").toContain("=== false) return")
  })

  test("every call site takes the button props from the hook rather than its own onClick", () => {
    /**
     * A call site could spread `inputProps` for the Enter handling and still wire its
     * own always-enabled `onClick`, which the first test would pass. So: wherever
     * `useAddField` is used, its `buttonProps` are used too.
     */
    const sources = readdirSync(COMPONENTS)
      .filter((f) => f.endsWith(".tsx"))
      .map((file) => ({ file, source: readFileSync(join(COMPONENTS, file), "utf8") }))
    const mismatched = sources
      .filter(({ source }) => source.includes("useAddField("))
      .filter(({ source }) => {
        const uses = [...source.matchAll(/const (\w+) = useAddField\(/g)].map((m) => m[1])
        return uses.some((name) => !source.includes(`{...${name}.buttonProps}`))
      })
      .map(({ file }) => file)
    expect(mismatched, "every useAddField must reach a button via {...field.buttonProps}").toEqual([])
  })
})
