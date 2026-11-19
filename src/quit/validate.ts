/**
 * Checks a quit-tool data file against docs/research/addiction-one-pagers/RULEBOOK.md
 * and Plans/quit-tool.md. A file listed in data/live.json must pass with no issue;
 * a draft file only has to be free of broken rules in what it already holds.
 * The regexes are copied from docs/research/addiction-one-pagers/board/build_v3.py.
 */
import { getAddiction, liveIds } from "./data"
import { BLACKBOX_ENDING_IDS, NEED_IDS, SEVERITIES, TODO } from "./types"
import type { QuitAddiction } from "./types"

export interface Issue {
  /** e.g. "beliefs[2].scene" */
  path: string
  rule: string
  message: string
}

type Obj = Record<string, unknown>

const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x)
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
const obj = (x: unknown): Obj => (isObj(x) ? x : {})
/** A real string: not missing and not the TODO marker. */
const str = (x: unknown): string | undefined => (typeof x === "string" && x !== TODO ? x : undefined)
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

// ---- copied from board/build_v3.py
const COUNTED_KEYS: Record<string, RegExp> = {
  dependent: /hooked|dependen|addict|criteria/i,
  disorder: /\bmild\b/i,
  treatment: /treat|trial|therap|help|clinic|hospital|programme|program|detox|rehab|counsell/i,
  resolved: /\bsays?\b|\bsaid\b/i,
  "self-hooked": /\bsays?\b|\bsaid\b|calling themselves|call themselves|\bfeel/i,
  heavy: /\bnot\b/i,
  users: /\bnot\b/i,
  screened: /likely .*problem/i,
}
const MOD_OK = new Set(["dependent", "resolved", "disorder", "treatment"])
const MOD_WORDS = /just one|one quick|handle it|in control|under control|moderate|a little|only on weekends/i
export const SCREEN = /is this you|are you addicted|take the test|\bquiz\b|screener|do you have a problem|sound like you/i
export const CHEER = /you'?ve got this|you got this|you can do it|proud of you|amazing|journey|\bstay strong\b|!/i
const TOLL = /\bdeaths?\b|\bdied\b|million|billion/i
// ---- from the Phase 1 brief
export const FOUNDER = /\bI quit\b|\bwhen I\b|\bmy story\b/i
export const FORECAST = /you will|chance of success|likely to succeed|will succeed/i
export const NO_RESET = /\breset\b|back to zero|start over from day 0|day zero/i
const NOT_AVOID = /^(I\s+)?(won'?t|will not|not|avoid|never|don'?t|stop)\b/i

/** Keys whose content is a source, an id or a tag, not text the reader reads. */
const NOT_READER_KEYS = new Set([
  "refs", "ref", "alsoRef", "priceRefs", "basis", "check", "id", "kind", "severity", "evidence",
  "editNote", "blackBoxEnding", "link", "url", "level", "costKind", "beliefId", "symptom", "need",
])
/** Reader's own voice or the owner's words: exempt from the founder rule. */
const FOUNDER_EXEMPT = /^(tapeForward|responses|riskyMoments|endings|helped|planSteps)\b|^beliefs\[\d+\]\.(limiting|counterpart)$/

function readerText(x: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof x === "string") {
    if (x !== TODO) out.push({ path, text: x })
  } else if (Array.isArray(x)) {
    x.forEach((v, i) => readerText(v, `${path}[${i}]`, out))
  } else if (isObj(x)) {
    for (const [k, v] of Object.entries(x)) {
      if (NOT_READER_KEYS.has(k)) continue
      readerText(v, path ? `${path}.${k}` : k, out)
    }
  }
}

type Ctx = { data: Obj; live: boolean; add: (path: string, rule: string, message: string) => void; reader: { path: string; text: string }[] }

