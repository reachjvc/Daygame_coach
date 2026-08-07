/**
 * Walks the Life Mastery intake the way a user does, on a fresh state, and
 * fails on anything that cannot be completed through visible UI.
 *
 * WHY THIS EXISTS: the intake shipped with its first question unclickable and
 * page 3 impossible to finish, while 2,204 unit tests passed and the earlier
 * browser check reported 17/17. That check clicked "I'm not sure yet" to get
 * past the broken question, so it verified the escape hatch rather than the
 * flow. The rules here are the ones that would have caught it:
 *
 *   - a page CTA must never need a skip link to enable
 *   - a question on a generic page must offer a real control
 *   - the goal path must actually produce a goal, with its belief, desire
 *     and pain-why controls present
 *
 * Run: node scripts/dev/vision-plan-walk.mjs   (needs the dev server on :3000)
 */
import { chromium } from 'playwright'
const findings = []
const note = (page, sev, what) => findings.push({page, sev, what})
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
p.on('pageerror', e => note('*','BREAK','pageerror: '+e.message))
p.on('console', m => { if (m.type()==='error' && !/401|favicon/.test(m.text())) note('*','ERR','console: '+m.text().slice(0,120)) })

await p.goto('http://localhost:3000/test/vision-plan',{waitUntil:'domcontentloaded'})
await p.evaluate(()=>localStorage.clear())
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1600)
const plan = await p.$('button:has-text("Plan")'); if (plan) { await plan.click(); await p.waitForTimeout(900) }

// Inspect every revealed question card for a usable control.
async function auditQuestions(pageName) {
  const cards = await p.$$eval('[id^="intake-"]', els => els.map(el => {
    const id = el.id.replace('intake-','')
    const heading = el.querySelector('h3')?.textContent?.trim() || ''
    const inputs = el.querySelectorAll('input,textarea,select')
    const buttons = [...el.querySelectorAll('button')].map(x => (x.textContent||'').trim())
    const real = buttons.filter(t => t && !/not sure yet|worked answer/i.test(t))
    const skip = buttons.some(t => /not sure yet/i.test(t))
    const warn = /not finished yet/i.test(el.textContent || '')
    const pointer = /below/i.test(el.textContent || '')
    return { id, heading, nInputs: inputs.length, realButtons: real, skip, warn, pointer }
  }))
  for (const c of cards) {
    if (c.warn) note(pageName,'BREAK',`"${c.id}" renders the unfinished-question warning`)
    else if (c.nInputs === 0 && c.realButtons.length === 0 && !c.pointer && /^[12]/.test(pageName))
      note(pageName,'BREAK',`"${c.id}" (${c.heading.slice(0,45)}) has NO control, only ${c.skip?'the skip link':'nothing'}`)
    else if (c.nInputs === 0 && c.realButtons.length === 0 && !c.pointer)
      note(pageName,'ODD',`"${c.id}" has neither a control nor a pointer to its editor`)
    if (!c.heading) note(pageName,'ODD',`"${c.id}" has no visible question heading`)
  }
  return cards
}


// Advance a page. If the CTA is disabled, record WHY and use the skip links so
// the walk continues instead of stopping at the first wall.
async function advance(pageName, ctaText) {
  const cta = await p.$(`button:has-text("${ctaText}")`)
  if (!cta) { note(pageName,'BREAK',`no "${ctaText}" CTA at all`); return false }
  if (await cta.isDisabled()) {
    const blockers = await p.$$eval('[id^="intake-"]', els => els
      .filter(el => !el.querySelector('.bg-emerald-400'))
      .map(el => el.id.replace('intake-','')))
    note(pageName,'BREAK',`"${ctaText}" is disabled after filling every visible field. Unsettled: ${JSON.stringify(blockers)}`)
    note(pageName,'BREAK','a page CTA must never require the skip link to enable')
    for (const b of blockers) {
      const link = await p.$(`#intake-${b} >> text=not sure yet`)
      if (link) { await link.click().catch(()=>{}); await p.waitForTimeout(400) }
    }
    const again = await p.$(`button:has-text("${ctaText}")`)
    if (again && !(await again.isDisabled())) { await again.click(); await p.waitForTimeout(1100); return true }
    note(pageName,'BREAK',`still stuck after using every skip link`)
    return false
  }
  await cta.click(); await p.waitForTimeout(1100); return true
}

// ---------- PAGE 1 ----------
note('nav','INFO','h1 = '+await p.textContent('h1'))
await auditQuestions('1 What matters')
await p.click('#intake-commit button:has-text("I commit")').catch(()=>note('1','BREAK','no commit button'))
await p.waitForTimeout(700)
await auditQuestions('1 What matters')
await p.fill('#intake-values_audit input','Freedom'); await p.keyboard.press('Enter'); await p.waitForTimeout(600)
await p.screenshot({path:'.playwright-mcp/walk-p1.png',fullPage:true})
await advance('1 What matters','Next: Where')

