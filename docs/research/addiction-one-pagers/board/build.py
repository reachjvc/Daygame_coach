"""Merge the research JSON files and the board copy into the board page."""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HERE = Path(__file__).parent

items, problems = [], []
for name in ["01-sedatives-opioids.json", "02-stimulants-other-substances.json",
             "03-behaviours-screens-money.json", "04-behaviours-body-boundary.json"]:
    p = REPO / name
    if not p.exists():
        problems.append(f"missing {name}")
        continue
    for it in json.loads(p.read_text()):
        it["batch"] = name[:2]
        items.append(it)

findings, frefs = [], []
p5 = REPO / "05-cross-addiction-and-framework.json"
if p5.exists():
    f5 = json.loads(p5.read_text())
    findings = f5.get("frameworkFindings", [])
    frefs = f5.get("refs", [])
    cross = f5.get("crossAddiction")
    if cross:
        cross["group"] = "boundary"
        cross["batch"] = "05"
        items.append(cross)
else:
    problems.append("missing 05")

board = json.loads((HERE / "board.json").read_text())
aliases = board.get("aliases", {})
# Phases that are not felt symptoms (lab cue tests, relapse rates) stay in the data but are not drawn as curves.
skip = {(x["id"], x["label"]): x["why"] for x in board.get("notCharted", [])}
for it in items:
    keep, out = [], []
    for ph in it.get("timeline", []) or []:
        why = skip.pop((it["id"], ph.get("label")), None)
        (out.append({**ph, "why": why}) if why else keep.append(ph))
    if out:
        it["timeline"], it["notCharted"] = keep, out
for (iid, label) in skip:
    problems.append(f"notCharted: no phase {iid} / {label}")
for it in items:
    it["aliases"] = aliases.get(it["id"], [])
    it["fullName"] = it["name"]
    it["name"] = board.get("names", {}).get(it["id"], it["name"])
    it["slug"] = board.get("slugs", {}).get(it["id"], it["id"])
    fv = it.get("frameworkVerdict")
    if isinstance(fv, str):
        it["frameworkVerdict"] = {"verdict": fv, "reason": it.get("frameworkVerdictReason", "")}
    ids = {r["id"] for r in it.get("refs", [])}
    used = set(it.get("oneLinerRefs", []))
    for key in ["timeline", "markers", "beliefs", "whatWorks", "numbers"]:
        for x in it.get(key, []) or []:
            used.update(x.get("refs", []))
    for key in ["safety", "screener"]:
        if isinstance(it.get(key), dict):
            used.update(it[key].get("refs", []))
    fids = {r["id"] for r in frefs}
    missing = used - ids - fids
    if missing:
        problems.append(f"{it['id']}: refs used but not listed {sorted(missing)}")

seen = set()
for it in items:
    if it["id"] in seen:
        problems.append(f"duplicate id {it['id']}")
    seen.add(it["id"])

data = {"items": items, "findings": findings, "frefs": frefs}
emb = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<\\/")
html = (HERE / "template.html").read_text()
html = html.replace("/*DATA*/", emb(data)).replace("/*BOARD*/", emb(board))
(Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "addiction-one-pager-lab.html").write_text(html)
print(f"{len(items)} items, {len(findings)} findings, {len(html)//1024} KB")
for pr in problems:
    print("PROBLEM:", pr)
