// Checks the built one-pager prototype as it renders (RULEBOOK rules 24, 27, 28): every reader view at 390 and
// 1280 px, and the review page. Run by build_v3.py after it writes the page; prints "FAIL <rule> <where>: <msg>".
// Usage: node board/check_render_v3.mjs <built.html>   (SHOTS=<dir> also saves full-page screenshots)
/* global DATA, MINP, stageDots -- the built page's own globals, read inside pg.evaluate */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const file = process.argv[2];
if (!file) { console.error("usage: node check_render_v3.mjs <built.html>"); process.exit(2); }
const url = pathToFileURL(path.resolve(file)).href;
const shots = process.env.SHOTS || "";
let fails = 0;
const FAIL = (rule, where, msg) => { fails++; console.log(`FAIL ${rule} ${where}: ${msg}`); };

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
            values: lis.map(li => +li.value), forum: lis.filter(li => /scored 0 to 10 by an AI reader|scored for this page/.test(li.textContent)).length,
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
            // round 4: the hero shows both hope numbers when both exist; a projection chip only beside a projected line
            bothHope: ["hope-free-now", "hope-lifetime"].every(k => (P.numbers || []).some(x => x.kind === k) && DATA.kinds.kinds.find(y => y.id === k).pick),
            heroText: (art.querySelector(".sec-hero") || { innerText: "" }).innerText,
            heroBigs: ["hope-free-now", "hope-lifetime"].map(k => ((P.numbers || []).find(x => x.kind === k) || {}).big).filter(Boolean),
            felth: art.querySelectorAll(".sec-graph .felth").length,
            graphText: ((art.querySelector(".sec-graph .peaks, .sec-graph .say") || {}).innerText || ""),
            oldChip: /Projected, not counted/.test(txt),
            // round 5
            heroLine: ((art.querySelector(".sec-hero .line") || {}).innerText || "").trim(),
            graphAll: [...art.querySelectorAll(".sec-graph .peaks, .sec-graph .say")].map(e => e.innerText).join(" ").toLowerCase(),
            expectEase: (() => {
              if (!P.feltMeds) return null;
              const order = ["Day 1", "Days 2–3", "Days 4–7", "Week 2", "Weeks 3–4", "Month 2", "Month 3", "Months 4–12", "Year 2 +"].filter(l => l in P.feltMeds);
              const v = order.map(l => P.feltMeds[l]), max = Math.max(...v);
              const i = v.lastIndexOf(max);   // a later tie belongs to the hardest stretch
              for (let j = i + 1; j < v.length; j++) if (v[j] <= max - 1.5 && v.slice(j + 1).every(y => y <= max - 1)) return order[j].toLowerCase();
              return "";
            })(),
            chartLabels: [...art.querySelectorAll(".sec-graph svg text.k")].map(t => t.textContent).join(" ").toLowerCase(),
            averTwice: [...art.querySelectorAll("[data-kind]")].filter(c => /averag\w*\s+across/i.test((c.querySelector(".hl") || {}).textContent || "") && /Average across studies/.test(c.textContent)).map(c => c.querySelector(".big")?.textContent),
            chips: [...art.querySelectorAll(".tag.weak")].map(t => t.textContent.trim()),
            gapTexts: [...art.querySelectorAll(".gapl")].map(g => g.innerText.trim()),
            likedMissing: (P.numbers || []).filter(x => x.liked && DATA.kinds.kinds.find(k => k.id === x.kind)?.pick).map(x => x.big).filter(b => !txt.includes(b)),
            medDiff: (() => {
              if (!P.feltMeds) return [];
              const js = {};
              stageDots().forEach(x => { if (x.n >= MINP) js[x.label] = Math.round(x.med * 2) / 2; });
              const keys = new Set([...Object.keys(js), ...Object.keys(P.feltMeds)]);
              return [...keys].filter(k => js[k] !== P.feltMeds[k]).map(k => `${k}: page ${js[k]}, build ${P.feltMeds[k]}`);
            })(),
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
        const norm = t => t.replace(/^about\s+/i, "").toLowerCase();
        if (r.bothHope && !(/projected to get free|projected/i.test(r.heroText) && r.heroBigs.every(b => r.heroText.toLowerCase().includes(norm(b)))))
          FAIL(15, where, `the page has both hope numbers but the hero doesn't show both (${r.heroBigs.join(", ")})`);
        if (/Worked out|Projection/i.test(r.heroText) && !/projected/i.test(r.heroText)) FAIL(10, where, "a projection chip in the hero, but no projected figure on it");
        if (r.oldChip) FAIL(10, where, "the old “Projected, not counted” chip is back (D6: one chip, “Worked out, not counted”)");
        if (r.heroLine && /^(?:start with|here is|here are|below|read)\b/i.test(r.heroLine)) FAIL(6, where, `the hero line says what comes next: “${r.heroLine}”`);
        if (/no clear peak/.test(r.graphAll)) FAIL(18, where, "the graph says “No clear peak” (E4: the highest counted stage is the peak)");
        if (r.expectEase != null) {
          if (r.expectEase && !r.graphAll.includes(`easier from ${r.expectEase}`)) FAIL(18, where, `the graph should say “Easier from ${r.expectEase}” (E4)`);
          if (!r.expectEase && !r.graphAll.includes("no clear easing")) FAIL(18, where, "no stage qualifies as easier, but the graph doesn't say “No clear easing” (E4)");
          if (!r.expectEase && /the hardest|hardest/.test(r.graphAll + " " + r.chartLabels)) FAIL(18, where, "“No clear easing” with a “hardest” line or chart label (F4: one line)");
        }
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
        if (r.medDiff.length) FAIL(18, where, `graph stage medians differ from the build's: ${r.medDiff.join("; ")}`);
        if (r.felth !== 1) FAIL(18, where, `${r.felth} graph headlines (one, D9)`);
        if (/No clear peak/.test(r.graphText) && /hardest/i.test(r.graphText)) FAIL(18, where, "the graph says both “No clear peak” and a hardest stretch");
        if (shots && ver === "mix") await pg.screenshot({ path: path.join(shots, `${pilot}-${width}.png`), fullPage: true });
      }
    }
    // the review page, as he first opens it (no saved marks, recommendations applied)
    if (width === 1280) {
      await pg.evaluate(() => { try { localStorage.clear(); } catch { /* storage blocked: the page opens without it */ } location.hash = ""; });
      await pg.reload();
      const rv = await pg.evaluate(async () => {
        const out = { asks: 0, prop: 0, tokens: [], tabs: {}, offWhy: null, offList: null };
        for (const b of [...document.querySelectorAll("#rtabs button")]) {
          b.click();
          await new Promise(r => setTimeout(r, 30));
          const t = document.querySelector("#rbody").innerText;
          out.tabs[b.dataset.rtab] = t.length;
          if (b.dataset.rtab === "choices") {
            out.asks = document.querySelectorAll("#rbody .ritem").length;
            const it = document.querySelector('#rbody [data-choice-id="offreader"]');
            if (it) { out.offList = +it.querySelector("summary[data-count]")?.dataset.count; out.offWhy = (it.querySelector(".why").innerText.match(/\ball (\d+)\b/) || [])[1]; }
          }
          out.tokens.push(...(t.match(/\{\w+\}/g) || []));
        }
        for (const pl of [...document.querySelectorAll("#tabs button")]) {
          pl.click();
          await new Promise(r => setTimeout(r, 30));
          out.prop += document.querySelectorAll("#frames .tag.prop").length + (/Proposed to remove/i.test(document.querySelector("#frames").innerText) ? 1 : 0);
        }
        return out;
      });
      if (rv.asks > 7) FAIL(27, "review page", `${rv.asks} choices (7 max)`);
      if (rv.prop) FAIL(27, "review page", "cards still ask “Proposed to remove” on their own");
      if (rv.tokens.length) FAIL(28, "review page", `unfilled facts: ${[...new Set(rv.tokens)].join(" ")}`);
      if (rv.offList != null && rv.offWhy != null && +rv.offWhy !== rv.offList) FAIL(28, "review page", `the off-reader choice says ${rv.offWhy} cards, its list shows ${rv.offList}`);
      if (rv.offList != null && rv.offWhy == null) FAIL(28, "review page", "the off-reader choice doesn't state how many cards it covers");
      if (shots) await pg.screenshot({ path: path.join(shots, `review-1280.png`) });
    }
    for (const e of [...new Set(errs)]) FAIL(29, `${width}px`, `script error: ${e.slice(0, 200)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails ? `render check: ${fails} problems` : "render check: ok (4 pages × 3 versions × 390/1280 px, review page)");
process.exit(fails ? 1 : 0);
