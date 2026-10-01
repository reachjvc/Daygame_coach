import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "fs"
import { join } from "path"

/**
 * A HOOK COMMAND CANNOT TRUST ITS WORKING DIRECTORY.
 *
 * Claude Code runs every hook with the session's current working directory, not
 * the repo root, and that directory drifts: reading the bundled Next.js guides
 * means `cd node_modules/next/dist/docs`, and the drift outlives the turn. Every
 * hook here was registered as `python3 .claude/hooks/known_failures.py`, so the
 * next prompt died with
 *
 *   python3: can't open file '/home/.../node_modules/next/dist/docs/.claude/hooks/known_failures.py'
 *
 * and the end-of-turn checklist stopped firing. The fix is `$CLAUDE_PROJECT_DIR`,
 * which the CLI exports to every hook process. This test is the thing that fails
 * when the next hook is added with a bare relative path — the class, not the one
 * command that broke.
 */

const ROOT = process.cwd()
const SETTINGS = [".claude/settings.json", ".claude/settings.local.json"]

type HookEntry = { hooks?: Array<{ command?: string }> }

const registeredCommands = (file: string): Array<{ event: string; command: string }> => {
  const settings = JSON.parse(readFileSync(join(ROOT, file), "utf8"))
  return Object.entries(settings.hooks ?? {}).flatMap(([event, entries]) =>
    (entries as HookEntry[]).flatMap((entry) =>
      (entry.hooks ?? []).map((hook) => ({ event, command: hook.command ?? "" })),
    ),
  )
}

/** The path arguments in a command that point at a script in this repo. */
const scriptPaths = (command: string): string[] =>
  command.split(/\s+/).filter((token) => /\.claude\/hooks\//.test(token))

describe("hook commands in settings.json", () => {
  const files = SETTINGS.filter((file) => existsSync(join(ROOT, file)))

  it("has at least one settings file with hooks to check", () => {
    const commands = files.flatMap(registeredCommands)
    expect(commands.length, "no hooks are registered at all; the checks are gone.").toBeGreaterThan(0)
  })

  for (const file of files) {
    for (const { event, command } of registeredCommands(file)) {
      const paths = scriptPaths(command)
      if (paths.length === 0) continue

      it(`${file} · ${event} · ${command} runs from any working directory`, () => {
        for (const path of paths) {
          expect(
            path.startsWith("$CLAUDE_PROJECT_DIR/") || path.startsWith("/"),
            `"${path}" is relative, so this hook only works when the session's cwd happens to be the repo root. ` +
              `Write it as $CLAUDE_PROJECT_DIR/${path.replace(/^\.\//, "")}.`,
          ).toBe(true)

          const onDisk = join(ROOT, path.replace("$CLAUDE_PROJECT_DIR/", ""))
          expect(existsSync(onDisk), `${path} is registered as a hook but ${onDisk} does not exist.`).toBe(true)
        }
      })
    }
  }

  it("anchors the hook scripts that read the working tree", () => {
    // Passing the right path to the script is only half of it: a script that
    // shells out to `git` or `npm` reads whatever tree its cwd points at, which
    // is the same drifted directory. Each of these derives the repo root itself.
    const anchored: Array<[string, RegExp]> = [
      [".claude/hooks/check-test-results.sh", /cd "\$ROOT"/],
      [".claude/hooks/known_failures.py", /cwd=ROOT/],
    ]
    for (const [script, marker] of anchored) {
      const source = readFileSync(join(ROOT, script), "utf8")
      expect(
        marker.test(source),
        `${script} runs git or npm but no longer pins itself to the repo root, so it reads whichever tree the session's cwd points at.`,
      ).toBe(true)
    }
  })
})
