"""Build the one-pager prototype (v3) from 08-v3/ and check it against RULEBOOK.md.

Usage: python3 board/build_v3.py <out.html> [beliefs-exercise-url]
Reads 08-v3/pages/<id>.json, general.json, felt/<id>.json, kinds.json, decisions.json, plus the plan
text and timeline rows of 06-template.json and the safety level in research files 01-04.
Fails (exit 1) on any rule break; each PROBLEM line names the rule.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HERE = Path(__file__).parent
V3 = Path(os.environ.get("V3DIR") or REPO / "08-v3")  # V3DIR: a scratch copy, for previews of unchecked drafts
PILOTS = ["alcohol", "nicotine", "cannabis", "porn"]
SEVERITY = {
    "dependent": "people hooked on {x}",
    "disorder": "people with a {x} problem, mild cases included",
    "treatment": "people in treatment for {x}",
    "resolved": "people who say they beat a {x} problem",
    "self-hooked": "people who say they feel hooked on {x}",
    "heavy": "heavy users, not checked for addiction",
    "users": "ordinary users, not addicts",
    "screened": "people whose questionnaire answers showed a likely {x} problem",
}
OFF_READER = {"heavy", "users"}
# rule 3: the Counted label carries the words that tell its tag apart (a label can't drift from what was counted)
COUNTED_KEYS = {
    "dependent": r"hooked|dependen|addict|criteria",
    "disorder": r"\bmild\b",
    "treatment": r"treat|trial|therap|help|clinic|hospital|programme|program|detox|rehab|counsell",
    "resolved": r"\bsays?\b|\bsaid\b",
    "self-hooked": r"\bsays?\b|\bsaid\b|calling themselves|call themselves|\bfeel",
    "heavy": r"\bnot\b",
    "users": r"\bnot\b",
    "screened": r"likely .*problem",
}
# rule 3: basis.who says how much they used (his 5 Nov "10 drinks every day" against "above the guidelines")
USE_LEVEL = r"\d|daily|a day|a week|times|not reported"   # "hooked" alone says nothing about how much (r4 rules audit)
# rule 4: a moderation answer counts people who were hooked, or says plainly that it didn't check
MOD_OK = {"dependent", "resolved", "disorder", "treatment"}
# rule 4 (D1, round 4): a "just one" belief is a moderation belief whatever its kind says
MOD_WORDS = re.compile(r"just one|one quick|handle it|in control|under control|moderate|a little|only on weekends", re.I)
OTHER = {
    "alcohol": r"alcohol|drink(?:s|ing|er|ers)?|drunk|beer|wine|liquor|sober from booze",
    "nicotine": r"nicotine|cigarettes?|cigs?|tobacco|vap(?:e|es|ing|er|ers)|pouch(?:es)?|smokers?",
    "cannabis": r"weed|cannabis|marijuana|thc|pot\b|joints?",
    "porn": r"porn\w*|pornography",
    "others": r"cocaine|heroin|opioids?|gambl\w*|betting|meth(?:amphetamine)?|crystal meth|benzo(?:s|diazepines?)?|sugar",
}
# words a page may use although they name another pilot (the reader's own context, not another drug's numbers)
ALLOW = {"nicotine": {"drink"}, "cannabis": {"smokers", "smoker"}}
SUBS_V3 = {"cannabis": {"thing": "weed smoking"}, "porn": {"thing": "porn use"}, "nicotine": {"verb": "smoke or vape"}}
SCREEN = r"is this you|are you addicted|take the test|\bquiz\b|screener|do you have a problem"
CHEER = r"you'?ve got this|you got this|you can do it|proud of you|amazing|journey|\bstay strong\b"
NOTE = r"fetched|not given|our sum|in the abstract|summary doesn.t say|study summary|HTTP \d|could not be read|only the abstract|\.md\b|Table \d|we found|was found|were found|no count was|this paper|nearest number|\br\d{1,2}\)"
# rule 6 (show, don't tell): a line opens with the fact, never with a verdict on it
# a short clause before a colon that judges ("No medicine has clearly helped: …", "Cutting down, not quitting: …");
# a plain label before a colon ("Body: …", "One-to-one counselling: …") is not a verdict
VERDICT_LEADIN = re.compile(r"^(?=[^:.\d]{2,45}:\s)[^:]*\b(?:no|not|never|clearly|most|only|just|even|good|bad|better|worse|helped|helps|works?|worked|failed|safe|normal|easy|hard)\b[^:]*:\s", re.I)
VERDICT_SHORT = re.compile(r"^[A-Z]\w*(?:\s+\w+){0,2}\.\s")          # "Most slip. Of people …"
VERDICT_WORDS = re.compile(r"noticeable but manageable|complete success|good news|bad news|\bin short\b|bottom line|don.t worry|that.s normal|which is normal|clearly (?:helped|works?|worked|better)", re.I)
JARGON = r"\bmedian\b|quantile|latent profile|life table|\bkPa\b|secondary analysis|odds ratio|hazard ratio|confidence interval|95% CI|\bIQR\b|\bSD\b|p ?< ?0|middle score|middle half|severity"
TOLL = r"\bdeaths?\b|\bdied\b|million|billion"
# a figure: a number, a range ("2–7 days" is one), a share ("7 in 100" is one) or a number word ("half", "one in three")
FIG = re.compile(r"\d[\d,.]*(?:\s*[–-]\s*\d[\d,.]*)?\s*(?:%|in\s+\d[\d,]*)?")
# number words count, except a time window ("six months later" frames the figure, it isn't one) and "one-to-one"
NUMWORD = re.compile(r"(?<!no )(?<!any)(?<!-)\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred|half|a third|a quarter|dozens?)\b(?!-)(?:\s+in\s+(?:\d[\d,]*|\w+))?(?! of (?:the|them|those|these))(?!\s+(?:hours?|days?|weeks?|months?|years?)\b)", re.I)


def figs(s):
    """Rule 12: how many figures a line carries, number words included."""
    s = s or ""
    spans = [m.span() for m in FIG.finditer(s)] + [m.span() for m in NUMWORD.finditer(s)]
    spans.sort()
    out = []
    for a, b in spans:
        if out and a <= out[-1][1]:
            out[-1] = (out[-1][0], max(b, out[-1][1]))
        else:
            out.append((a, b))
    return len(out)


def verdict(s):
    s = (s or "").strip()
    m = VERDICT_LEADIN.search(s) or VERDICT_SHORT.search(s) or VERDICT_WORDS.search(s)
    return m.group(0).strip() if m else None


# rule 12b: a share of people is written "N in 100" on every reader face: big figure, headline, proofs, body rows
SHARE_BAD = re.compile(r"\d+(?:\.\d+)?%(?!\s*(?:less|more|lower|higher|fewer))|\b1 in (?!100\b)\d+\b|\b\d[\d,]* of \d[\d,]{2,}\b")


def share_fmt(t):
    m = SHARE_BAD.search(t or "")
    return m.group(0) if m else None


# rule 12c (D7): a big figure is a result, not a time stamp ("Week 1", "72 hours", "7 days", "Years 1 and 3")
TIME_BIG = re.compile(r"^(?:day|days|week|weeks|month|months|year|years)\b|^\d[\d–-]*\s*(?:hours?|days?|weeks?|months?|years?)$", re.I)
# rule 12b: in the big figure itself, only a drop or rise ("87% less") stays in %
BIG_OK_KINDS = set()   # none: since round 4 every share on a reader face is "N in 100", the hero projection too

problems = []


def P(rule, where, msg):
    problems.append(f"rule {rule} · {where}: {msg}")


def wc(s):
    return len(re.findall(r"[\w’'%.,-]+", s or ""))


def reader_text(*vals):
    return " ".join(v for v in vals if isinstance(v, str))


def check_ref(ref, where):
    if ref and ref.get("own"):
        return  # our own forum harvest: its basis is the graph's, shown on the page
    if not ref or not ref.get("url"):
        P(9, where, "no source link")
        return
    if wc(ref.get("quote", "")) > 30:
        P(16, where, f"quote is {wc(ref['quote'])} words (30 max)")
    if not ref.get("quote"):
        P(16, where, "no word-for-word quote")


def check_number(x, page, kinds, where, general=False):
    k = kinds.get(x.get("kind"))
    if not k:
        P(14, where, f"kind {x.get('kind')!r} is not in the menu")
        return
    sev = x.get("severity")
    if sev not in SEVERITY:
        P(3, where, f"severity {sev!r} unknown")
    elif sev not in k["reader"]:
        P(3, where, f"severity {sev} not allowed for kind {k['id']} (allowed: {', '.join(k['reader'])})")
    if sev in OFF_READER and not re.search(r"\bnot\b", x.get("counted", "")):
        P(3, where, f"a {sev} number whose Counted label doesn't say they weren't addicts: {x.get('counted')}")
    if sev in OFF_READER and k["group"] in ("hope", "who", "helps"):
        P(3, where, f"a {sev} number in the {k['group']} group")
    if sev in COUNTED_KEYS and not re.search(COUNTED_KEYS[sev], x.get("counted", ""), re.I):
        P(3, where, f"Counted label doesn't match its tag {sev}: {x.get('counted')!r}")
    if not re.search(USE_LEVEL, str((x.get("basis") or {}).get("who", "")), re.I):
        P(3, where, f"basis.who doesn't say how much they used (or 'not reported'): {(x.get('basis') or {}).get('who')!r}")
    if x.get("kind") == "helps-stop-vs-cut" and sev not in MOD_OK and "not checked" not in reader_text(x.get("headline"), x.get("counted"), x.get("caveat")):
        P(4, where, f"a stop-or-cut-down number on {sev} people that doesn't say 'not checked for addiction'")
    big = str(x.get("big", ""))
    if x.get("kind") not in BIG_OK_KINDS and (re.search(r"^\D*\d[\d,]*\s+of\s+\d", big) or (re.search(r"%", big) and not re.search(r"%\s*(?:less|more|lower|higher|fewer)", big))):
        P("12b", where, f"a share written as % or 'N of M' in the big figure (write 'N in 100'): {big}")
    if share_fmt(x.get("headline")):
        P("12b", where, f"a share not written 'N in 100' in the headline: {share_fmt(x.get('headline'))!r}")
    if TIME_BIG.search(big) and not x.get("timeIsResult"):
        P("12c", where, f"the big figure is a time, not a result: {big!r} (make the result big, or set timeIsResult when the time is the finding)")
    if verdict(x.get("headline")):
        P(6, where, f"headline opens with a verdict: {verdict(x.get('headline'))!r}")
    b = x.get("basis") or {}
    for f in ("who", "n", "where", "when", "measured"):
        if not str(b.get(f, "")).strip():
            P(9, where, f"basis.{f} missing")
    if not x.get("caveat"):
        P(9, where, "caveat (what it does not mean) missing")
    h = x.get("headline", "")
    if wc(h) > 22:
        P(12, where, f"headline is {wc(h)} words (22 max)")
    if figs(h) > 2:
        P(12, where, f"headline has {figs(h)} figures (2 max): {h}")
    m = x.get("mirror", "")
    if m and (wc(m) > 14 or not re.search(r"\byou", m, re.I)):
        P(8, where, f"mirror line must be 14 words or fewer in the second person: {m}")
    if k["group"] == "helps" and figs(h) < 2 and not x.get("noComparison"):
        P("12a", where, f"a what-helps number without a with-and-without pair: {h[:70]}")
    if k["group"] == "helps" and re.search(r"×|\b\d+(?:\.\d+)?\s?times\b|\b1 in \d", x.get("big", "") + " " + h):
        P("12a", where, f"a what-helps number as a ratio or '1 in N': {x.get('big')}")
    if x.get("projection") and not re.search(r"project|expect", h, re.I):
        P(10, where, "a projection whose headline does not say 'projected' or 'expected'")
    if re.search(TOLL, h + " " + x.get("big", ""), re.I):
        P(11, where, "death toll or population total")
    c = x.get("check") or {}
    if not (c.get("by") and c.get("on") and c.get("verdict") == "ok"):
        P(16, where, "not passed by a separate source checker")
    check_ref(x.get("ref"), where)
    for r in [r for f in ("alsoRef", "refs2") for r in ([x[f]] if isinstance(x.get(f), dict) else x.get(f) or [])]:
        check_ref(r, where + " (second source)")
    txt = reader_text(x.get("big"), h, m, x.get("counted"), x.get("caveat"), x.get("weak"), *b.values())
    lint(txt, page, where, general)


def lint(txt, page, where, general=False):
    if re.search(SCREEN, txt, re.I):
        P(1, where, "screening words: " + re.search(SCREEN, txt, re.I).group(0))
    if re.search(CHEER, txt, re.I) or "!" in txt:
        P(7, where, "cheering or an exclamation mark")
    if re.search(NOTE, txt, re.I):
        P(9, where, "research note in reader text: " + re.search(NOTE, txt, re.I).group(0))
    if re.search(JARGON, txt, re.I):
        P(8, where, "research jargon in reader text: " + re.search(JARGON, txt, re.I).group(0))
    if page and not general:
        for other, rx in OTHER.items():
            if other == page:
                continue
            for mm in re.finditer(r"\b(?:" + rx + r")\b", txt, re.I):
                if mm.group(0).lower() not in ALLOW.get(page, set()):
                    P(13, where, f"names another addiction: {mm.group(0)!r}")
                    break


INTERNAL = {"origin", "changeNote", "revisionNote", "editNote", "was", "rejectedBy", "check", "fixedFields", "replacement",
            "searched", "later", "fillLater", "missing", "note", "doRefs", "checkHistory", "check1", "unchecked"}


def sanitize(obj):
    """The page shows only reader fields and the review notes; the audit trail stays in 08-v3/ (it is public there)."""
    if isinstance(obj, dict):
        for k in list(obj):
            if k in INTERNAL:
                obj.pop(k)
            else:
                sanitize(obj[k])
    elif isinstance(obj, list):
        for x in obj:
            sanitize(x)


def number_sources(page, own, kinds):
    """One numbered source list per page, one entry per study, in the order version 1 shows them."""
    order, out = {}, []

    def key(r):
        if r.get("pmid"):
            return "pm" + str(r["pmid"])
        m = re.search(r"(?:/MED/|pubmed\.ncbi\.nlm\.nih\.gov/|/PMC)(\d+)", r.get("url", ""))
        return m.group(0) if m else (r.get("url") or r.get("cite"))

    def cite(r, where):
        if not r:
            return []
        k = key(r)
        if k not in order:
            order[k] = len(out) + 1
            story = not str(r.get("url", "")).startswith("http") and not r.get("own")
            out.append({"n": order[k], "cite": "Quitters’ own accounts (videos and posts), summarised for this project." if story else r.get("shortCite") or r.get("cite", ""),
                        "url": "" if story else r.get("url", ""), "fetched": bool(r.get("fetched")), "story": story,
                        "own": bool(r.get("own"))})  # own: our forum harvest; the page lists it once, with the graph
        return [order[k]]

    def rk(keys, where):
        ns = []
        for k in keys:
            if k not in own:
                P(9, f"{page['id']} {where}", f"unknown research ref {k}")
                continue
            ns += [n for n in cite(own[k], where) if n not in ns]
        return ns

    where = {k: kinds[k]["where"] for k in kinds}
    nums = page.get("numbers", [])
    for sec in ("hero", "hero-second"):
        for x in nums:
            if where.get(x["kind"]) == sec:
                x["n"] = cite(x.get("ref"), x["kind"])
    for i, b in enumerate(page.get("beliefs", [])):
        b["n"] = sorted({n for r in b.get("refs", []) for n in cite(r, f"belief {i}")})
    for w in page.get("windows", []):
        w["n"] = rk(w.get("refs", []), "window")
    # milestones are not shown on the v3 pages, so their sources are not listed
    for sec in ("more", "outlook"):
        for x in nums:
            if where.get(x["kind"]) == sec or (sec == "more" and where.get(x["kind"]) not in ("hero", "hero-second", "outlook")):
                if "n" not in x:
                    x["n"] = cite(x.get("ref"), x["kind"])
    # a card's second source (alsoRef) is cited in its fold, so a line that rests on it shows its number (D10)
    for x in nums:
        more = [r for f in ("alsoRef", "refs2") for r in ([x[f]] if isinstance(x.get(f), dict) else x.get(f) or [])]
        x["alsoN"] = sorted({n for r in more for n in cite(r, x["kind"])})
    for i, st in enumerate(page.get("plan", [])):
        if st.get("proof"):
            st["proof"]["n"] = cite(st["proof"].get("ref"), f"plan {i}")
            if st["proof"].get("alt"):
                st["proof"]["alt"]["n"] = cite(st["proof"]["alt"].get("ref"), f"plan {i} stand-in")
    if page.get("app"):
        page["app"]["n"] = cite({"cite": page["app"]["source"] + " (read " + page["app"]["read"] + ")", "url": page["app"]["url"], "fetched": True}, "app")
    if page.get("footer"):
        page["footer"]["n"] = rk(page["footer"].get("refs", []), "footer")
    page["sources"] = out


# the nine stages the graph draws (the same as STAGES in one-pager-v3.html) and the post count under which a stage is drawn hollow
STAGES = [("Day 1", [0]), ("Days 2–3", [1, 2]), ("Days 4–7", [3, 4]), ("Week 2", [5, 6]), ("Weeks 3–4", [7, 8]),
          ("Month 2", [9, 10]), ("Month 3", [11]), ("Months 4–12", [12, 13]), ("Year 2 +", [14])]
MIN_POSTS = 25


def stage_meds(felt):
    """The typical day per stage, exactly as one-pager-v3.html stageDots() computes it, rounded to 0.5 (fmt1)."""
    out = {}
    for label, idx in STAGES:
        hist = [0] * 11
        for i in idx:
            for k, c in enumerate(felt["bins"][i].get("hist") or []):
                hist[k] += c
        vals = [k for k, c in enumerate(hist) for _ in range(c)]
        n = len(vals)
        if n < MIN_POSTS:
            continue
        q = (n - 1) * .5
        f = int(q)
        c = min(n - 1, f + 1)
        out[label] = round((vals[f] + (vals[c] - vals[f]) * (q - f)) * 2) / 2
    return out


def rng(vals, fmt=lambda v: f"{v:,}", sep=" to "):
    vals = sorted(set(vals))
    return fmt(vals[0]) if len(vals) == 1 else f"{fmt(vals[0])}{sep}{fmt(vals[-1])}"


def review_facts(pages, kinds_doc):
    """Rule 28: every figure the review page states about the pages is computed from them, so it can't drift."""
    kinds = kinds_doc["kinds"]
    felt = [p for p in pages if p.get("felt")]
    few = {}
    for p in felt:
        for label, idx in STAGES:
            n = sum(sum(p["felt"]["bins"][i].get("hist") or []) for i in idx)
            if n < MIN_POSTS:
                few.setdefault(label, []).append(p["tab"].lower())
    hero = lambda p, k: next((x for x in p.get("numbers", []) if x["kind"] == k), None)
    app = [p for p in pages if p.get("app")]
    day = lambda d: next((x["n"] for x in app[0]["app"]["days"] if x["day"] == d), None) if app else None
    acts = [len(st.get("do", [])) for p in pages for st in p.get("plan", [])]
    picked = {k["id"] for k in kinds if k["pick"]}
    off = sum(1 for p in pages for x in p.get("numbers", []) if (x.get("severity") in OFF_READER or x.get("propose")) and x["kind"] in picked)
    return {
        "nKinds": str(len(kinds)), "nGroups": str(len(kinds_doc["groups"])),
        "nPicked": str(sum(1 for k in kinds if k["scope"] == "specific" and k["pick"])),
        "nGeneral": str(sum(1 for k in kinds if k["scope"] == "general")),
        "feltRead": rng([p["felt"]["nSampled"] for p in felt]),
        "feltUsed": rng([p["felt"]["nUsed"] for p in felt]),
        "agreeCross": rng([round(100 * p["felt"]["agreementCross"]["within1"]) for p in felt if p["felt"].get("agreementCross")], lambda v: f"{v}%"),
        "fewStages": "; ".join(f"{k} on {' and '.join(v)}" for k, v in few.items()) or "none",
        "appPages": ", ".join(p["tab"].lower() for p in app) or "none",
        "app1": f"{day(1):,}" if day(1) else "?", "app30": f"{day(30):,}" if day(30) else "?",
        "heroProj": ", ".join(f"{x['big']} ({p['tab'].lower()})" for p in pages if (x := hero(p, "hope-lifetime"))) or "none",
        "heroCount": ", ".join(f"{p['tab'].lower()} {x['big'][:1].lower() + x['big'][1:]}" for p in pages if (x := hero(p, "hope-free-now"))) or "none",
        "noHero": " and ".join(p["tab"].lower() for p in pages if not hero(p, "hope-free-now") and not hero(p, "hope-lifetime")) or "no page",
        "planActions": rng(acts) if acts else "?",
        "dangerPages": " and ".join(p["tab"].lower() for p in pages if p["danger"]) or "no page",
        "noteLine": " ".join(f"On the {p['tab'].lower()} page: one small “Before you stop” line above the sources: “{p['footer']['text']}”" for p in pages if p.get("footerLevel") == "note"),
        "offCards": str(off),
    }


