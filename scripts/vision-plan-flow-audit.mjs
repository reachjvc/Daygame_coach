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
const shot = (n) => page.screenshot({ path: `${DIR}/${n}.png`, fullPage: true })

// ---- 1. Cold start ----------------------------------------------------------
await page.goto("http://localhost:3000/test/vision-plan")
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(900)
await orderCheck(page, "cold-start", [
  "Map the life you want", "Map your life", "Commit", "Set up tracking",
  "New here? The words we use", "YOUR VISION",
])
check("cold: SOS on screen one", await page.getByRole("button", { name: "Rough day?" }).count() > 0)
check("cold: wheel is the way in (a room opens)", await page.getByRole("button", { name: /open this room's journey/ }).count() > 0)
check("cold: prose collapsed by default (no box until opted in)", await page.getByRole("button", { name: /Prefer to write your whole vision/ }).count() > 0)
await shot("01-cold-start")

// ---- 1b. Room journey (M1): wheel → picture → gap → persists ----------------
await page.getByRole("button", { name: /Health — open this room's journey/ }).click()
await orderCheck(page, "room journey beats", [
  "the picture — what a 10 here looks like", "the gap — where you are today",
  "the goals — the moves that get you there", "go deeper",
])
await page.getByLabel("Your 10 in Health").fill("I wake up at 6 with energy that lasts")
await page.getByLabel("Your 10 in Health").press("Tab") // blur commits the dream
await page.waitForTimeout(400)
const roomText = await page.evaluate(() => document.body.innerText)
check("room: dream becomes North Star line", roomText.includes("I wake up at 6 with energy that lasts"))
check("room: wheel not collapsed mid-journey", await page.getByLabel("Your 10 in Health").count() > 0)
await page.reload(); await page.waitForTimeout(1200)
const afterReload = await page.evaluate(() => document.body.innerText)
check("room: journey survives reload", afterReload.includes("I wake up at 6 with energy that lasts"))
await shot("01b-room-journey")
await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
await page.reload(); await page.waitForTimeout(900)

// ---- 2. STAGE 2 — Commit (navigate off the map stage, sign) -----------------
await page.getByRole("button", { name: /Next: Commit/ }).click()
await page.waitForTimeout(300)
check("commit stage: heading matches", (await page.evaluate(() => document.body.innerText)).includes("Commit to the climb"))
await page.locator("#lm-manifesto-name").fill("Audit")
for (const l of ["keep going anyway", "hold the line", "feel the win"]) {
  await page.getByLabel("Add your own manifesto line").fill(l)
  await page.getByLabel("Add your own manifesto line").press("Enter")
}
const sign = page.getByRole("button", { name: /This is my manifesto/ })
check("manifesto: signable at 3 own lines", await sign.isEnabled())
await sign.click(); await page.waitForTimeout(500)
check("manifesto: signed confirmation appears", (await page.evaluate(() => document.body.innerText)).toLowerCase().includes("you've committed"))
await shot("02-commit")

// ---- 3. Full plan across all 3 stages (load example, un-confirm) ------------
await page.getByRole("button", { name: /Back/ }).click() // commit → map
await page.waitForTimeout(200)
await page.getByRole("button", { name: /see a filled example first/ }).click()
await page.waitForTimeout(1500)
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("visionPlanSandbox_v1"))
  s.confirmed = false; delete s.progress
  localStorage.setItem("visionPlanSandbox_v1", JSON.stringify(s))
})
await page.reload(); await page.waitForTimeout(1200)
// hydrates to the TRACK stage (goals exist). Core = board → focus → goals → balance.
const trackTxt = await page.evaluate(() => document.body.innerText)
check("track stage: heading matches", trackTxt.includes("Set up your tracking"))
await orderCheck(page, "track-stage core", [
  "life area", "Your most important room", "you are the author", "Go deeper — optional", "Balance your weeks", "Save plan & start tracking",
])
check("track: depth hidden by default (no driving force on screen)", !trackTxt.toLowerCase().includes("your driving force"))
// The depth is behind the collapsible.
await page.getByRole("button", { name: /Go deeper — optional/ }).click()
await page.waitForTimeout(300)
const deepTxt = await page.evaluate(() => document.body.innerText)
check("go-deeper: driving force revealed", deepTxt.toLowerCase().includes("your driving force"))
check("go-deeper: values revealed", /values/i.test(deepTxt))
await shot("03-track-stage")
// Map stage still holds the North Star.
await page.getByRole("button", { name: /Map your life/ }).click()
await page.waitForTimeout(300)
check("map stage: North Star present", (await page.evaluate(() => document.body.innerText)).includes("North Star"))

// ---- 4. Confirm gate (from the track stage) --------------------------------
await page.getByRole("button", { name: /Set up tracking/ }).click()
await page.waitForTimeout(300)
const confirmBtn = page.getByRole("button", { name: /save plan & start tracking|back to tracking/i }).first()
if (await confirmBtn.count()) {
  await confirmBtn.scrollIntoViewIfNeeded()
  check("confirm: enabled when manifesto signed", await confirmBtn.isEnabled())
  await confirmBtn.click(); await page.waitForTimeout(800)
} else {
  check("confirm: button present", false)
}

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
  "Capture everything", "Next week", "Save weekly review",
])
await shot("05-weekly")

// ---- 7. Rendered-copy smells on every captured page -------------------------
const t = await page.evaluate(() => document.body.innerText)
// short " · " lists (values, books) are fine; three consecutive LONG segments = prose written as data
check("copy: no fragment chains rendered", (t.match(/[^·\n]{25,} · [^·\n]{25,} · [^·\n]{25,}/g) ?? []).length === 0)
check("copy: no double spaces rendered", !/[a-z]  [a-z]/.test(t))
check("copy: no raw entities", !/&(ldquo|rdquo|apos|amp);/.test(t))
check("voice: no guru names rendered", !/\b(Stefan|Tatiana)\b/.test(t))

await browser.close()
console.log(results.join("\n"))
if (failed) process.exit(1)
