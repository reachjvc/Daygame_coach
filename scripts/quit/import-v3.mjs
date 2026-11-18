#!/usr/bin/env node
// Writes src/quit/data/<id>.json from docs/research/addiction-one-pagers/08-v3.
// Missing fields are the string "TODO". `--check` compares instead of writing (exit 1 on difference).
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const DOCS = path.join(ROOT, "docs/research/addiction-one-pagers")
const OUT = path.join(ROOT, "src/quit/data")
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"))

// v3 id -> [v3 id, our id, display name]
const PILOTS = [
  ["nicotine", "nicotine", "Smoking or vaping"],
  ["cannabis", "weed", "Weed"],
  ["porn", "porn", "Porn"],
  ["alcohol", "alcohol", "Drinking"],
]
// from board/build_v3.py
const SUBS_V3 = { cannabis: { thing: "weed smoking" }, porn: { thing: "porn use" }, nicotine: { verb: "smoke or vape" } }
const TODO = "TODO"

const pick = (obj, keys) => {
  const out = {}
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k]
  return out
}
const cleanRef = (r) => pick(r, ["cite", "url", "pmid", "quote", "fetched", "fetchedOn"])
const toRefList = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]).map(cleanRef)

function parseMap(src, name, next) {
  const start = src.indexOf(`${name} = {`)
  const end = src.indexOf(next, start)
  const block = src.slice(start, end)
  const out = {}
  for (const m of block.matchAll(/"([\w-]+)":\s*\("([^"]+)"/g)) out[m[1]] = m[2]
  return out
}

const buildPy = fs.readFileSync(path.join(DOCS, "board/build_v3.py"), "utf8")
const symptomWords = {
  ...parseMap(buildPy, "HARD", "GOOD = {"),
  ...parseMap(buildPy, "GOOD", "\ndef _at"),
}

const template = readJson(path.join(DOCS, "06-template.json"))
const globalRefs = new Map((template.globalRefs || []).map((r) => [r.id, r]))

const stripHtml = (s) => s.replace(/<[^>]*>/g, "")

function buildNumber(n) {
  const out = pick(n, [
    "kind", "big", "headline", "mirror", "severity", "counted", "basis", "caveat",
    "projection", "pooled", "checked", "timeIsResult", "weak",
  ])
  out.ref = cleanRef(n.ref)
  const also = n.alsoRef ?? n.refs2
  if (also) out.alsoRef = toRefList(also)
  if (n.check) out.check = n.check
  return out
}

function buildBelief(b, i) {
  const out = {
    id: `b${i + 1}`,
    kind: b.kind,
    scene: TODO,
    short: TODO,
    need: TODO,
    limiting: b.limiting,
    counterpart: b.counterpart,
    whenThought: b.test,
    test: b.testR7 ?? TODO,
    proof: b.proof,
    severity: b.severity,
    counted: b.counted ?? null,
    refs: toRefList(b.refs),
  }
  if (b.weak) out.weak = b.weak
  if (b.ownWords) out.ownWords = true
  if (b.check) out.check = b.check
  return out
}

function buildFelt(v3id) {
  const f = readJson(path.join(DOCS, "08-v3/felt", `${v3id}.json`))
  const years = (f.harvest.match(/\d{4}[–-]\d{4}/) || ["2021–2025"])[0]
  return {
    forums: f.forums,
    years,
    postsUsed: f.nUsed,
    postsSampled: f.nSampled,
    bias: f.biases,
    bins: f.bins.map((b) => pick(b, ["label", "from", "to", "n", "symptoms", "positives"])),
  }
}

function buildPlanSteps(v3id, page) {
  const tp = template.pages.find((p) => p.id === v3id)
  const subs = { ...(tp ? tp.subs : {}), ...(SUBS_V3[v3id] || {}) }
  const refById = new Map([...globalRefs, ...(page.researchRefsToAdd || []).map((r) => [r.id, r])])
  return template.planTitles.map((title, i) => {
    const text = stripHtml(
      template.plan[i].replace(/\{(\w+)\}/g, (m, k) => (subs[k] !== undefined ? subs[k] : m)),
    )
    const v = page.plan[i] || {}
    const step = { title, text, do: v.do ?? TODO }
    if (v.proof) {
      const p = v.proof
      let refs = []
      if (p.ref) refs = [typeof p.ref === "string" ? refById.get(p.ref) : p.ref]
      refs = refs.map((r) => (r ? cleanRef(r) : TODO))
      step.proof = { text: p.text, refs, severity: p.severity ?? TODO }
      if (p.counted) step.proof.counted = p.counted
      if (p.weak) step.proof.weak = p.weak
      if (p.ownWords) step.proof.ownWords = true
    }
    return step
  })
}

function buildFooter(page) {
  const f = page.footerProposal
  if (!f) return null
  const byId = new Map([...globalRefs, ...(page.researchRefsToAdd || []).map((r) => [r.id, r])])
  const refs = (f.refs || []).map((r) => {
    const full = typeof r === "string" ? byId.get(r) : r
    return full ? cleanRef(full) : TODO
  })
  return { text: f.text, refs }
}

function build([v3id, id, name]) {
  const page = readJson(path.join(DOCS, "08-v3/pages", `${v3id}.json`))
  const hope = page.numbers.find((n) => n.kind === "hope-free-now")
  const alcohol = id === "alcohol"
  return {
    id,
    name,
    units: TODO,
    costKind: TODO,
    danger: { level: alcohol ? "danger" : "none", line: alcohol ? TODO : null, refs: [] },
    footerNote: buildFooter(page),
    hope: hope ? buildNumber(hope) : null,
    numbers: page.numbers.map(buildNumber),
    keyFacts: TODO,
    beliefs: page.beliefs.map(buildBelief),
    facts: TODO,
    needs: TODO,
    endings: TODO,
    helped: TODO,
    riskyMoments: TODO,
    responses: TODO,
    clearOut: TODO,
    symptomWords,
    symptomHelp: TODO,
    tapeForward: TODO,
    costSwaps: TODO,
    besides: TODO,
    felt: buildFelt(v3id),
    lessons: TODO,
    bands: TODO,
    catch: TODO,
    planSteps: buildPlanSteps(v3id, page),
  }
}

function countTodos(x) {
  if (x === TODO) return 1
  if (Array.isArray(x)) return x.reduce((s, v) => s + countTodos(v), 0)
  if (x && typeof x === "object") return Object.values(x).reduce((s, v) => s + countTodos(v), 0)
  return 0
}

const check = process.argv.includes("--check")
let diffs = 0
for (const pilot of PILOTS) {
  const data = build(pilot)
  const text = JSON.stringify(data, null, 2) + "\n"
  const file = path.join(OUT, `${data.id}.json`)
  const topTodo = Object.entries(data).filter(([, v]) => v === TODO).length
  console.log(`${data.id}: ${countTodos(data)} TODO values (${topTodo} whole fields)`)
  if (check) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null
    if (cur !== text) {
      diffs++
      console.error(`DIFF: ${path.relative(ROOT, file)}`)
    }
  } else {
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(file, text)
  }
}
if (check && diffs) process.exit(1)
