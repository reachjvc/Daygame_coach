// Checks the built one-pager prototype as it renders (RULEBOOK rules 24, 27, 28): every reader view at 390 and
// 1280 px, and the review page. Run by build_v3.py after it writes the page; prints "FAIL <rule> <where>: <msg>".
// Usage: node board/check_render_v3.mjs <built.html>   (SHOTS=<dir> also saves full-page screenshots)
/* global DATA -- the built page's own globals, read inside pg.evaluate */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const file = process.argv[2];
if (!file) { console.error("usage: node check_render_v3.mjs <built.html>"); process.exit(2); }
const url = pathToFileURL(path.resolve(file)).href;
const shots = process.env.SHOTS || "";
let fails = 0, warns = 0;
const FAIL = (rule, where, msg) => { fails++; console.log(`FAIL ${rule} ${where}: ${msg}`); };
const WARN = (rule, where, msg) => { warns++; console.log(`WARN ${rule} ${where}: ${msg}`); };

const browser = await chromium.launch();
try {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on("pageerror", e => errs.push(String(e.message || e)));
    pg.on("console", m => { if (m.type() === "error" && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push(m.text()); });
    await pg.goto(url);
    const pilots = await pg.evaluate(() => DATA.pages.map(p => p.id));
    for (const pilot of pilots) {
      for (const ver of ["mix", "1", "2"]) {
        const where = `${pilot} v${ver} ${width}px`;
        await pg.evaluate(h => { location.hash = h; }, `#read-${pilot}-${ver}`);
        await pg.waitForTimeout(60);
        const r = await pg.evaluate(() => {
          const P = DATA.pages.find(p => p.id === location.hash.split("-")[1]);
          const art = document.querySelector("#frames .page");
          const txt = art ? art.innerText : "";
          const lis = [...art.querySelectorAll(".sec-sources li")];
          const cited = new Set();
          for (const b of art.querySelectorAll(".ref")) (b.textContent.match(/\d+/g) || []).forEach(n => cited.add(+n));
          const heroChips = [...art.querySelectorAll(".sec-hero .tag")].map(t => t.textContent.trim());
          const secs = [...art.querySelectorAll("section.sec")].map(s => s.dataset.sec);
          const heroHasNum = !!art.querySelector(".sec-hero .big, .sec-hero .grid100");
          const tableLink = [...art.querySelectorAll("a.tlink")].some(a => a.textContent === "the table above");
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            values: lis.map(li => +li.value), forum: lis.filter(li => /tagged by an AI reader for this page/.test(li.textContent)).length,
            cited: [...cited], heroChips, secs, heroHasNum, tableLink,
            hasTableText: /the table above/.test(txt),
            prop: /Proposed to remove/i.test(txt), back: /Back to the review page/i.test(txt),
            few: [...art.querySelectorAll(".felt")].some(f => /\bfew\b(?!\s+(?:to|posts))/.test(f.textContent)),
            never: /Never above/.test(txt),
            bars: art.querySelectorAll(".bw").length, barsDrawn: art.querySelectorAll(".bw .btrack i.main").length,
            windows: (P.windows || []).length,
            // each empty picked kind is either answered by a shown card of its group (or a 'near' kind) in its section,
            // or named in that section's gap line
            unanswered: (() => {
              const KK = Object.fromEntries(DATA.kinds.kinds.map(k => [k.id, k]));
              const noHero = !art.querySelector(".sec-hero .big, .sec-hero .grid100");
              const out = [];
              const shownAll = new Set([...art.querySelectorAll("[data-kind]")].map(e => e.dataset.kind));
              const noCard = Object.keys(KK).filter(k => KK[k].scope === "specific" && KK[k].pick && !shownAll.has(k));
              const gr = P.gapReaderLine && typeof P.gapReaderLine === "object" ? P.gapReaderLine : null;
              for (const k of noCard) {
                const K = KK[k]; if (!K || !K.pick) continue;
                const where = K.where.startsWith("hero") ? (noHero ? "more" : null) : K.where;
                if (!where || !["more", "outlook"].includes(where)) continue;
                const sec = art.querySelector(where === "more" ? ".sec-quit" : ".sec-outlook");
                const shown = sec ? [...sec.querySelectorAll("[data-kind]")].map(e => e.dataset.kind) : [];
                const covered = shown.some(s => KK[s].group === K.group || (K.near || []).includes(s));
                const gtext = sec ? [...sec.querySelectorAll(".gapl")].map(g => g.innerText).join(" ") : "";
                const g = (P.gaps || []).find(g => g.kind === k);
                const named = (K.gapPhrase && gtext.includes(K.gapPhrase)) || (g && g.reader && gtext.includes(g.reader.replace(/\.$/, ""))) || (gr && (gr.kinds || []).includes(k) && gtext.includes(gr.text));
                if (!covered && !named) out.push(k);
              }
              return out;
            })(),
            tokens: (txt.match(/\{\w+\}/g) || []).slice(0, 3),
            // round 7
            hedge: (document.body.innerText.match(/likely runs high/i) || [])[0] || "",
            wantDef: !!(P.heroDefinition && (typeof P.heroDefinition === "string" ? P.heroDefinition : P.heroDefinition.text || P.heroDefinition.line)),
            hasDef: ((art.querySelector(".sec-hero .hdef") || {}).innerText || "").trim().length > 0,
            wantRange: !!(P.heroRange && ((P.heroRange.studies || []).length || P.heroRange.line)), hasRange: !!art.querySelector(".sec-hero .hrange"),
            rangeStudies: art.querySelectorAll(".sec-hero .hstudies li").length, wantStudies: ((P.heroRange || {}).studies || []).length,
            wantHalf: !!P.heroHalfFree, hasHalf: !!art.querySelector(".sec-hero .hhalf"),
            noteCtl: art.querySelectorAll(".nbtn, .inote, .nadd").length,
            // G3: every number card carries one of the two tags
            untagged: [...art.querySelectorAll("[data-kind]")].filter(c => c.querySelectorAll(".tag.chk").length !== 1).map(c => c.dataset.kind),
            offShown: (P.numbers || []).filter(x => DATA.kinds.kinds.find(k => k.id === x.kind)?.pick && !["hero", "hero-second"].includes(DATA.kinds.kinds.find(k => k.id === x.kind).where)).length - art.querySelectorAll("[data-kind]").length,
            // G2: a belief proof never repeats a big figure shown on its page (hero or a card)
            repeats: (() => {
              const KK = Object.fromEntries(DATA.kinds.kinds.map(k => [k.id, k]));
              const shown = new Set([...art.querySelectorAll("[data-kind]")].map(e => e.dataset.kind));
              const heroOn = !!art.querySelector(".sec-hero .big, .sec-hero .grid100");
              const nums = t => (String(t).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(v => +v.replace(/,/g, "")).filter(v => v !== 100);
              const bigs = (P.numbers || []).filter(x => KK[x.kind] && KK[x.kind].pick && (shown.has(x.kind) || (heroOn && KK[x.kind].where.startsWith("hero")))).map(x => x.big);
              const out = [];
              (P.beliefs || []).forEach((b, i) => {
                // rounding only for figures of 10 or more (90.6 = 91), never small counts (1.6 is not 2)
                const have = new Set(nums(b.proof).flatMap(v => v >= 10 ? [v, Math.round(v)] : [v]));
                // a big figure with a unit ("2 tries", "14 years") repeats only if the proof has that number with that unit
                const unitOk = big => { const m = String(big).match(/(\d[\d,.]*)\s+([a-z]+)/i); if (!m || /^(in|of|vs)$/i.test(m[2])) return true; const u = m[2].toLowerCase().replace(/s$/, ""); return new RegExp(m[1].replace(/[.,]/g, "\\$&") + "\\+?\\s+(?:serious\\s+|more\\s+)?" + u, "i").test(b.proof); };
                for (const big of bigs) { const ns = nums(big); if (ns.length && ns.some(v => v >= 2) && ns.every(v => have.has(v)) && unitOk(big)) { out.push(`belief ${i + 1} repeats “${big}”`); break; } }
              });
              return out;
            })(),
            merged: DATA.pages.some(p => p.heroDefinition || p.heroRange),
            // round 4: the hero shows both hope numbers when both exist; a projection chip only beside a projected line
            bothHope: ["hope-free-now", "hope-lifetime"].every(k => (P.numbers || []).some(x => x.kind === k) && DATA.kinds.kinds.find(y => y.id === k).pick),
            heroText: (art.querySelector(".sec-hero") || { innerText: "" }).innerText,
            heroBigs: ["hope-free-now", "hope-lifetime"].map(k => ((P.numbers || []).find(x => x.kind === k) || {}).big).filter(Boolean),
            felth: art.querySelectorAll(".sec-graph .felth").length,
            oldChip: /Projected, not counted/.test(txt),
            // round 5
            heroLine: ((art.querySelector(".sec-hero .line") || {}).innerText || "").trim(),
            graphAll: [...art.querySelectorAll(".sec-graph .peaks, .sec-graph .say")].map(e => e.innerText).join(" ").replace(/\s+/g, " ").toLowerCase(),
            // round 8: the score is gone from the whole graph section, and every chart draws 3 lines or more
            graphSec: ((art.querySelector(".sec-graph") || {}).innerText || ""),
            hasFelt: !!P.felt,
            charts: [...art.querySelectorAll(".sec-graph .fv svg, .sec-graph .fh svg")].map(s => s.querySelectorAll("g.ln").length)
              .concat([...art.querySelectorAll(".sec-graph table.ftab")].map(t => t.querySelectorAll("tbody tr").length)),
            wantHead: P.feltHead || [],
            appShown: !!art.querySelector(".appc"),
            appHidden: (() => { const c = DATA.decisions.choices.find(c => c.id === "appdata"); return !!(c && (c.answered || c.rec) === "hide"); })(),
            averTwice: [...art.querySelectorAll("[data-kind]")].filter(c => /averag\w*\s+across/i.test((c.querySelector(".hl") || {}).textContent || "") && /Average across studies/.test(c.textContent)).map(c => c.querySelector(".big")?.textContent),
            chips: [...art.querySelectorAll(".tag.weak")].map(t => t.textContent.trim()),
            gapTexts: [...art.querySelectorAll(".gapl")].map(g => g.innerText.trim()),
            likedMissing: (P.numbers || []).filter(x => x.liked && DATA.kinds.kinds.find(k => k.id === x.kind)?.pick).map(x => x.big).filter(b => !txt.includes(b)),
          };
        });
        if (r.overflow > 1) FAIL(24, where, `page scrolls sideways by ${r.overflow} px`);
        const want = r.values.map((_, i) => i + 1);
        if (r.values.join() !== want.join()) FAIL(9, where, `source list numbering ${r.values.join(",")} (should run 1..${r.values.length} with no gaps)`);
        if (r.forum > 1) FAIL(9, where, `the forum posts are listed ${r.forum} times in the sources`);
        const missing = r.cited.filter(n => !r.values.includes(n));
        if (missing.length) FAIL(9, where, `cites [${missing.join(",")}] but the source list has no such entry`);
        const dup = r.heroChips.filter((c, i) => r.heroChips.indexOf(c) !== i);
        if (dup.length) FAIL(15, where, `hero shows the same chip twice: ${dup[0]}`);
        if (!r.heroHasNum) {
          const i = r.secs.indexOf("hero");
          if (r.secs[i + 1] !== "beliefs") FAIL(15, where, `no hope number, but the page doesn't go straight to the beliefs (next: ${r.secs[i + 1]})`);
        }
        if (r.hasTableText && !r.tableLink) FAIL(21, where, "“the table above” is not a link to the beliefs");
        if (r.prop) FAIL(27, where, "a card shows “Proposed to remove” (the off-reader choice covers it)");
        if (r.back) FAIL(29, where, "reader view shows “Back to the review page”");
        if (r.few) FAIL(18, where, "the graph says “few” instead of a post count");
        if (r.never) FAIL(18, where, "the graph says “Never above” its own peak");
        if (r.windows && r.barsDrawn !== r.windows) FAIL(18, where, `${r.windows} body rows, ${r.barsDrawn} drawn as bars`);
        if (r.unanswered.length) FAIL(14, where, `picked kinds with no number, no card answering them and no gap line: ${r.unanswered.join(", ")}`);
        if (r.tokens.length) FAIL(28, where, `unfilled fact in reader text: ${r.tokens.join(" ")}`);
        if (r.hedge) FAIL(10, where, `the page says “${r.hedge}” (G1: no hedge words; show the definition and the range)`);
        if (r.wantDef && !r.hasDef) FAIL(15, where, "the page has a heroDefinition but the hero shows no definition line (G1)");
        if (r.wantRange && !r.hasRange) FAIL(15, where, "the page has a heroRange but the hero shows no range line (G1)");
        if (r.rangeStudies !== r.wantStudies) FAIL(15, where, `the range fold lists ${r.rangeStudies} studies, the data has ${r.wantStudies} (G1)`);
        if (r.wantHalf && !r.hasHalf) FAIL(15, where, "the page has a heroHalfFree but the hero shows no half-free line (G1)");
        if (r.noteCtl) FAIL(29, where, `the reader's page shows ${r.noteCtl} note controls (review only)`);
        if (r.untagged.length) FAIL(3, where, `number cards without exactly one “Checked as hooked” / “Not checked for addiction” tag: ${r.untagged.join(", ")}`);
        if (r.offShown > 0) FAIL(27, where, `${r.offShown} picked cards are missing from the page (G3: cards about people not checked stay, labelled)`);
        if (ver === "mix" && (r.merged || width === 390)) for (const m of r.repeats) (r.merged ? FAIL : WARN)("G2", `${pilot} ${width}px`, `${m} (a belief proof never repeats a number shown on its page)`);
        const norm = t => t.replace(/^about\s+/i, "").toLowerCase();
        if (r.bothHope && !(/projected to get free|projected/i.test(r.heroText) && r.heroBigs.every(b => r.heroText.toLowerCase().includes(norm(b)))))
          FAIL(15, where, `the page has both hope numbers but the hero doesn't show both (${r.heroBigs.join(", ")})`);
        if (/Worked out|Projection/i.test(r.heroText) && !/projected/i.test(r.heroText)) FAIL(10, where, "a projection chip in the hero, but no projected figure on it");
        if (r.oldChip) FAIL(10, where, "the old “Projected, not counted” chip is back (D6: one chip, “Worked out, not counted”)");
        if (r.heroLine && /^(?:start with|here is|here are|below|read)\b/i.test(r.heroLine)) FAIL(6, where, `the hero line says what comes next: “${r.heroLine}”`);
        if (r.hasFelt) {
          if (/out of 10|0 to 10|\bscored\b|hardest stretch|easier from|no clear easing/i.test(r.graphSec)) FAIL(18, where, `the graph section still speaks of the old score: “${(r.graphSec.match(/[^.\n]*(?:out of 10|0 to 10|\bscored\b|hardest stretch|easier from|no clear easing)[^.\n]*/i) || [""])[0].trim()}”`);
          if (!r.charts.length) FAIL(18, where, "the graph section draws no chart");
          for (const c of r.charts) if (c < 3) FAIL(18, where, `a graph draws ${c} lines (3 or more)`);
          if (!r.wantHead.length) FAIL(18, where, "the build gave no graph headline");
          for (const s of r.wantHead) if (!r.graphAll.includes(s.toLowerCase())) FAIL(18, where, `the graph headline doesn't say what the data gives: “${s}”`);
        }
        if (r.appShown && r.appHidden) FAIL(16, where, "the I Am Sober chart shows, but he chose to leave it out");
        for (const c of r.chips) {
          if ((c.match(/worked out/gi) || []).length > 1) FAIL(10, where, `a chip says “worked out” twice: ${c}`);
          const [lead, ...rest] = c.split(";");
          const lw = new Set((lead.match(/[a-z]{4,}/gi) || []).map(w => w.toLowerCase()));
          const rep = (rest.join(";").match(/[a-z]{4,}/gi) || []).map(w => w.toLowerCase()).filter(w => lw.has(w));
          if (rep.length) FAIL(10, where, `a chip repeats “${rep[0]}”: ${c}`);
        }
        const phrases = r.gapTexts.flatMap((t, i) => t.replace(/^Not counted here yet(?:, in people checked as hooked)?:\s*/, "").replace(/\.$/, "").split(/;\s*/).map(ph => [i, ph.toLowerCase().split(/\s+/).slice(0, 4).join(" ")]));
        for (const [i, ph] of phrases) if (ph.split(" ").length >= 3 && r.gapTexts.some((t, j) => j !== i && t.toLowerCase().includes(ph))) { FAIL(27, where, `two gap lines say the same thing: “${ph}…”`); break; }
        if (r.averTwice.length) FAIL(10, where, `“average” said twice on one card face (headline and chip): ${r.averTwice.join(", ")}`);
        if (ver === "mix" && r.likedMissing.length) FAIL(26, where, `cards he liked in version 10 are missing on the recommended view: ${r.likedMissing.join(", ")}`);
        if (r.felth !== 1) FAIL(18, where, `${r.felth} graph headlines (one, D9)`);
        if (shots && ver === "mix") await pg.screenshot({ path: path.join(shots, `${pilot}-${width}.png`), fullPage: true });
      }
    }
    // G5: on the review page (not the reader's), every section bar, belief, number card, plan step and the body rows
    // carry a "Note" button, and pressing one opens the note box right there, in the frame that was pressed
    await pg.evaluate(() => { try { localStorage.clear(); } catch { /* storage blocked: the page opens without it */ } location.hash = ""; });
    await pg.reload();
    for (const pilot of pilots) {
      const n = await pg.evaluate(async pid => {
        document.querySelector(`#tabs [data-pilot="${pid}"]`).click();
        await new Promise(r => setTimeout(r, 40));
        const out = { frames: 0, miss: [], opened: null, hint: null };
        for (const fr of document.querySelectorAll("#frames .frame")) {
          out.frames++;
          const need = [...fr.querySelectorAll(".labbar"), ...fr.querySelectorAll(".brow, .lrow"), ...fr.querySelectorAll("[data-kind]"), ...fr.querySelectorAll(".pstep, .tstop"), ...fr.querySelectorAll('[data-nk$="/graph/body"]')];
          for (const el of need) if (!el.querySelector(":scope .nbtn")) out.miss.push((el.className || el.dataset.nk || "?").toString().slice(0, 30));
        }
        // press the first belief's Note in the first frame: the box must open inside that belief, a draft shows the hint
        const fr = document.querySelector("#frames .frame");
        const btn = fr && fr.querySelector(".brow .nbtn, .lrow .nbtn");
        if (btn) {
          const key = btn.dataset.inote;
          btn.click();
          await new Promise(r => setTimeout(r, 40));
          const fr2 = document.querySelector("#frames .frame");
          const row = fr2.querySelector(`[data-nk="${CSS.escape(key)}"]`);
          const ta = row && row.querySelector(".inote textarea");
          out.opened = !!ta && !!row.querySelector(".inote button[data-nadd]") && /Save/.test(row.querySelector(".inote button[data-nadd]").textContent);
          if (ta) {
            ta.value = "test draft"; ta.dispatchEvent(new Event("input", { bubbles: true }));
            const h = row.querySelector(".unsaved");
            out.hint = !!h && !h.hidden && /Not saved yet: press Save/.test(h.textContent);
            ta.value = ""; ta.dispatchEvent(new Event("input", { bubbles: true }));
          }
          const b2 = fr2.querySelector(`.nbtn[data-inote="${CSS.escape(key)}"]`); if (b2) b2.click();
          await new Promise(r => setTimeout(r, 20));
        }
        out.overflow = document.documentElement.scrollWidth - innerWidth;
        return out;
      }, pilot);
      const where = `${pilot} review ${width}px`;
      if (!n.frames) FAIL(29, where, "no page frame on the review page");
      if (n.miss.length) FAIL("G5", where, `${n.miss.length} sections or items without a Note button (first: ${n.miss[0]})`);
      if (n.opened === false) FAIL("G5", where, "pressing a belief's Note does not open a box with a Save button inside that belief");
      if (n.hint === false) FAIL("G5", where, "a typed draft does not say “Not saved yet: press Save”");
      if (n.overflow > 1) FAIL(24, where, `review page scrolls sideways by ${n.overflow} px with a note box open`);
    }
    // the review page, as he first opens it (no saved marks, recommendations applied)
    if (width === 1280) {
      await pg.evaluate(() => { try { localStorage.clear(); } catch { /* storage blocked: the page opens without it */ } location.hash = ""; });
      await pg.reload();
      const rv = await pg.evaluate(async () => {
        const out = { asks: 0, prop: 0, tokens: [], tabs: {}, hedge: [], nothing: null, answered: 0, open: null };
        for (const b of [...document.querySelectorAll("#rtabs button")]) {
          b.click();
          await new Promise(r => setTimeout(r, 30));
          const t = document.querySelector("#rbody").innerText;
          out.tabs[b.dataset.rtab] = t.length;
          if (/likely runs high/i.test(t)) out.hedge.push(b.dataset.rtab);
          if (b.dataset.rtab === "choices") {
            out.asks = document.querySelectorAll("#rbody .ritem:not(.done)").length;
            out.answered = document.querySelectorAll("#rbody .ritem.done").length;
            out.open = DATA.decisions.choices.filter(c => !c.answered).length;
            out.nothing = /Nothing left to choose/.test(t);
            out.recorded = DATA.decisions.choices.filter(c => c.answered).length;
          }
          out.tokens.push(...(t.match(/\{\w+\}/g) || []));
        }
        for (const pl of [...document.querySelectorAll("#tabs button")]) {
          pl.click();
          await new Promise(r => setTimeout(r, 30));
          out.prop += document.querySelectorAll("#frames .tag.prop").length + (/Proposed to remove/i.test(document.querySelector("#frames").innerText) ? 1 : 0);
          if (/likely runs high/i.test(document.body.innerText)) out.hedge.push("page " + pl.dataset.pilot);
        }
        return out;
      });
      if (rv.asks > 7) FAIL(27, "review page", `${rv.asks} choices (7 max)`);
      if (rv.prop) FAIL(27, "review page", "cards still ask “Proposed to remove” on their own");
      if (rv.tokens.length) FAIL(28, "review page", `unfilled facts: ${[...new Set(rv.tokens)].join(" ")}`);
      if (rv.hedge.length) FAIL(10, "review page", `says “likely runs high” on: ${rv.hedge.join(", ")}`);
      if (rv.open === 0 && !rv.nothing) FAIL("G4", "review page", "no choice is open, but the Choices tab doesn't say “Nothing left to choose”");
      if (rv.open > 0 && rv.nothing) FAIL("G4", "review page", "the Choices tab says “Nothing left to choose” with choices still open");
      if (rv.answered !== rv.recorded) FAIL("G4", "review page", `${rv.answered} answered choices shown, ${rv.recorded} recorded`);
      if (shots) await pg.screenshot({ path: path.join(shots, `review-1280.png`) });
    }
    for (const e of [...new Set(errs)]) FAIL(29, `${width}px`, `script error: ${e.slice(0, 200)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails ? `render check: ${fails} problems` : `render check: ok (4 pages × 3 versions × 390/1280 px, review page, note boxes)${warns ? `, ${warns} warnings` : ""}`);
process.exit(fails ? 1 : 0);
