/**
 * v24 — EXHAUSTIVE CAPTURE for the Life Mastery page.
 *
 * The flow audit proves narrative ORDER. This proves everything else, and it
 * writes real material to disk so an auditor reads what a user actually sees
 * rather than what the source implies:
 *
 *   - a viewport screenshot of every state, desktop AND mobile (fullPage
 *     stitches the document into one image and therefore cannot show the fold,
 *     which is exactly how a broken first screen survived a dozen "verified"
 *     passes — see v22)
 *   - the rendered innerText of every state
 *   - every control: tag, visible label, aria-label, placeholder, value,
 *     disabled, and whether it has an accessible name at all
 *   - every text/background pair with its WCAG contrast ratio
 *   - anything overflowing the viewport horizontally
 *   - console errors and failed requests
 *
 * Output: .playwright-mcp/v24/ (gitignored). Read-only — it never writes to
 * the app beyond seeding localStorage fixtures.
 */
import { chromium } from "playwright"
import { mkdirSync, writeFileSync } from "node:fs"

const URL = "http://localhost:3000/test/vision-plan"
const DIR = ".playwright-mcp/v24"
mkdirSync(DIR, { recursive: true })

const DESKTOP = { width: 1280, height: 950 }
const MOBILE = { width: 390, height: 844 }

// ---------------------------------------------------------------------------
// In-page probes
// ---------------------------------------------------------------------------

/** Every interactive control, with whatever a user (or a screen reader) can
 * actually read off it. `name` empty ⇒ the control announces nothing. */
const PROBE_CONTROLS = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05
  }
  const labelFor = (el) => {
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label")
    const id = el.getAttribute("id")
    if (id) {
      const l = document.querySelector(`label[for="${CSS.escape(id)}"]`)
      if (l) return l.innerText.trim()
    }
    const wrap = el.closest("label")
    if (wrap) return wrap.innerText.trim()
    const lb = el.getAttribute("aria-labelledby")
    if (lb) {
      const t = lb.split(/\s+/).map((x) => document.getElementById(x)?.innerText ?? "").join(" ").trim()
      if (t) return t
    }
    return ""
  }
  const out = []
  for (const el of document.querySelectorAll("input, textarea, select, button, [role=button], [contenteditable=true]")) {
    if (!vis(el)) continue
    const tag = el.tagName.toLowerCase()
    const type = el.getAttribute("type") ?? ""
    out.push({
      tag, type,
      name: (labelFor(el) || (el.innerText ?? "").trim()).slice(0, 120),
      placeholder: (el.getAttribute("placeholder") ?? "").slice(0, 140),
      title: (el.getAttribute("title") ?? "").slice(0, 140),
      value: tag === "input" || tag === "textarea" ? String(el.value ?? "").slice(0, 60) : "",
      disabled: !!el.disabled,
      // A control the user can operate but nothing announces.
      unnamed: !(labelFor(el) || (el.innerText ?? "").trim()),
    })
  }
  return out
}

/** WCAG 2.1 contrast for every visible text node against its painted backdrop. */
const PROBE_CONTRAST = () => {
  const lum = (c) => {
    const f = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]
  }
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(",").map((x) => parseFloat(x))
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
  }
  // Composite down the ancestor chain until something is opaque.
  const backdrop = (el) => {
    let acc = null
    for (let n = el; n; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor)
      if (!bg || bg.a === 0) continue
      acc = acc ? { rgb: acc.rgb.map((v, i) => v * acc.a + bg.rgb[i] * bg.a * (1 - acc.a)), a: acc.a + bg.a * (1 - acc.a) } : bg
      if (acc.a >= 0.99) break
    }
    return acc ? acc.rgb : [9, 9, 11] // zinc-950 page base
  }
  const seen = new Map()
  for (const el of document.querySelectorAll("body *")) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim()
    if (!txt || txt.length < 2) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const s = getComputedStyle(el)
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) < 0.05) continue
    const fg = parse(s.color)
    if (!fg) continue
    const bg = backdrop(el)
    const fgc = fg.a >= 0.99 ? fg.rgb : fg.rgb.map((v, i) => v * fg.a + bg[i] * (1 - fg.a))
    const L1 = lum(fgc), L2 = lum(bg)
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
    const px = parseFloat(s.fontSize)
    const bold = Number(s.fontWeight) >= 700
    // WCAG large text = 18.66px bold or 24px
    const large = px >= 24 || (bold && px >= 18.66)
    const need = large ? 3 : 4.5
    const key = `${txt.slice(0, 40)}|${Math.round(ratio * 10)}`
    if (seen.has(key)) continue
    seen.set(key, {
      text: txt.slice(0, 80), ratio: Math.round(ratio * 100) / 100,
      px: Math.round(px * 10) / 10, weight: s.fontWeight, need, pass: ratio >= need,
      color: s.color, on: `rgb(${bg.map((v) => Math.round(v)).join(",")})`,
    })
  }
  return [...seen.values()].filter((x) => !x.pass).sort((a, b) => a.ratio - b.ratio)
}

