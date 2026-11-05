"""Build the one-pager template page from 06-template.json and the research refs in 01-04."""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HERE = Path(__file__).parent

research = {}
for name in ["01-sedatives-opioids.json", "02-stimulants-other-substances.json",
             "03-behaviours-screens-money.json", "04-behaviours-body-boundary.json"]:
    for it in json.loads((REPO / name).read_text()):
        research[it["id"]] = it

tpl = json.loads((REPO / "06-template.json").read_text())
MIRROR = REPO / "07-mirror-stats"
glob = {r["id"]: r for r in tpl.get("globalRefs", [])}
problems = []

for page in tpl["pages"]:
    own = {r["id"]: r for r in research[page["id"]]["refs"]}
    order, out = {}, []

    def study(r):
        """One id per study, whatever page the link goes to: PubMed id, Europe PMC id or NBER paper number."""
        if r.get("pmid"):
            return "pm" + str(r["pmid"])
        m = re.search(r"(?:/MED/|pubmed\.ncbi\.nlm\.nih\.gov/)(\d+)|/(w\d{5})", r.get("url", ""))
        return ("pm" + m.group(1) if m.group(1) else m.group(2)) if m else r.get("url") or None

    known = {study(r): k for k, r in {**glob, **own}.items() if study(r)}

    def inline(ref):
        """A ref written out in full in 07-mirror-stats: reuse the research ref for the same study, else add it."""
        k = known.get(study(ref)) or "x:" + str(study(ref) or ref["cite"])
        own.setdefault(k, {"cite": ref["cite"], "url": ref.get("url", ""), "fetched": ref.get("fetched", False), "supports": ref.get("quote", "")})
        return k

    def num(keys, where):
        nums = []
        for k in keys:
            ref = own.get(k) or glob.get(k)
            if not ref:
                problems.append(f"{page['id']} {where}: unknown ref {k}")
                continue
            sid = study(ref) or k
            if sid not in order:
                order[sid] = len(out) + 1
                out.append({"n": order[sid], "cite": ref["cite"], "url": ref.get("url", ""),
                            "fetched": ref.get("fetched", False), "supports": ref.get("supports", ""),
                            "kind": ref.get("kind", "")})
            if order[sid] not in nums:
                nums.append(order[sid])
        return nums

    for key in ["hero", "footer"]:
        if page.get(key):
            page[key]["n"] = num(page[key]["refs"], key)
    for i, m in enumerate(page["milestones"]):
        m["n"] = num(m["refs"], f"milestone {i}")
    for i, b in enumerate(page["beliefs"]):
        b["n"] = num(b["refs"], f"belief {i}")
    for i, x in enumerate(page["numbers"]):
        x["n"] = num(x["refs"], f"number {i}")
    for i, w in enumerate(page.get("windows", [])):
        w["n"] = num(w["refs"], f"window {i}")
    for i, st in enumerate(page.get("plan", [])):
        if st.get("proof"):
            st["proof"]["n"] = num(st["proof"]["refs"], f"plan step {i + 1}")
    mf = MIRROR / f"{page['id']}.json"
    if mf.exists():
        m = json.loads(mf.read_text())
        page["stats"] = m.get("stats", [])
        for i, x in enumerate(page["stats"]):
            x["n"] = num([inline(x["ref"])], f"stat {i}")
        h = m.get("hero")
        if h:
            page["hero"].update(basedOn=h["basedOn"], caveat=h.get("caveat", ""))
            page["hero"]["n"] = sorted(set(page["hero"]["n"] + num([inline(h["ref"])], "hero basis")))
    for o in out:
        if not o["url"].startswith("http"):
            # the repo's own summary of quitters' accounts: not a study, and its link only works inside the repo
            o.update(url="", story=True, cite="Quitters’ own accounts (videos and posts), summarised for this project.")
        o.pop("supports", None)
    page["sources"] = out
    page["unchecked"] = [o["n"] for o in out if not o["fetched"] and not o.get("story")]
    page.pop("numbers", None)
    for x in page.get("stats", []):
        x.pop("ref", None)
        for field in ["line", "mirror", "caveat"] + [f"basis.{k}" for k in x.get("basis", {})]:
            v = x["basis"][field[6:]] if field.startswith("basis.") else x.get(field, "")
            if re.search(r"fetched|not given|our sum|in the abstract|summary doesn.t say|study summary", str(v), re.I):
                problems.append(f"{page['id']} stat {x['big']}: research note in {field}: {v[:60]}")
    for w in page.get("windows", []):
        if w["kind"] not in ("feel", "danger", "trigger", "change"):
            problems.append(f"{page['id']} window {w['label']}: unknown kind {w['kind']}")
        if not w["s"] <= w.get("pk", w["s"]) <= w["e"]:
            problems.append(f"{page['id']} window {w['label']}: needs start <= peak <= end")
        if w["kind"] == "trigger" and (w.get("fall") or w.get("pk") is not None):
            problems.append(f"{page['id']} window {w['label']}: a trigger row shows when, never how strong")

community = REPO / "community" / "leaves-stages.json"
tpl["leaves"] = None
if community.exists():
    lv = json.loads(community.read_text())
    tpl["leaves"] = {"method": {"nWithDuration": lv["method"]["nWithDuration"]}}

emb = json.dumps(tpl, ensure_ascii=False).replace("</", "<\\/")
html = (HERE / "template-v2.html").read_text().replace("/*DATA*/", emb)
dest = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "one-pager-template.html"
dest.write_text(html)
print(f"{len(tpl['pages'])} pages, {len(html)//1024} KB -> {dest}")
for p in problems:
    print("PROBLEM:", p)
sys.exit(1 if problems else 0)
