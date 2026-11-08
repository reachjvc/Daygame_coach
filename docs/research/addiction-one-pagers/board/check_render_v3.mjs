// Checks the built one-pager prototype as it renders (RULEBOOK rules 24, 27, 28): every reader view at 390 and
// 1280 px, and the review page. Run by build_v3.py after it writes the page; prints "FAIL <rule> <where>: <msg>".
// Usage: node board/check_render_v3.mjs <built.html>   (SHOTS=<dir> also saves full-page screenshots)
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
            empty: (P.empty || []).filter(k => { const K = DATA.kinds.kinds.find(x => x.id === k); return K && K.pick && ["more", "outlook"].includes(K.where); }).length,
            gapl: art.querySelectorAll(".gapl").length,
            tokens: (txt.match(/\{\w+\}/g) || []).slice(0, 3),
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
        if (r.empty && !r.gapl) FAIL(14, where, `${r.empty} picked kinds have no number and the page has no gap line`);
        if (r.tokens.length) FAIL(28, where, `unfilled fact in reader text: ${r.tokens.join(" ")}`);
        if (shots && ver === "mix") await pg.screenshot({ path: path.join(shots, `${pilot}-${width}.png`), fullPage: true });
      }
    }
    // the review page, as he first opens it (no saved marks, recommendations applied)
    if (width === 1280) {
      await pg.evaluate(() => { try { localStorage.clear(); } catch (e) {} location.hash = ""; });
      await pg.reload();
      const rv = await pg.evaluate(async () => {
        const out = { asks: 0, prop: 0, tokens: [], tabs: {} };
        for (const b of [...document.querySelectorAll("#rtabs button")]) {
          b.click();
          await new Promise(r => setTimeout(r, 30));
          const t = document.querySelector("#rbody").innerText;
          out.tabs[b.dataset.rtab] = t.length;
          if (b.dataset.rtab === "choices") out.asks = document.querySelectorAll("#rbody .ritem").length;
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