/** Anything wider than the viewport = a horizontal scrollbar on the page. */
const PROBE_OVERFLOW = () => {
  const out = []
  const vw = document.documentElement.clientWidth
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect()
    if (r.width === 0) continue
    if (r.right > vw + 1 || r.left < -1) {
      out.push({ tag: el.tagName.toLowerCase(), cls: (el.className ?? "").toString().slice(0, 70), left: Math.round(r.left), right: Math.round(r.right), vw, text: (el.innerText ?? "").trim().slice(0, 50) })
    }
  }
  return out.slice(0, 25)
}

/** Tap-target sizing: anything interactive under 44x44 on a phone. */
const PROBE_TAPS = () => {
  const out = []
  for (const el of document.querySelectorAll("button, a, input, select, textarea, [role=button]")) {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (r.height < 44 || r.width < 24) {
      out.push({ h: Math.round(r.height), w: Math.round(r.width), name: ((el.getAttribute("aria-label") || el.innerText) ?? "").trim().slice(0, 60) })
    }
  }
  return out.slice(0, 40)
}

// ---------------------------------------------------------------------------

const EXAMPLE = "__EXAMPLE__"

/** Fixture states, each a function that leaves the page in that state. */
const STATES = [
  { id: "01-cold-guide", why: "first 15 seconds, blank slate", setup: async () => {} },
  {
    id: "02-guide-open-vision", why: "the vision session, open",
    setup: async (p) => { await open(p, /Your vision/) },
  },
  {
    id: "03-guide-open-debrief", why: "the year debrief, open",
    setup: async (p) => { await open(p, /Debrief the year/) },
  },
  {
    id: "04-guide-open-rooms", why: "the per-area session, open",
    setup: async (p) => { await open(p, /Room by room/) },
  },
  {
    id: "05-guide-open-brainstorm", why: "brainstorm dump phase",
    setup: async (p) => { await open(p, /Brainstorm & cut/) },
  },
  {
    id: "06-plan-rooms", why: "the wheel screen",
    setup: async (p) => { await open(p, /^Plan$/) },
  },
  {
    id: "07-room-panel", why: "a room journey open — the densest authoring screen",
    setup: async (p) => { await open(p, /^Plan$/); await open(p, /open this room's journey/, 800) },
  },
  {
    id: "08-example-track", why: "a lived-in plan on Track", fixture: EXAMPLE,
    setup: async () => {},
  },
  {
    id: "09-example-lifewide", why: "the goal cards — 7 boxes + 2 sliders each", fixture: EXAMPLE,
    setup: async (p) => { await open(p, /Adjust the plan/, 800); await open(p, /Your life/, 800) },
  },
  {
    id: "10-example-commit", why: "ritual builder + manifesto + sign", fixture: EXAMPLE,
    setup: async (p) => { await open(p, /Adjust the plan/, 800); await open(p, /Commit$/, 900) },
  },
  {
    id: "11-weekly-review", why: "the weekly ritual, due", fixture: EXAMPLE, ageDays: 8,
    setup: async () => {},
  },
  {
    id: "12-library-areas", why: "read-back: areas", fixture: EXAMPLE,
    setup: async (p) => { await open(p, /^Library$/, 700) },
  },
  {
    id: "13-library-method", why: "read-back: the method", fixture: EXAMPLE,
    setup: async (p) => { await open(p, /^Library$/, 700); await open(p, /^The method$/, 500) },
  },
  {
    id: "14-sos", why: "the crisis front door", fixture: EXAMPLE,
    setup: async (p) => { await open(p, /Rough day\?/, 700) },
  },
]

async function open(page, rx, ms = 500) {
  const el = page.getByRole("button", { name: rx })
  if ((await el.count()) && (await el.first().isEnabled())) {
    await el.first().click()
    await page.waitForTimeout(ms)
    return true
  }
  return false
}

async function seed(page, state) {
  await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
  await page.reload()
  await page.waitForTimeout(900)
  if (state.fixture === EXAMPLE) {
    await open(page, /^Plan$/, 600)
    await open(page, /Or see a filled example first/, 1700)
    if (state.ageDays) {
      await page.evaluate((d) => {
        const s = JSON.parse(localStorage.getItem("visionPlanSandbox_v1"))
        const dt = new Date(); dt.setDate(dt.getDate() - d)
        s.progress.startDate = dt.toISOString().slice(0, 10)
        s.progress.weeklyReviews = []
        delete s.progress.weeklyDraft
        localStorage.setItem("visionPlanSandbox_v1", JSON.stringify(s))
      }, state.ageDays)
      await page.reload()
      await page.waitForTimeout(1600)
    }
  }
  await state.setup(page)
}

const browser = await chromium.launch()
const report = { generatedAt: new Date().toISOString(), states: [] }

for (const vp of [{ n: "desktop", ...DESKTOP }, { n: "mobile", ...MOBILE }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  const consoleErrors = []
  const failedRequests = []
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)) })
  page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`.slice(0, 200)))
  page.on("requestfailed", (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 120)}`))
  await page.goto(URL)

  for (const st of STATES) {
    consoleErrors.length = 0
    failedRequests.length = 0
    try {
      await seed(page, st)
    } catch (e) {
      report.states.push({ id: st.id, viewport: vp.n, error: String(e.message).slice(0, 200) })
      continue
    }
    const shot = `${DIR}/${st.id}-${vp.n}.png`
    await page.screenshot({ path: shot })
    const [text, controls, contrast, overflow, taps] = await Promise.all([
      page.evaluate(() => document.body.innerText),
      page.evaluate(PROBE_CONTROLS),
      page.evaluate(PROBE_CONTRAST),
      page.evaluate(PROBE_OVERFLOW),
      vp.n === "mobile" ? page.evaluate(PROBE_TAPS) : Promise.resolve([]),
    ])
    writeFileSync(`${DIR}/${st.id}-${vp.n}.txt`, text)
    report.states.push({
      id: st.id, why: st.why, viewport: vp.n, shot,
      textChars: text.length,
      controlCount: controls.length,
      unnamedControls: controls.filter((c) => c.unnamed),
      controls,
      contrastFailures: contrast,
      overflow,
      smallTapTargets: taps,
      consoleErrors: [...new Set(consoleErrors)],
      failedRequests: [...new Set(failedRequests)],
    })
    process.stdout.write(`captured ${st.id} ${vp.n}\n`)
  }
  await page.close()
}

writeFileSync(`${DIR}/report.json`, JSON.stringify(report, null, 1))

// Console summary — the headline numbers an auditor needs before opening a file.
const agg = (f) => report.states.reduce((n, s) => n + (s[f]?.length ?? 0), 0)
console.log("\n=== CAPTURE SUMMARY ===")
console.log(`states captured : ${report.states.length}`)
console.log(`unnamed controls: ${agg("unnamedControls")}`)
console.log(`contrast fails  : ${agg("contrastFailures")}`)
console.log(`overflow nodes  : ${agg("overflow")}`)
console.log(`small tap targets: ${agg("smallTapTargets")}`)
console.log(`console errors  : ${agg("consoleErrors")}`)
console.log(`failed requests : ${agg("failedRequests")}`)
await browser.close()
