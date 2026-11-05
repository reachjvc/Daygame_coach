"""Build the one-pager prototype (v3) from 08-v3/ and check it against RULEBOOK.md.

Usage: python3 board/build_v3.py <out.html> [beliefs-exercise-url]
Reads 08-v3/pages/<id>.json, general.json, felt/<id>.json, kinds.json, decisions.json, plus the plan
text and timeline rows of 06-template.json and the safety level in research files 01-04.
Fails (exit 1) on any rule break; each PROBLEM line names the rule.
"""
import json
import os
import re
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
    "resolved": "people who beat a {x} problem",
    "self-hooked": "people who say they feel hooked on {x}",
    "heavy": "heavy users, not checked for addiction",
    "users": "ordinary users, not addicts",
    "screened": "people whose questionnaire answers showed a likely {x} problem",
}
OFF_READER = {"heavy", "users"}
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
NOTE = r"fetched|not given|our sum|in the abstract|summary doesn.t say|study summary|HTTP \d|could not be read|only the abstract|\.md\b|Table \d"
JARGON = r"\bmedian\b|quantile|latent profile|life table|\bkPa\b|secondary analysis|odds ratio|hazard ratio|confidence interval|95% CI|\bIQR\b|\bSD\b|p ?< ?0|middle score|middle half|severity"
TOLL = r"\bdeaths?\b|\bdied\b|million|billion"
FIG = re.compile(r"\d[\d,.]*\s*(?:%|in\s+\d[\d,]*)?")

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
    b = x.get("basis") or {}
    for f in ("who", "n", "where", "when", "measured"):
        if not str(b.get(f, "")).strip():
            P(9, where, f"basis.{f} missing")
    if not x.get("caveat"):
        P(9, where, "caveat (what it does not mean) missing")
    h = x.get("headline", "")
    if wc(h) > 22:
        P(12, where, f"headline is {wc(h)} words (22 max)")
    if len(FIG.findall(h)) > 2:
        P(12, where, f"headline has {len(FIG.findall(h))} figures (2 max): {h}")
    m = x.get("mirror", "")
    if m and (wc(m) > 14 or not re.search(r"\byou", m, re.I)):
        P(8, where, f"mirror line must be 14 words or fewer in the second person: {m}")
    if k["group"] == "helps" and len(FIG.findall(h)) < 2 and not x.get("noComparison"):
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
            "searched", "later", "fillLater", "missing", "note", "alsoRef", "doRefs", "checkHistory", "check1", "unchecked"}


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
            out.append({"n": order[k], "cite": "Quitters’ own accounts (videos and posts), summarised for this project." if story else r.get("cite", ""),
                        "url": "" if story else r.get("url", ""), "fetched": bool(r.get("fetched")), "story": story})
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
    for i, st in enumerate(page.get("plan", [])):
        if st.get("proof"):
            st["proof"]["n"] = cite(st["proof"].get("ref"), f"plan {i}")
    if page.get("app"):
        page["app"]["n"] = cite({"cite": page["app"]["source"] + " (read " + page["app"]["read"] + ")", "url": page["app"]["url"], "fetched": True}, "app")
    if page.get("footer"):
        page["footer"]["n"] = rk(page["footer"].get("refs", []), "footer")
    page["sources"] = out


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
        if not 3 <= len(bs) <= 5:
            P(22, pid, f"{len(bs)} beliefs (3 to 5)")
        for i, b in enumerate(bs):
            w = f"{pid} belief {i + 1}"
            for f in ("limiting", "counterpart", "test", "proof", "severity"):
                if not b.get(f):
                    P(22, w, f"{f} missing")
            if b.get("severity") not in SEVERITY:
                P(3, w, f"severity {b.get('severity')!r} unknown")
            if b.get("kind") == "moderation" and b.get("severity") in OFF_READER:
                P(4, w, "a moderation belief answered with a source about non-addicts")
            if wc(b.get("proof")) > 40:
                P(8, w, f"proof is {wc(b['proof'])} words (40 max)")
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
            if st.get("proof"):
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
        page["footer"] = o.get("footer") if page["danger"] else None
        af = V3 / "felt" / f"{pid}-app.json"
        if af.exists():
            page["app"] = json.loads(af.read_text())
            c = page["app"].get("check") or {}
            if c.get("verdict") != "ok":
                P(16, f"{pid} app data", "not passed by a separate source checker")
        # refs a v3 page adds for its own rows (01-04 stay as they are) and a checked footer override
        extra = {r["id"]: {**r, "fetched": True} for r in page.pop("researchRefsToAdd", [])}
        if page.get("footerProposal") and page["danger"]:
            page["footer"] = {k: page["footerProposal"][k] for k in ("text", "refs")}
        page.pop("footerProposal", None)
        number_sources(page, {**{r["id"]: r for r in research[pid]["refs"]}, **extra}, kinds)
        ff = V3 / "felt" / f"{pid}.json"
        if ff.exists():
            felt = json.loads(ff.read_text())
            if not (felt.get("nUsed") and felt.get("agreement", {}).get("within1") is not None and felt.get("biases")):
                P(18, f"{pid} felt", "graph needs its post count, reader agreement and bias note")
            page["felt"] = felt
        else:
            P(18, pid, "no felt-difficulty file")
        pages.append(page)

    for page in pages:
        # the v3 graph replaces round 2's milestone list; list them on the review page so nothing drops silently (rule 25)
        nu = page.setdefault("notUsed", {})
        if isinstance(nu, dict):
            nu["milestones"] = [{"label": f"{m.get('when')}: {m.get('text')}", "why": "Round 2 milestone. The v3 graph and the body rows replace the milestone list; say in a note if one should come back."} for m in page.get("milestones", [])]
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
    print(f"{len(pages)} pages, {len(html) // 1024} KB -> {dest}")
    for p in pages:
        print(f"  {p['id']}: {len(p.get('numbers', []))} numbers, {len(p.get('beliefs', []))} beliefs, empty kinds: {', '.join(p['empty']) or 'none'}")
    for p in problems:
        print("PROBLEM:", p)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
