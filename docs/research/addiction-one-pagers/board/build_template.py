"""Build the one-pager template page from 06-template.json and the research refs in 01-04."""
import json
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
glob = {r["id"]: r for r in tpl.get("globalRefs", [])}
problems = []

for page in tpl["pages"]:
    own = {r["id"]: r for r in research[page["id"]]["refs"]}
    order, out = {}, []

    def num(keys, where):
        nums = []
        for k in keys:
            ref = own.get(k) or glob.get(k)
            if not ref:
                problems.append(f"{page['id']} {where}: unknown ref {k}")
                continue
            if k not in order:
                order[k] = len(out) + 1
                out.append({"n": order[k], "cite": ref["cite"], "url": ref.get("url", ""),
                            "fetched": ref.get("fetched", False), "supports": ref.get("supports", ""),
                            "kind": ref.get("kind", "")})
            nums.append(order[k])
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
    page["sources"] = out
    page["unchecked"] = [o["n"] for o in out if not o["fetched"]]

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