// ---------- PAGE 2 ----------
note('nav','INFO','h1 = '+await p.textContent('h1'))
await p.fill('#intake-vision textarea','Strong, free, present with my family.'); await p.waitForTimeout(800)
await p.fill('#intake-purpose textarea','So my kids see me keep my word.'); await p.waitForTimeout(700)
await p.fill('#intake-identity input','I am consistent'); await p.keyboard.press('Enter'); await p.waitForTimeout(700)
await p.fill('#intake-conduct input','On time, always'); await p.keyboard.press('Enter'); await p.waitForTimeout(900)
await auditQuestions('2 Where going')
await p.screenshot({path:'.playwright-mcp/walk-p2.png',fullPage:true})
await advance('2 Where going','Next: Your areas')

// ---------- PAGE 3 ----------
note('nav','INFO','h1 = '+await p.textContent('h1'))
const q3 = await auditQuestions('3 Your areas')
if (q3.length === 0) note('3','ODD','no question cards render at all; the page is only the wheel')
const bodyP3 = await p.textContent('body')
if (!/what a 10/i.test(bodyP3) && !/your 10/i.test(bodyP3)) note('3','ODD','no visible mention of your 10 before opening a room')
await p.screenshot({path:'.playwright-mcp/walk-p3.png',fullPage:true})
// try to open a room the way a user would
let opened = false
// a user clicks the LABEL, so that is what the walk clicks
for (const sel of ['svg text:has-text("Health")','[role="button"][aria-label^="Health"]']) {
  const el = await p.$(sel)
  if (el) { await el.click().catch(()=>{}); await p.waitForTimeout(1100)
    if (await p.$('textarea[aria-label^="Your 10"]')) { opened = true
      if (sel.includes('role=')) note('3','ODD','the wheel LABEL is not clickable, only the wedge')
      break } }
}
if (!opened) note('3','BREAK','could not open an area room at all')
else {
  await p.fill('textarea[aria-label^="Your 10"]','Lean and strong, training four times a week')
  const z = await p.$('textarea[aria-label^="Your 0"]')
  if (!z) note('3','BREAK','room has a 10 field but no 0 field')
  else await z.fill('No training, tired all day')
  await p.click('h1'); await p.waitForTimeout(800)
  await p.screenshot({path:'.playwright-mcp/walk-p3-room.png',fullPage:true})
}
await advance('3 Your areas',"Next: What you")

// ---------- PAGE 4 ----------
note('nav','INFO','h1 = '+await p.textContent('h1'))
const q4 = await auditQuestions('4 What you will do')
if (q4.length === 0) note('4','ODD','no question cards render; page 4 is only the legacy goal editor')
// Actually create a goal the way a user would, then check the qualification stack.
// the real path: dump a want, then circle it so it becomes a goal
const gInput = await p.$('input[placeholder*="Another want" i]')
if (!gInput) note('4','BREAK','no way to enter a want on page 4')
else {
  await gInput.fill('Train four times a week'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200)
  const circle = await p.$('button:has-text("Circle it")')
  if (!circle) note('4','BREAK','a want cannot be circled into a goal')
  else {
    await circle.click(); await p.waitForTimeout(900)
    // circling opens an inline compose form; a goal exists only once it is added
    const t = await p.$('input[placeholder*="The goal, specific" i]')
    if (!t) note('4','BREAK','circling a want does not open a way to write the goal')
    else {
      await t.fill('Train four times a week')
      const why = await p.$('input[placeholder*="Why do you want this" i], textarea[placeholder*="Why do you want this" i]')
      if (why) await why.fill('Energy for my kids.')
      const add = await p.$('button:has-text("Add goal")')
      if (!add) note('4','BREAK','no Add goal button on the compose form')
      else { await add.click(); await p.waitForTimeout(1600) }
    }
  }
}
const nGoals = await p.evaluate(()=>((JSON.parse(localStorage.getItem('visionPlanSandbox_v1')||'{}').goals)||[]).length)
if (nGoals === 0) note('4','BREAK','no goal was created through the workshop')
for (const [label, sel] of [['belief','[aria-label^="Belief level"]'],['desire','[aria-label^="Desire level"]'],['pain-why','[aria-label^="Pain-why"]']]) {
  if (!(await p.$(sel))) note('4','BREAK',`${label} control missing on a created goal`)
}
const signable = await p.$('button:has-text("Start tracking"), button:has-text("Sign")')
if (!signable) note('4','ODD','no sign control found to finish the intake')
await p.screenshot({path:'.playwright-mcp/walk-p4.png',fullPage:true})

// ---------- cross-cutting ----------
const saves = await p.$$eval('button', e=>e.map(x=>x.textContent.trim()).filter(t=>/^save$/i.test(t)))
if (saves.length) note('*','ODD','a Save button exists: '+JSON.stringify(saves))
await b.close()

const order = {BREAK:0, ODD:1, ERR:2, INFO:3}
findings.sort((a,b)=>order[a.sev]-order[b.sev])
for (const f of findings) console.log(`${f.sev.padEnd(5)} [${f.page}] ${f.what}`)
console.log(`\n${findings.filter(f=>f.sev==='BREAK').length} BREAK, ${findings.filter(f=>f.sev==='ODD').length} ODD`)
