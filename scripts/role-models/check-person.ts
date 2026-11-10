/**
 * Checks person files against the catalogue rules without running the suite:
 *   npx tsx scripts/role-models/check-person.ts <file.json> [...]
 * Prints each failure and exits 1 if any file fails. Research agents run it on
 * the file they wrote; the unit test (tests/unit/role-models/catalog.test.ts)
 * runs the same rules over the whole folder.
 */
import { readFileSync } from "node:fs"

import { checkPerson } from "../../src/role-models/catalogCheck"

let bad = 0
for (const file of process.argv.slice(2)) {
  let failures
  try {
    failures = checkPerson(JSON.parse(readFileSync(file, "utf8")))
  } catch (e) {
    failures = [{ rule: "json", message: String(e) }]
  }
  if (failures.length) {
    bad++
    console.log(`FAIL ${file}`)
    for (const f of failures) console.log(`  [${f.rule}] ${f.message}`)
  } else console.log(`ok   ${file}`)
}
process.exit(bad ? 1 : 0)
