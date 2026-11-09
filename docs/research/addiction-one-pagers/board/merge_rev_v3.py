"""Merge a revision round (08-v3/drafts/<id>-rev.json) and its checkers' verdicts into 08-v3/pages/<id>.json.

Usage: python3 board/merge_rev_v3.py [--round rev2] <id> [<id> ...]
Only items the reviser marked "changed" needed a new check; a changed item passes when a checker who did not
write it says ok, or gives corrections that are applied word for word. A rejected item moves to "rejected".
A changed item no checker looked at keeps no passing check, so the build refuses it (rule 16).
"""
import copy
import json
import re
import sys
from pathlib import Path

from finalize_v3 import setpath

V3 = Path(__file__).resolve().parent.parent / "08-v3"
D = V3 / "drafts"
TODAY = "2026-11-09"


def main(ids, rnd="rev"):
    for pid in ids:
        rev = json.loads((D / f"{pid}-{rnd}.json").read_text())
        verdicts, page_fixes = {}, []
        rank = {"ok": 0, "fix": 1, "reject": 2}
        for part in "ab":
            f = D / f"{pid}-{rnd}-check-{part}.json"
            if f.exists():
                for c in json.loads(f.read_text()).get("checked", []):
                    c = dict(c)
                    fix = {}
                    for path, val in (c.get("fix") or {}).items():
                        if re.match(r"^(?:numbers|beliefs|plan|windows)\[\d+\]\.", path) or "." not in path.split("[")[0] and not path.startswith(("notUsed", "gaps", "rejected")):
                            fix[path] = val
                        else:  # a page-level field (notUsed.other[+], gaps…): applied to the page, not the item
                            page_fixes.append((path, val))
                    c["fix"] = fix
                    key = (c.get("where", "numbers"), c["index"])
                    if key in verdicts:  # two entries for one item (a step's actions and its proof): combine
                        prev = verdicts[key][0]
                        c["fix"] = {**prev.get("fix", {}), **fix}
                        if rank.get(prev["verdict"], 0) > rank.get(c["verdict"], 0):
                            c["verdict"] = prev["verdict"]
                        c["problems"] = (prev.get("problems") or []) + (c.get("problems") or [])
                    verdicts[key] = (c, part)
        log, rejected = [], list(rev.get("rejected", []))
        out = {k: v for k, v in rev.items() if k not in ("numbers", "beliefs", "windows", "plan")}
        for where in ("numbers", "beliefs", "windows"):
            kept = []
            for i, x in enumerate(rev.get(where, [])):
                x = copy.deepcopy(x)
                if x.pop("changed", False):
                    v = verdicts.get((where, i))
                    if not v:
                        x["check"] = {"by": "", "on": "", "verdict": "missing", "notes": "changed, not re-checked"}
                        log.append(f"{pid} {where} {i}: CHANGED, NO CHECK")
                    elif v[0]["verdict"] == "reject":
                        x["rejectedBy"] = {"by": f"revision checker {v[1]} ({pid})", "why": v[0].get("problems")}
                        rejected.append(x)
                        log.append(f"{pid} {where} {i}: REJECTED")
                        continue
                    else:
                        for path, val in (v[0].get("fix") or {}).items():
                            setpath(x, path, val)
                        x["check"] = {"by": f"revision checker {v[1]} ({pid})", "on": TODAY, "verdict": "ok",
                                      "notes": "checked after revision" + (": corrections applied to " + ", ".join(v[0]["fix"]) if v[0].get("fix") else "")}
                kept.append(x)
            out[where] = kept
        plan = copy.deepcopy(rev.get("plan", []))
        for i, st in enumerate(plan):
            pr = st.get("proof")
            if not pr and st.get("changed"):
                v = verdicts.get(("plan", i))
                for path, val in ((v[0].get("fix") or {}) if v else {}).items():
                    setpath(st, re.sub(r"^plan\[\d+\]\.", "", path), val)
                if not v:
                    log.append(f"{pid} plan {i + 1}: actions CHANGED, NO CHECK")
            if pr and pr.pop("changed", False) or (pr and st.pop("changed", False)):
                v = verdicts.get(("plan", i))
                if v and v[0]["verdict"] == "reject":
                    rejected.append({"planStep": i + 1, "proof": st.pop("proof"), "why": v[0].get("problems")})
                    log.append(f"{pid} plan {i + 1}: proof REJECTED")
                    continue
                if v:
                    for path, val in (v[0].get("fix") or {}).items():
                        path = re.sub(r"^plan\[\d+\]\.", "", path)
                        if path.startswith("proof."):
                            setpath(pr, path[len("proof."):], val)
                        else:
                            setpath(st, path, val)  # a fix to the step's own actions
                    pr["check"] = {"by": f"revision checker {v[1]} ({pid})", "on": TODAY, "verdict": "ok"}
                else:
                    pr["check"] = {"by": "", "verdict": "missing"}
                    log.append(f"{pid} plan {i + 1}: proof CHANGED, NO CHECK")
            st.pop("changed", None)
            st.pop("changeNote", None)
        out["plan"] = plan
        out["rejected"] = rejected
        for path, val in page_fixes:
            setpath(out, path, val)
            log.append(f"{pid} page field {path}: applied")
        (V3 / "pages" / f"{pid}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
        print(f"{pid}: {len(out['numbers'])} numbers, {len(out['beliefs'])} beliefs, {len(out.get('windows', []))} windows, {len(rejected)} rejected")
        print("\n".join(log))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["--round"]:
        main(a[2:], a[1])
    else:
        main(a)