def fill_review(obj, facts, where="decisions"):
    if isinstance(obj, str):
        for t in re.findall(r"\{(\w+)\}", obj):
            if t not in facts:
                P(28, where, f"unknown fact {{{t}}} in review text")
        return re.sub(r"\{(\w+)\}", lambda m: facts.get(m.group(1), m.group(0)), obj)
    if isinstance(obj, list):
        return [fill_review(x, facts, where) for x in obj]
    if isinstance(obj, dict):
        return {k: fill_review(v, facts, f"{where}.{obj.get('id', k)}") for k, v in obj.items()}
    return obj


def check_asserts(decisions, pages, kinds):
    """Rule 28: a review sentence about specific pages carries an 'assert' the build re-checks against those pages."""
    byid = {p["id"]: p for p in pages}
    for sec in ("decisions", "choices", "weak"):
        for d in decisions.get(sec, []):
            a = d.pop("assert", None) or {}
            w = f"review {sec} {d.get('id') or d.get('title', '')[:40]!r}"
            for pid, ks in (a.get("noKinds") or {}).items():
                for x in byid[pid].get("numbers", []):
                    if x["kind"] in ks and kinds[x["kind"]]["pick"]:
                        P(28, w, f"says {pid} has no {x['kind']} number, but it has {x.get('big')!r}")
            for pid in a.get("allWeak") or []:
                for x in byid[pid].get("numbers", []):
                    if not x.get("weak"):
                        P(28, w, f"says every {pid} card carries a Weak label, but {x.get('big')!r} has none")
            if "dangerPages" in a and sorted(a["dangerPages"]) != sorted(p["id"] for p in pages if p["danger"]):
                P(28, w, f"names danger pages {a['dangerPages']}, the pages say {[p['id'] for p in pages if p['danger']]}")
            if "maxChoices" in a and len(decisions.get("choices", [])) > a["maxChoices"]:
                P(27, w, f"{len(decisions['choices'])} choices ({a['maxChoices']} max)")
            if "rec" in a:
                for cid, rec in a["rec"].items():
                    c = next((c for c in decisions.get("choices", []) if c["id"] == cid), None)
                    if not c or c.get("rec") != rec:
                        P(28, w, f"assumes choice {cid} recommends {rec!r}")