function ruleTodo(c: Ctx) {
  if (!c.live) return
  const walk = (x: unknown, path: string) => {
    if (x === TODO) c.add(path, "todo", `${path} is still TODO`)
    else if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${path}[${i}]`))
    else if (isObj(x)) for (const [k, v] of Object.entries(x)) walk(v, path ? `${path}.${k}` : k)
  }
  walk(c.data, "")
}

function numbersOf(d: Obj): { path: string; n: Obj }[] {
  const out = arr(d.numbers).map((n, i) => ({ path: `numbers[${i}]`, n: obj(n) }))
  if (isObj(d.hope)) out.push({ path: "hope", n: d.hope })
  return out
}

function ruleWords(c: Ctx) {
  const lim = (path: string, v: unknown, max: number) => {
    const s = str(v)
    if (s !== undefined && words(s) > max) c.add(path, "words", `${path} is ${words(s)} words (max ${max})`)
  }
  const d = c.data
  arr(d.beliefs).forEach((b, i) => {
    lim(`beliefs[${i}].scene`, obj(b).scene, 16)
    lim(`beliefs[${i}].short`, obj(b).short, 6)
    lim(`beliefs[${i}].proof`, obj(b).proof, 40)
    lim(`beliefs[${i}].counted`, obj(b).counted, 12)
  })
  arr(d.planSteps).forEach((s, i) => lim(`planSteps[${i}].proof.text`, obj(obj(s).proof).text, 40))
  arr(d.needs).forEach((n, i) =>
    arr(obj(n).swaps).forEach((s, j) => lim(`needs[${i}].swaps[${j}].text`, obj(s).text, 10)),
  )
  for (const { path, n } of numbersOf(d)) {
    lim(`${path}.mirror`, n.mirror, 14)
    lim(`${path}.headline`, n.headline, 22)
    lim(`${path}.counted`, n.counted, 12)
  }
  arr(d.symptomCourse).forEach((r, i) => lim(`symptomCourse[${i}].text`, obj(r).text, 30))
  arr(d.lessons).forEach((l, i) => {
    lim(`lessons[${i}].body`, obj(l).body, 180)
    lim(`lessons[${i}].exercise`, obj(l).exercise, 40)
  })
  const quotes = (x: unknown, path: string) => {
    if (Array.isArray(x)) x.forEach((v, i) => quotes(v, `${path}[${i}]`))
    else if (isObj(x)) {
      if (typeof x.quote === "string" && "cite" in x) lim(`${path}.quote`, x.quote, 30)
      for (const [k, v] of Object.entries(x)) quotes(v, path ? `${path}.${k}` : k)
    }
  }
  quotes(d, "")
}

function ruleBasis(c: Ctx) {
  const d = c.data
  const sevOk = (v: unknown) => typeof v === "string" && (SEVERITIES as readonly string[]).includes(v)
  const hasRef = (v: unknown) => arr(v).length >= 1
  const count = (path: string, v: unknown, want: number) => {
    if (c.live && Array.isArray(v) && v.length !== want)
      c.add(path, "basis", `${path} has ${v.length} items, needs ${want}`)
  }
  for (const { path, n } of numbersOf(d)) {
    if (!sevOk(n.severity)) c.add(`${path}.severity`, "basis", `${path} has no known severity tag`)
    if (!str(n.counted)) c.add(`${path}.counted`, "basis", `${path} has no Counted line`)
    if (!str(obj(n.ref).url)) c.add(`${path}.ref.url`, "basis", `${path} has no source link`)
    const b = obj(n.basis)
    for (const k of ["who", "n", "where", "when", "measured"]) {
      if (!str(b[k])) c.add(`${path}.basis.${k}`, "basis", `${path} basis has no ${k}`)
    }
    if (!str(b.design)) c.add(`${path}.basis.design`, "basis", `${path} basis has no design`)
    if (!str(n.caveat)) c.add(`${path}.caveat`, "basis", `${path} has no caveat`)
  }
  const sevRef = (list: unknown, name: string) =>
    arr(list).forEach((raw, i) => {
      const x = obj(raw)
      if (!sevOk(x.severity)) c.add(`${name}[${i}].severity`, "basis", `${name}[${i}] has no known severity tag`)
      if (!hasRef(x.refs)) c.add(`${name}[${i}].refs`, "basis", `${name}[${i}] has no source`)
    })
  sevRef(d.beliefs, "beliefs")
  sevRef(d.facts, "facts")
  arr(d.symptomHelp).forEach((raw, i) => {
    const x = obj(raw)
    if (!["strong", "moderate", "weak", "none"].includes(String(x.evidence)))
      c.add(`symptomHelp[${i}].evidence`, "basis", `symptomHelp[${i}] has no evidence grade`)
    if (!hasRef(x.refs)) c.add(`symptomHelp[${i}].refs`, "basis", `symptomHelp[${i}] has no source`)
  })
  arr(d.symptomCourse).forEach((raw, i) => {
    const x = obj(raw)
    if (!["strong", "moderate", "weak", "none"].includes(String(x.evidence)))
      c.add(`symptomCourse[${i}].evidence`, "basis", `symptomCourse[${i}] has no evidence grade`)
    if (!hasRef(x.refs)) c.add(`symptomCourse[${i}].refs`, "basis", `symptomCourse[${i}] has no source`)
    if (x.symptom === "tired") c.add(`symptomCourse[${i}].symptom`, "basis", `symptomCourse[${i}] is "tired", which has no time-course source`)
  })
  arr(d.needs).forEach((n, i) =>
    arr(obj(n).swaps).forEach((raw, j) => {
      const s = obj(raw)
      const p = `needs[${i}].swaps[${j}]`
      if (!["strong", "moderate", "weak", "none"].includes(String(s.evidence)))
        c.add(`${p}.evidence`, "basis", `${p} has no evidence grade`)
      else if (s.evidence !== "none" && !hasRef(s.refs)) c.add(`${p}.refs`, "basis", `${p} has no source`)
    }),
  )
  arr(d.units).forEach((raw, i) => {
    const u = obj(raw)
    if (u.defaultPriceUsd !== null && u.defaultPriceUsd !== undefined && !hasRef(u.priceRefs))
      c.add(`units[${i}].priceRefs`, "basis", `units[${i}] has a price and no source`)
  })
  count("beliefs", d.beliefs, 12)
  count("facts", d.facts, 3)
  count("needs", d.needs, 8)
  count("tapeForward", d.tapeForward, 4)
  count("planSteps", d.planSteps, 5)
  if (c.live && Array.isArray(d.needs)) {
    const ids = d.needs.map((n) => obj(n).id)
    for (const need of NEED_IDS) if (!ids.includes(need)) c.add("needs", "basis", `needs has no "${need}"`)
  }
  if (c.live && Array.isArray(d.bands)) {
    const covered = new Array<number>(13).fill(0)
    for (const b of d.bands) {
      const { min, max } = obj(b)
      if (typeof min === "number" && typeof max === "number")
        for (let v = Math.max(0, min); v <= Math.min(12, max); v++) covered[v]++
    }
    covered.forEach((n, v) => {
      if (n !== 1) c.add("bands", "basis", `bands cover count ${v} ${n} times (needs exactly once)`)
    })
  }
}

function ruleCountedWords(c: Ctx) {
  const check = (path: string, sev: unknown, counted: unknown) => {
    const s = str(counted)
    if (s === undefined || typeof sev !== "string") return
    const re = COUNTED_KEYS[sev]
    if (re && !re.test(s)) c.add(`${path}.counted`, "counted-words", `Counted line "${s}" lacks the key words of "${sev}"`)
  }
  arr(c.data.beliefs).forEach((b, i) => check(`beliefs[${i}]`, obj(b).severity, obj(b).counted))
  arr(c.data.facts).forEach((b, i) => check(`facts[${i}]`, obj(b).severity, obj(b).counted))
  for (const { path, n } of numbersOf(c.data)) check(path, n.severity, n.counted)
}

function ruleRegex(c: Ctx, rule: string, re: RegExp, label: string, exempt?: RegExp, only?: RegExp) {
  for (const { path, text } of c.reader) {
    if (exempt && exempt.test(path)) continue
    if (only && !only.test(path)) continue
    const m = re.exec(text)
    if (m) c.add(path, rule, `${label}: "${m[0]}"`)
  }
}

function ruleDollar(c: Ctx) {
  for (const { path, text } of c.reader) if (text.includes("$")) c.add(path, "dollar", "no $ in a data file (use usd numbers)")
}

function ruleModeration(c: Ctx) {
  arr(c.data.beliefs).forEach((raw, i) => {
    const b = obj(raw)
    const text = `${str(b.limiting) ?? ""} ${str(b.scene) ?? ""}`
    const isMod = b.kind === "moderation"
    if (MOD_WORDS.test(text) && !isMod)
      c.add(`beliefs[${i}].kind`, "moderation", "a just-one belief must be kind moderation")
    if (isMod && !MOD_OK.has(String(b.severity)) && !/not checked/i.test(str(b.counted) ?? ""))
      c.add(`beliefs[${i}].severity`, "moderation", "a moderation proof must count hooked people or say it was not checked")
  })
}

function ruleBeliefEnding(c: Ctx) {
  arr(c.data.beliefs).forEach((raw, i) => {
    const e = obj(raw).blackBoxEnding
    if (e !== undefined && !(BLACKBOX_ENDING_IDS as readonly unknown[]).includes(e))
      c.add(`beliefs[${i}].blackBoxEnding`, "ending", "blackBoxEnding must be a known Black Box ending id")
  })
}

/** Every risky moment has exactly three cards. Nicotine must carry them; a draft addiction may hold an empty list. */
function ruleMomentSwaps(c: Ctx) {
  const d = c.data
  const moments = arr(d.riskyMoments).map((m) => str(obj(m).id)).filter((x): x is string => x !== undefined)
  const swaps = arr(d.momentSwaps)
  if (swaps.length === 0 && d.id !== "nicotine") return
  for (const id of moments) {
    const found = swaps.filter((s) => obj(s).momentId === id)
    const cards = found.length === 1 ? arr(obj(found[0]).cards) : []
    if (found.length !== 1) c.add("momentSwaps", "moment-swaps", `riskyMoments "${id}" needs exactly one momentSwaps entry`)
    else if (cards.length !== 3 || cards.some((x) => !str(x))) c.add("momentSwaps", "moment-swaps", `momentSwaps "${id}" needs exactly three cards`)
  }
  for (const s of swaps) {
    const id = obj(s).momentId
    if (typeof id !== "string" || !moments.includes(id)) c.add("momentSwaps", "moment-swaps", `momentSwaps entry "${String(id)}" matches no risky moment`)
  }
}

function ruleDanger(c: Ctx) {
  const dg = obj(c.data.danger)
  if (dg.level === "none" && dg.line !== null && dg.line !== undefined)
    c.add("danger.line", "danger", 'danger.line must be null when level is "none"')
  if (dg.level === "danger" && dg.line !== TODO && !str(dg.line))
    c.add("danger.line", "danger", 'danger.line must be set when level is "danger"')
}

function ruleForecast(c: Ctx) {
  ruleRegex(c, "forecast", FORECAST, "forecast", undefined, /^(endings|helped|lessons)\b|(^|\.)past\b/)
}

function ruleDoNotAvoid(c: Ctx) {
  arr(c.data.responses).forEach((raw, i) => {
    const t = str(obj(raw).text)
    if (t && NOT_AVOID.test(t.trim())) c.add(`responses[${i}].text`, "do-not-avoid", "a response says what to do, never a won't or avoid")
  })
}

function ruleToll(c: Ctx) {
  for (const { path, n } of numbersOf(c.data)) {
    for (const k of ["big", "headline", "mirror", "caveat", "counted"]) {
      const s = str(n[k])
      const m = s ? TOLL.exec(s) : null
      if (m) c.add(`${path}.${k}`, "toll", `no death tolls or millions: "${m[0]}"`)
    }
  }
}

export function validateAddiction(data: unknown, opts: { live: boolean } = { live: false }): Issue[] {
  const issues: Issue[] = []
  const d = obj(data)
  const reader: { path: string; text: string }[] = []
  readerText(d, "", reader)
  const c: Ctx = {
    data: d,
    live: opts.live,
    reader,
    add: (path, rule, message) => issues.push({ path, rule, message }),
  }
  ruleTodo(c)
  ruleWords(c)
  ruleBasis(c)
  ruleCountedWords(c)
  ruleRegex(c, "screening", SCREEN, "screening phrase")
  ruleRegex(c, "cheer", CHEER, "cheerleading")
  ruleRegex(c, "founder", FOUNDER, "founder voice", FOUNDER_EXEMPT)
  ruleDollar(c)
  ruleModeration(c)
  ruleBeliefEnding(c)
  ruleMomentSwaps(c)
  ruleDanger(c)
  ruleForecast(c)
  ruleDoNotAvoid(c)
  ruleRegex(c, "no-reset", NO_RESET, "no resets")
  ruleToll(c)
  return issues
}

/** Every file listed in data/live.json, checked as live. */
export function validateLive(): Issue[] {
  const out: Issue[] = []
  for (const id of liveIds()) {
    const file = getAddiction(id) as QuitAddiction | null
    if (!file) {
      out.push({ path: id, rule: "todo", message: `${id}: no data file` })
      continue
    }
    for (const i of validateAddiction(file, { live: true })) out.push({ ...i, path: `${id}.${i.path}`.replace(/\.\[/g, "[") })
  }
  return out
}
