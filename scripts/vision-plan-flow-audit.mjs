/**
 * Full-flow audit for /test/vision-plan — the standing net for flow/order/copy
 * regressions ("orphaned North Star" class). Walks the entire user journey
 * cold-start → track, asserts the NARRATIVE ORDER of every page, and dumps
 * full-page screenshots to .playwright-mcp/flow-audit/ for visual review.
 *
 * Run:  node scripts/vision-plan-flow-audit.mjs   (dev server on :3000)
 * Exit code 1 on any failed assertion. Screenshots are throwaway artifacts.
 */
import { createRequire } from "module"
import { mkdirSync } from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require("playwright")

const DIR = ".playwright-mcp/flow-audit"
mkdirSync(DIR, { recursive: true })
const results = []
let failed = false
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`)
  if (!ok) failed = true
}
/** v22 — IS IT ACTUALLY ON SCREEN? The audit could only ever prove an element
 * EXISTS, which is how a room panel 270px below the fold passed every check
 * while a human clicking the wheel saw nothing happen. `fullPage` screenshots
 * hide this by construction — they stitch the whole document into one image. */
const visibleCheck = async (page, name, selector) => {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { top: b.top, bottom: b.bottom, vh: window.innerHeight }
  }, selector)
  if (!r) return check(`${name}: present`, false, selector)
  const onScreen = r.top >= 0 && r.top < r.vh
  check(`${name}: on screen without scrolling`, onScreen,
    onScreen ? "" : `top ${Math.round(r.top)} vs viewport ${r.vh}`)
}

/** Assert markers appear in this exact order in the page's visible text. */
const orderCheck = async (page, name, markers) => {
  const t = (await page.evaluate(() => document.body.innerText)).toLowerCase()
  let last = -1
  for (const m of markers) {
    const i = t.indexOf(m.toLowerCase())
    if (i < 0) { check(`${name}: "${m}" present`, false); return }
    if (i < last) { check(`${name}: "${m}" in order`, false); return }
    last = i
  }
  check(`${name}: ${markers.length} sections in order`, true)
}

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 950 } })).newPage()
// v22 — VIEWPORT by default. `fullPage` stitches the whole document into one
// image and therefore cannot show what's below the fold — it is the exact tool
// that hid a room panel 270px off screen through a dozen "verified" passes.
// Use shotFull only when the point IS the document's structure.
const shot = (n) => page.screenshot({ path: `${DIR}/${n}.png` })
const shotFull = (n) => page.screenshot({ path: `${DIR}/${n}-full.png`, fullPage: true })

// ---- 1. Cold start: a blank slate lands on the GUIDE (v22) -----------------
await page.goto("http://localhost:3000/test/vision-plan")
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(900)
await orderCheck(page, "cold-start guide", [
  "Build it in order", "Get in state", "Debrief the year", "Write the life you want", "Which areas does your vision imply",
])
// then the wheel screen, reached deliberately
await page.getByRole("button", { name: /^Plan$/ }).click(); await page.waitForTimeout(600)
await orderCheck(page, "cold-start rooms", [
  "Your rooms", "Your life", "Commit",
  "working on this season",
  "New here? The words we use",
])
check("cold: SOS on screen one", await page.getByRole("button", { name: "Rough day?" }).count() > 0)
check("cold: wheel is the way in (a room opens)", await page.getByRole("button", { name: /open this room's journey/ }).count() > 0)
check("cold: no vision textarea before the wheel", await page.getByLabel(/^Your vision$/).count() === 0)
check("cold: prose is an opt-in alternative", await page.getByRole("button", { name: /Prefer to write your whole vision/ }).count() > 0)
check("v17: the Go-deeper drawer is gone", !(await page.evaluate(() => document.body.innerText)).includes("Go deeper — optional"))
check("v19: no room reads as parked before a priority is set",
  await page.getByRole("button", { name: /on a maintenance floor/ }).count() === 0)
check("v19: the season priority control is on screen one",
  await page.getByRole("button", { name: /working on this season/ }).count() > 0)

// ---- 9. v22: the first screen, measured rather than assumed ----------------
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(1000)
// a blank slate lands on the GUIDE, not on a wheel wrapped in explanation
check("v22: a blank slate lands on the Guide", (await page.evaluate(() => document.body.innerText)).includes("Build it in order"))
await page.getByRole("button", { name: /^Plan$/ }).click(); await page.waitForTimeout(600)
// the wheel is the product: it has to fit
const wheelFits = await page.evaluate(() => {
  const b = document.querySelector('svg[role="group"]').getBoundingClientRect()
  return { fits: b.top >= 0 && b.bottom <= window.innerHeight, chrome: Math.round(b.top) }
})
check("v22: the whole wheel fits the first viewport", wheelFits.fits, `${wheelFits.chrome}px of chrome above it`)
// and clicking a room must visibly do something
await page.locator('path[aria-label^="Health"]').click(); await page.waitForTimeout(1200)
await visibleCheck(page, "v22: clicking a room reveals its panel", 'textarea[aria-label*="Your 10 in Health"]')
await shot("07-first-screen")
// close it again — the next section opens it itself
await page.getByRole("button", { name: /back to the wheel/ }).first().click()
await page.waitForTimeout(400)
await shot("01-cold-start"); await shotFull("01-cold-start")

// ---- 1b. Room journey (v17 beat order) --------------------------------------
await page.getByRole("button", { name: /^Health — / }).click()
await page.waitForTimeout(300)
await orderCheck(page, "room journey beats", [
  "the picture — what a 10 here looks like",
  "suggestions — drafted from your picture",
  "the gap — where you are today",
  "the goals — the moves that get you there",
  "the deeper work — why this room",
])
check("room: breadcrumb names the room", (await page.evaluate(() => document.body.innerText)).includes("Rooms ›"))
await page.getByLabel("Your 10 in Health").fill("I wake up at 6 with energy that lasts")
await page.getByLabel("Your 10 in Health").press("Tab")
await page.waitForTimeout(400)
const roomText = await page.evaluate(() => document.body.innerText)
check("room: dream becomes North Star line", roomText.includes("I wake up at 6 with energy that lasts"))
await page.reload(); await page.waitForTimeout(1200)
check("room: journey survives reload", (await page.evaluate(() => document.body.innerText)).includes("I wake up at 6 with energy that lasts"))
await shot("01b-room-journey")

// ---- 2. Full plan across the three screens (worked example) -----------------
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(900)
await page.getByRole("button", { name: /^Plan$/ }).click(); await page.waitForTimeout(500)
await page.getByRole("button", { name: /see a filled example first/ }).click()
await page.waitForTimeout(1500)
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("visionPlanSandbox_v1"))
  s.confirmed = false; delete s.progress; delete s.committedAt
  localStorage.setItem("visionPlanSandbox_v1", JSON.stringify(s))
})
await page.reload(); await page.waitForTimeout(1200)

// SCREEN 2 — your life, whole. Everything visible, nothing in a drawer.
await page.getByRole("button", { name: /Your life$/ }).click()
await page.waitForTimeout(400)
const lifeTxt = await page.evaluate(() => document.body.innerText)
check("lifewide: heading matches", lifeTxt.includes("Your life, whole"))
await orderCheck(page, "lifewide core", [
  "life area", "Your most important room", "edit or delete anything that isn't yours",
  "your driving force", "your life mastery blueprint",
])
check("lifewide: driving force is NOT hidden", lifeTxt.toLowerCase().includes("your driving force"))
check("lifewide: values are NOT hidden", /values/i.test(lifeTxt))
await shot("02-lifewide")

// SCREEN 3 — commit: ritual, balance, manifesto, one terminal action.
await page.getByRole("button", { name: /^3?Commit$|Next: commit/ }).first().click()
await page.waitForTimeout(400)
await orderCheck(page, "commit screen", [
  "design your morning ritual", "balance your weeks", "your manifesto",
])
const signStart = page.getByRole("button", { name: /sign & start tracking|start tracking/i }).first()
check("commit: one terminal action exists", await signStart.count() > 0)
check("commit: no dead-end hint", !(await page.evaluate(() => document.body.innerText)).includes("Finish with"))
await shot("03-commit")

// ---- 3. The hand-off: signing lands you IN tracking -------------------------
await signStart.scrollIntoViewIfNeeded()
await signStart.click(); await page.waitForTimeout(900)
const landed = await page.evaluate(() => ({
  text: document.body.innerText,
  saved: JSON.parse(localStorage.getItem("visionPlanSandbox_v1") || "{}"),
}))
check("hand-off: signed", !!landed.saved.committedAt)
check("hand-off: confirmed + progress seeded", landed.saved.confirmed === true && !!landed.saved.progress)
check("hand-off: lands in the daily loop", /driving force/i.test(landed.text))

// ---- 5. Track: daily actions above reference material -----------------------
await orderCheck(page, "track", [
  "driving force — read it every morning", "Morning ritual",
  "keep one for the heart", "Evening reflection", "Life Mastery Wheel",
  "Score history", "Goals — toward your vision", "YOUR BLUEPRINT", "MONTHLY GOALS REPORT",
])
await shot("04-track")

// ---- 6. Weekly form order (force due) ---------------------------------------
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("visionPlanSandbox_v1"))
  if (s.progress) {
    // age the plan 8 days so a completed, unreviewed week exists
    const d = new Date(); d.setDate(d.getDate() - 8)
    s.progress.startDate = d.toISOString().slice(0, 10)
    s.progress.weeklyReviews = []
  }
  localStorage.setItem("visionPlanSandbox_v1", JSON.stringify(s))
})
await page.reload(); await page.waitForTimeout(1200)
await orderCheck(page, "weekly form", [
  "Weekly evaluation ritual", "re-read your plan, out loud", "Rate every area",
  // NB: "next week's outcomes" also appears in the day-two review banner at the
  // top of Track, so it can't anchor an order check. The section is asserted
  // separately below.
  "Capture everything", "Save weekly review",
])
// The next-week outcomes block only renders once every area is rated, which
// this walk doesn't do — asserting it here would be a check that always lies.
// Its wiring is covered by the unit suite instead.
await shot("05-weekly")

// ---- 7. Rendered-copy smells on every captured page -------------------------
const t = await page.evaluate(() => document.body.innerText)
// short " · " lists (values, books) are fine; three consecutive LONG segments = prose written as data
check("copy: no fragment chains rendered", (t.match(/[^·\n]{25,} · [^·\n]{25,} · [^·\n]{25,}/g) ?? []).length === 0)
check("copy: no double spaces rendered", !/[a-z]  [a-z]/.test(t))
check("copy: no raw entities", !/&(ldquo|rdquo|apos|amp);/.test(t))
check("voice: no guru names rendered", !/\b(Stefan|Tatiana)\b/.test(t))

// ---- 8. v17: every principle card is PLACED somewhere in the walk ----------
// The framework is the product; a card authored but never rendered is a gap.
const seenText = []
for (const [mode, nav] of [["library", "Library"]]) {
  const pill = page.getByRole("button", { name: new RegExp(`^${nav}$`) })
  if (await pill.count()) { await pill.first().click(); await page.waitForTimeout(500) }
  for (const tab of ["Areas", "Vision", "Manifesto", "Values", "Affirmations", "Driving force", "The method"]) {
    const b = page.getByRole("button", { name: new RegExp(`^${tab}$`) })
    if (await b.count()) { await b.first().click(); await page.waitForTimeout(250); seenText.push(await page.evaluate(() => document.body.innerText)) }
  }
}
const libText = seenText.join("\n")
check("library: 7 read-back pages render", seenText.length === 7)
check("library: the method page carries the mastery keys", /knowing/i.test(libText) && /plateau/i.test(libText))
check("library: affirmations roll up with their room", /affirmations/i.test(libText))
await shot("06-library")

// ---- 10. v23: the functional guarantees -----------------------------------
// Each of these pins a bug that shipped: work the user could do that the
// product then threw away, or a control that could not record its own default.

// 10a. A Guide-only user can read their work back. The Library used to be gated
// on goals existing, so five completed sessions had nowhere to be seen.
await page.evaluate(() => {
  localStorage.setItem("visionPlanSandbox_v1", JSON.stringify({
    vision: "I am strong, clear-headed and free.",
    intents: [], goals: [], priorityIds: [], dailyBudget: 4, confirmed: false,
    drivingForce: { purpose: "To build things that outlast me.", reasons: [], identity: ["I am a builder"] },
    yearDebrief: { good: ["shipped it"], challenges: [], lessons: [] },
  }))
})
await page.reload(); await page.waitForTimeout(1000)
check("v23: a Guide-only user can open the Library",
  await page.getByRole("button", { name: /^Library$/ }).count() > 0)

// 10b. The Guide reads the plan it is looking at, instead of counting clicks.
const guideText = await page.evaluate(() => document.body.innerText)
check("v23: Guide progress is derived from the plan, not from clicks",
  !/0 of \d+ done/.test(guideText))

// 10c. Guide-written vision prose survives a reload once goals exist. The
// persisted `vision` slot used to be overwritten by the ANALYSED text.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("visionPlanSandbox_v1"))
  s.visionDraft = "SENTINEL vision prose written in the Guide."
  s.vision = "a different, analysed vision"
  localStorage.setItem("visionPlanSandbox_v1", JSON.stringify(s))
})
await page.reload(); await page.waitForTimeout(900)
await page.getByRole("button", { name: /^Guide$/ }).click(); await page.waitForTimeout(400)
const visionSession = page.getByRole("button", { name: /Your vision/ })
if (await visionSession.count()) { await visionSession.first().click(); await page.waitForTimeout(400) }
check("v23: vision prose written in the Guide survives a reload",
  (await page.evaluate(() => document.body.innerHTML)).includes("SENTINEL vision prose"))

// 10d. The three phantom sliders: a readout you can tap to commit the default.
// A range input fires no change event when dragged to the value it already
// shows, so without this a user who meant 7 could not record 7.
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(900)
await page.getByRole("button", { name: /^Plan$/ }).click(); await page.waitForTimeout(600)
await page.getByRole("button", { name: /open this room's journey/ }).first().click()
await page.waitForTimeout(600)
const confirmable = page.getByTitle(/Tap to confirm \d+, or slide to rate/)
check("v23: an unset rating can be committed at its default", await confirmable.count() > 0)
if (await confirmable.count()) {
  await confirmable.first().click(); await page.waitForTimeout(400)
  check("v23: tapping the readout actually records the value",
    await page.getByTitle("Confirmed").count() > 0)
}

// ---- 10. v24: MOBILE. Never opened once in ~40 verification runs, and the
// page was 335px too wide when it finally was. A sideways-scrolling page is a
// broken page, so every screen is measured at a phone width.
await page.setViewportSize({ width: 390, height: 844 })
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(1000)
const screens = [
  ["guide", null], ["plan-rooms", "Plan"], ["track", "Track"], ["library", "Library"],
]
for (const [name, pillName] of screens) {
  if (pillName) {
    const pill = page.getByRole("button", { name: new RegExp(`^${pillName}$`) })
    if (await pill.count()) { await pill.first().click(); await page.waitForTimeout(700) }
  }
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(`mobile 390px: ${name} does not scroll sideways`, over <= 0, over > 0 ? `${over}px too wide` : "")
}
await shot("08-mobile")
await page.setViewportSize({ width: 1280, height: 950 })

// ---- 11. THE LIST DOOR (docs/plans/goal-intake.md). Built and shipped with
// no audit coverage; both bugs below were found by clicking it by hand, and
// neither is reachable from a unit test — they live in component state.
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(1200)
{
  const toPlan = page.getByRole("button", { name: /^Plan$/ })
  if (await toPlan.count()) { await toPlan.first().click(); await page.waitForTimeout(700) }
  const room = page.getByRole("button", { name: /fitness/i }).first()
  if (await room.count()) { await room.click(); await page.waitForTimeout(900) }
  const door = page.getByRole("button", { name: /paste the whole thing/i })
  check("list door: reachable from a room", (await door.count()) > 0)
  if (await door.count()) {
    await door.click(); await page.waitForTimeout(500)
    await page.getByLabel("Your goal list").fill("Training\n  Bench 80 kg\n  Gym 4 days a week")
    await page.getByRole("button", { name: /read the list/i }).click(); await page.waitForTimeout(700)

    // A shape flip must not destroy the parsed numbers. It used to null the
    // measure on the way out, so flipping back gave you a blank unit and 0→0
    // and Accept went dead until you retyped what we had already read.
    await page.getByLabel('Shape of "Bench 80 kg"').selectOption("habit_ramp"); await page.waitForTimeout(300)
    await page.getByLabel('Shape of "Bench 80 kg"').selectOption("milestone_ladder"); await page.waitForTimeout(300)
    const unit = await page.getByLabel('Unit for "Bench 80 kg"').inputValue()
    const target = await page.getByLabel('Target number for "Bench 80 kg"').inputValue()
    check("list door: a shape flip is reversible without losing the numbers", unit === "kg" && target === "80", `${target} ${unit}`)

    // Nothing exists until Accept.
    const early = await page.evaluate(() => localStorage.getItem("visionPlanSandbox_v1"))
    check("list door: nothing is created before Accept", !early || !(JSON.parse(early).goals || []).length)

    await page.getByRole("button", { name: /^Add \d+ goals?/i }).click(); await page.waitForTimeout(1500)

    // ---- The reasons beat. His order is goal -> why written under it; a list
    // of twelve goals and no reasons is twelve wishes. It must FIRE, ASK a
    // question rather than show a blank box, and not skip a goal on the way.
    check("reasons: the beat fires straight after intake", (await page.getByText("Now the reasons").count()) > 0)
    const rBody = await page.evaluate(() => document.body.innerText)
    check("reasons: it asks a question, with other angles available",
      /\?/.test(rBody) && /another angle/.test(rBody))
    check("reasons: the pain-why is asked too", /cost you if this never happens/i.test(rBody))
    if (await page.getByLabel(/^Why you want/).count()) {
      await page.getByLabel(/^Why you want/).fill("Because I am tired of being weak.")
      await page.getByRole("button", { name: /^Next goal$/ }).click(); await page.waitForTimeout(600)
      const t2 = await page.evaluate(() => document.body.innerText)
      // Filtering the queue on "still needs a why" while the index advanced
      // skipped every second goal.
      check("reasons: advancing does not skip the next goal", /2 of 2/.test(t2), (t2.match(/\d of \d(?!\d)/g) || []).join(","))
    }
    await shotFull("10-reasons")

    await page.reload(); await page.waitForTimeout(2500)
    const after = await page.evaluate(() => {
      const raw = localStorage.getItem("visionPlanSandbox_v1")
      return raw ? (JSON.parse(raw).goals || []).length : 0
    })
    // A goal that renders must be a goal that saves — the gate used to require
    // the vision analysis, so a room-only user saved nothing.
    check("list door: accepted goals survive a reload", after === 2, `${after} goals`)
  }
}
{
  // A heading we could not map must NOT be filed under whichever room is open.
  await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
  await page.reload(); await page.waitForTimeout(1200)
  const toPlan = page.getByRole("button", { name: /^Plan$/ })
  if (await toPlan.count()) { await toPlan.first().click(); await page.waitForTimeout(700) }
  const room = page.getByRole("button", { name: /fitness/i }).first()
  if (await room.count()) { await room.click(); await page.waitForTimeout(900) }
  const door = page.getByRole("button", { name: /paste the whole thing/i })
  if (await door.count()) {
    await door.click(); await page.waitForTimeout(500)
    await page.getByLabel("Your goal list").fill("Zwiegespr\u00e4che:\n  Do the thing")
    await page.getByRole("button", { name: /read the list/i }).click(); await page.waitForTimeout(700)
    const accept = page.getByRole("button", { name: /^Add \d+ goals?/i })
    check("list door: an unmapped heading blocks Accept instead of guessing a room", !(await accept.isEnabled()))
  }
  await shot("09-list-door")
}

await browser.close()
console.log(results.join("\n"))
if (failed) process.exit(1)