def main():
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "one-pager-v3.html"
    exercise_url = sys.argv[2] if len(sys.argv) > 2 else ""
    kinds_doc = json.loads((V3 / "kinds.json").read_text())
    kinds = {k["id"]: k for k in kinds_doc["kinds"]}
    tpl = json.loads((REPO / "06-template.json").read_text())
    old = {p["id"]: p for p in tpl["pages"]}
    research = {}
    for name in ["01-sedatives-opioids.json", "02-stimulants-other-substances.json",
                 "03-behaviours-screens-money.json", "04-behaviours-body-boundary.json"]:
        for it in json.loads((REPO / name).read_text()):
            research[it["id"]] = it
    decisions = json.loads((V3 / "decisions.json").read_text())
    general = json.loads((V3 / "general.json").read_text())
    for i, x in enumerate(general["numbers"]):
        if kinds.get(x.get("kind"), {}).get("scope") != "general":
            P(14, f"general #{i}", "a general number needs a general kind")
        check_number(x, None, kinds, f"general {x.get('big')}", general=True)

    pages = []
    felt_meds = {}
    for pid in PILOTS:
        ffp = V3 / "felt" / f"{pid}.json"
        if ffp.exists():
            felt_meds[pid] = set(stage_meds(json.loads(ffp.read_text())).values())
    for pid in PILOTS:
        page = json.loads((V3 / "pages" / f"{pid}.json").read_text())
        o = old[pid]
        # filled-in words for his plan text that read better than round 2's (his sentences stay word for word)
        page.update(tab=o["tab"], title=o["title"], subs={**o["subs"], **SUBS_V3.get(pid, {})})
        safety = research[pid].get("safety", {})
        page["danger"] = safety.get("level") == "danger"
        nums = page.get("numbers", [])
        for i, x in enumerate(nums):
            check_number(x, pid, kinds, f"{pid} {x.get('kind')} {x.get('big')}")
        have = {x["kind"] for x in nums}
        page["empty"] = [k["id"] for k in kinds_doc["kinds"] if k["scope"] == "specific" and k["pick"] and k["id"] not in have]
        for kid in page["empty"]:
            if not any(g.get("kind") == kid for g in page.get("gaps", [])):
                P(14, pid, f"picked kind {kid} is empty and has no gap note")
        bs = page.get("beliefs", [])
        page.setdefault("heroLine", None)
        if not any(kinds.get(x["kind"], {}).get("where") in ("hero", "hero-second") and kinds[x["kind"]]["pick"] for x in nums):
            g = next((g for g in page.get("gaps", []) if g.get("kind") == "hope-free-now" and g.get("reader")), None)
            gr = page.get("gapReaderLine")
            if not (g or (isinstance(gr, dict) and gr.get("text")) or isinstance(gr, str)):
                P(15, pid, "no hope number, and 'Who gets free, and how' has no plain line saying so (gapReaderLine)")
        if page["heroLine"]:
            lint(page["heroLine"], pid, f"{pid} hero line")
            if figs(page["heroLine"]):
                P(15, pid, f"the hero line has a figure but is not a checked number: {page['heroLine']}")
        gr = page.get("gapReaderLine")
        if gr:
            lint(gr if isinstance(gr, str) else gr.get("text", ""), pid, f"{pid} gap reader line")
        if page.get("feltHeadlineProposal"):
            P(18, pid, "feltHeadlineProposal is no longer used: the template computes the graph headline (D9); drop it")
        for g in page.get("gaps", []):
            if g.get("reader"):
                lint(g["reader"], pid, f"{pid} gap line {g.get('kind')}")
        if not 3 <= len(bs) <= 5:
            P(22, pid, f"{len(bs)} beliefs (3 to 5)")
        for i, b in enumerate(bs):
            w = f"{pid} belief {i + 1}"
            for f in ("limiting", "counterpart", "test", "proof", "severity"):
                if not b.get(f):
                    P(22, w, f"{f} missing")
            if b.get("severity") not in SEVERITY:
                P(3, w, f"severity {b.get('severity')!r} unknown")
            # rule 4 (D1): a moderation belief is answered by a source that counted hooked people, or by one that
            # didn't, and then its Counted line says plainly "not checked for addiction"
            is_mod = b.get("kind") == "moderation" or MOD_WORDS.search(b.get("limiting") or "")
            if is_mod and b.get("kind") != "moderation":
                P(4, w, f"a 'just one' belief filed as kind {b.get('kind')!r}; it is a moderation belief")
            if is_mod and b.get("severity") not in MOD_OK and "not checked" not in (b.get("counted") or ""):
                P(4, w, f"a moderation belief answered with {b.get('severity')} people whose Counted line doesn't say 'not checked for addiction'")
            if is_mod and re.search(r"not checked", b.get("proof") or "", re.I):
                P(4, w, "'not checked for addiction' belongs on the Counted line, not in the proof sentence")
            if wc(b.get("proof")) > 40:
                P(8, w, f"proof is {wc(b['proof'])} words (40 max)")
            if not b.get("ownWords") and share_fmt(b.get("proof")):
                P("12b", w, f"a share not written 'N in 100' in the proof: {share_fmt(b.get('proof'))!r}")
            if figs(b.get("proof")) > 2 and not b.get("ownWords"):   # rule 26: his own v10 sentence stays word for word
                P(12, w, f"proof has {figs(b.get('proof'))} figures (2 max): {b.get('proof')}")
            if verdict(b.get("proof")):
                P(6, w, f"proof opens with a verdict: {verdict(b.get('proof'))!r}")
            c = b.get("check") or {}
            if not (c.get("by") and c.get("verdict") == "ok"):
                P(16, w, "proof not passed by a separate source checker")
            for r in b.get("refs", []):
                check_ref(r, w)
            lint(reader_text(b.get("limiting"), b.get("counterpart"), b.get("test"), b.get("proof")), pid, w)
        plan = page.get("plan", [])
        if len(plan) != 5:
            P(21, pid, f"plan has {len(plan)} steps (5)")
        for i, st in enumerate(plan):
            if len(st.get("do", [])) < 3:
                P(21, f"{pid} plan step {i + 1}", f"{len(st.get('do', []))} actions (3 or more)")
            lint(reader_text(*st.get("do", [])), None, f"{pid} plan step {i + 1}")
            for d in st.get("do", []):
                if VERDICT_WORDS.search(d):
                    P(6, f"{pid} plan step {i + 1}", f"an action that is a verdict, not a thing to do: {VERDICT_WORDS.search(d).group(0)!r} in {d[:60]!r}")
            if st.get("proof"):
                pt = st["proof"].get("text", "")
                if share_fmt(pt) and not st["proof"].get("ownWords"):
                    P("12b", f"{pid} plan step {i + 1} proof", f"a share not written 'N in 100': {share_fmt(pt)!r}")
                for m in re.finditer(r"(\d+(?:\.\d)?)(?:\s+to\s+(\d+(?:\.\d)?))? out of 10", pt):
                    for v in filter(None, m.groups()):
                        if felt_meds.get(pid) and float(v) not in felt_meds[pid]:
                            P(18, f"{pid} plan step {i + 1} proof", f"says {v} out of 10; the graph shows typical days of {sorted(felt_meds[pid])} (use the graph's figure, D9)")
                if figs(pt) > 2 and not st["proof"].get("ownWords"):
                    P(12, f"{pid} plan step {i + 1} proof", f"{figs(pt)} figures (2 max): {pt}")
                if verdict(pt):
                    P(6, f"{pid} plan step {i + 1} proof", f"opens with a verdict: {verdict(pt)!r}")
                alt = st["proof"].get("alt")
                if alt:
                    check_ref(alt.get("ref"), f"{pid} plan step {i + 1} stand-in proof")
                    lint(alt.get("text", ""), pid, f"{pid} plan step {i + 1} stand-in proof")
                    if alt.get("severity") in OFF_READER:
                        P(3, f"{pid} plan step {i + 1} stand-in proof", "the stand-in for an off-reader proof is off-reader too")
                ps = st["proof"].get("severity")
                if ps is not None and ps not in SEVERITY:
                    P(3, f"{pid} plan step {i + 1} proof", f"severity {ps!r} unknown")
                check_ref(st["proof"].get("ref"), f"{pid} plan step {i + 1} proof")
                if re.search(r"×|\b\d+(?:\.\d+)?\s?times\b|\b1 in \d|for every \d+", st["proof"].get("text", "")):
                    P("12a", f"{pid} plan step {i + 1} proof", "a what-helps figure as a ratio or '1 in N'")
                lint(st["proof"].get("text", ""), pid, f"{pid} plan step {i + 1} proof")
        page["windows"] = page.get("windows") or o.get("windows", [])  # v3 may relabel rows (rule 19); 06 stays as it is
        page["milestones"] = o.get("milestones", [])
        for w in page["windows"]:
            if w["kind"] == "trigger" and (w.get("fall") or w.get("pk") is not None):
                P(19, f"{pid} window {w['label']}", "a trigger row shows when, never how strong")
            if w["kind"] == "danger" and not page["danger"]:
                P(5, f"{pid} window {w['label']}", "danger row on a page with no sourced danger")
            for f in ("label", "when"):
                if share_fmt(w.get(f)):
                    P("12b", f"{pid} body row {w['label'][:30]!r}", f"a share not written 'N in 100': {share_fmt(w.get(f))!r}")
                if figs(w.get(f)) > 2:
                    P(12, f"{pid} body row {w['label'][:30]!r}", f"{f} has {figs(w.get(f))} figures (2 max): {w.get(f)}")
                if verdict(w.get(f)):
                    P(6, f"{pid} body row {w['label'][:30]!r}", f"{f} opens with a verdict: {verdict(w.get(f))!r}")
            if not (isinstance(w.get("s"), (int, float)) and isinstance(w.get("e"), (int, float)) and 0 < w["s"] <= w["e"]):
                P(18, f"{pid} body row {w['label'][:30]!r}", "needs a start and end in hours (s <= e) to be drawn as a bar")
            elif w.get("pk") is not None and not w["s"] <= w["pk"] <= w["e"]:
                P(18, f"{pid} body row {w['label'][:30]!r}", "peak outside its start and end")
            lint(reader_text(w.get("label"), w.get("when"), w.get("note")), pid, f"{pid} body row")
        # the 06 line under the body rows ("Many people get less than this.") stays unless the v3 page replaces it (rule 25)
        page["timelineNote"] = page.get("timelineNote", o.get("timelineNote")) if page["windows"] else None
        if page["timelineNote"]:
            lint(page["timelineNote"], pid, f"{pid} body note")
        page["footer"] = o.get("footer") if page["danger"] else None
        page["footerLevel"] = "danger" if page["footer"] else None
        af = V3 / "felt" / f"{pid}-app.json"
        if af.exists():
            page["app"] = json.loads(af.read_text())
            c = page["app"].get("check") or {}
            if c.get("verdict") != "ok":
                P(16, f"{pid} app data", "not passed by a separate source checker")
        # refs a v3 page adds for its own rows (01-04 stay as they are) and a checked footer override
        extra = {r["id"]: {**r, "fetched": True} for r in page.pop("researchRefsToAdd", [])}
        # a footer line needs a source that ties the risk to this drug or to quitting it (rule 5): on a danger page it
        # replaces 06's, elsewhere it is a single small note (nicotine: clozapine and olanzapine), never up front
        fp = page.pop("footerProposal", None)
        if fp:
            if not fp.get("refs"):
                P(5, f"{pid} footer", "a footer line without a source")
            if not page["danger"] and wc(fp.get("text")) > 40:   # a note stays small; a danger footer names every sign
                P(8, f"{pid} footer", f"footer line is {wc(fp.get('text'))} words (40 max)")
            lint(fp.get("text", ""), pid, f"{pid} footer")
            page["footer"] = {k: fp[k] for k in ("text", "refs")}
            page["footerLevel"] = "danger" if page["danger"] else "note"
        number_sources(page, {**{r["id"]: r for r in research[pid]["refs"]}, **extra}, kinds)
        ff = V3 / "felt" / f"{pid}.json"
        if ff.exists():
            felt = json.loads(ff.read_text())
            if not (felt.get("nUsed") and felt.get("agreement", {}).get("within1") is not None and felt.get("biases")):
                P(18, f"{pid} felt", "graph needs its post count, reader agreement and bias note")
            page["felt"] = felt
            page["feltMeds"] = stage_meds(felt)   # the render check compares the page's own stage medians with these
        else:
            P(18, pid, "no felt-difficulty file")
        pages.append(page)

    if len(decisions.get("choices", [])) > 7:
        P(27, "review", f"{len(decisions['choices'])} choices (7 max)")
    check_asserts(decisions, pages, kinds)
    decisions = fill_review(decisions, review_facts(pages, kinds_doc))
    for page in pages:
        # the v3 graph replaces round 2's milestone list; list them on the review page so nothing drops silently (rule 25)
        nu = page.setdefault("notUsed", {})
        if isinstance(nu, dict):
            nu["milestones"] = nu.get("milestones") or [{"label": f"{m.get('when')}: {m.get('text')}", "why": "Round 2 milestone. The v3 graph and the body rows replace the milestone list; say in a note if one should come back."} for m in page.get("milestones", [])]
        page.pop("milestones", None)
        sanitize(page)
    sanitize(general)
    data = {"kinds": kinds_doc, "general": general, "plan": {"titles": tpl["planTitles"], "text": tpl["plan"]},
            "pages": pages, "decisions": decisions, "severity": SEVERITY, "exerciseUrl": exercise_url}
    emb = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = (HERE / "one-pager-v3.html").read_text().replace("/*DATA*/", emb)
    # rule 6: no sentence under a heading that tells the reader what comes next
    if re.search(r"</h2>\s*<p", html):
        P(6, "template", "a paragraph straight after a section heading")
    dest.write_text(html)
    # the beliefs exercise page (one click from every one-pager) carries each page's beliefs as suggestions
    ex = {"pages": [{"id": p["id"], "tab": p["tab"], "danger": p["danger"],
                     "beliefs": [{k: b.get(k) for k in ("limiting", "counterpart", "test", "proof", "keep")} for b in p.get("beliefs", [])]}
                    for p in pages]}
    ex_html = (HERE / "beliefs-exercise.html").read_text().replace("/*DATA*/", json.dumps(ex, ensure_ascii=False).replace("</", "<\\/"))
    ex_dest = dest.with_name(dest.stem + "-exercise.html")
    ex_dest.write_text(ex_html)
    files = [str(p) for p in sorted(V3.rglob("*")) if p.is_file()] + [str(REPO / "RULEBOOK.md"), str(REPO / "README.md"), str(dest), str(ex_dest)] \
        + [str(p) for p in sorted(HERE.glob("*")) if p.suffix in (".py", ".html") and p.name not in ("template.html", "template-v2.html")]
    priv = subprocess.run([sys.executable, str(HERE / "check_privacy.py"), *files], capture_output=True, text=True)
    print(priv.stdout.strip())
    if priv.returncode:
        P(30, "privacy", "forum text found (see above)")
    # the rendered pages themselves (rules 24, 27, 28): every reader view at 390 and 1280 px, and the review page
    rc = HERE / "check_render_v3.mjs"
    if rc.exists() and shutil.which("node") and not os.environ.get("NO_RENDER_CHECK"):
        r = subprocess.run(["node", str(rc), str(dest)], capture_output=True, text=True, timeout=900, cwd=str(REPO.parent.parent.parent))
        for line in r.stdout.splitlines():
            m = re.match(r"FAIL (\S+) (.*?): (.*)", line)
            if m:
                P(m.group(1), "rendered " + m.group(2), m.group(3))
            else:
                print(line)
        if r.returncode and "FAIL" not in r.stdout:
            P(29, "render check", (r.stderr or "did not run").strip().splitlines()[-1][:300])
    else:
        print("render check skipped (no node, or NO_RENDER_CHECK set)")
    print(f"{len(pages)} pages, {len(html) // 1024} KB -> {dest}")
    for p in pages:
        print(f"  {p['id']}: {len(p.get('numbers', []))} numbers, {len(p.get('beliefs', []))} beliefs, empty kinds: {', '.join(p['empty']) or 'none'}")
    for p in problems:
        print("PROBLEM:", p)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
