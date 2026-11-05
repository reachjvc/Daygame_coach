"""Merge writer drafts and reviewer verdicts in 08-v3/drafts into the files the build reads.

Usage: python3 board/finalize_v3.py
An item counts as checked only when a reviewer who did not write it passed it: the first checker (verdict ok,
nothing changed after) or the re-checker (verdict ok, or the re-checker's own corrections applied word for word).
Anything else is left without a passing check, so the build refuses it (RULEBOOK rule 16).
"""
import copy
import json
import re
from pathlib import Path

V3 = Path(__file__).resolve().parent.parent / "08-v3"
D = V3 / "drafts"
TODAY = "2026-11-05"
# the general numbers pool alcohol and drugs (National Recovery Survey); they show only on pages they cover
GENERAL_COVERS = ["alcohol", "cannabis"]


def load(name):
    p = D / name
    return json.loads(p.read_text()) if p.exists() else None


def setpath(obj, path, val):
    """Set a field by a reviewer's path: "basis.n", "refs[0].quote", "beliefs[1].proof" (the item's own prefix is
    dropped), or "refs[+]" (append)."""
    path = re.sub(r"^(?:numbers|beliefs|plan|windows)\[\d+\]\.", "", path)
    parts = []
    for seg in path.split("."):
        m = re.fullmatch(r"(\w+)((?:\[(?:\d+|\+)\])*)", seg)
        if not m:
            raise ValueError(f"bad field path {path!r}")
        parts.append(m.group(1))
        parts += [int(i) if i != "+" else "+" for i in re.findall(r"\[(\d+|\+)\]", m.group(2))]
    for k in parts[:-1]:
        obj = obj[k] if isinstance(k, int) else obj.setdefault(k, {})
    last = parts[-1]
    if last == "+":
        obj.append(val)
    elif isinstance(last, int) and last == len(obj):
        obj.append(val)
    else:
        obj[last] = val


def verdicts(recheck, where):
    out = {}
    for c in (recheck or {}).get("checked", []):
        if c.get("where", "numbers") == where:
            out[c["index"]] = c
    return out


def settle(items, where, recheck, label, log):
    rc = verdicts(recheck, where)
    kept, rejected = [], []
    for i, x in enumerate(items):
        x = copy.deepcopy(x)
        c1 = x.get("check1") or {}
        needs = bool(x.get("fixedFields")) or x.get("replacement") or x.get("unchecked") or c1.get("verdict") != "ok"
        tag = x.get("big") or x.get("limiting") or (x.get("proof") or {}).get("text", "")[:40] or f"#{i}"
        if not needs:
            x["check"] = {"by": c1.get("by") or f"first source checker ({label})", "on": c1.get("on") or TODAY, "verdict": "ok", "notes": "passed the first check"}
        elif i in rc:
            r = rc[i]
            if r["verdict"] == "ok":
                x["check"] = {"by": f"re-checker ({label})", "on": TODAY, "verdict": "ok", "notes": "passed after the first checker's fixes"}
            elif r["verdict"] == "fix":
                for path, val in (r.get("fix") or {}).items():
                    setpath(x, path, val)
                x["check"] = {"by": f"re-checker ({label})", "on": TODAY, "verdict": "ok", "notes": "re-checker's own corrections applied: " + ", ".join(r.get("fix") or {})}
                log.append(f"{label} {where} {tag}: re-checker fixed {', '.join(r.get('fix') or {})}")
            else:
                x["rejectedBy"] = {"by": f"re-checker ({label})", "why": r.get("problems")}
                rejected.append(x)
                log.append(f"{label} {where} {tag}: REJECTED by re-checker")
                continue
        else:
            x["check"] = {"by": "", "on": "", "verdict": "missing", "notes": "no re-check found"}
            log.append(f"{label} {where} {tag}: NO RE-CHECK")
        for k in ("check1", "fixedFields", "unchecked"):
            x.pop(k, None)
        kept.append(x)
    return kept, rejected


def main():
    log = []
    (V3 / "pages").mkdir(exist_ok=True)
    for pid in ["alcohol", "nicotine", "cannabis", "porn"]:
        nums = load(f"{pid}-numbers.fixed.json")
        bel = load(f"{pid}-beliefs.fixed.json")
        rc = load(f"{pid}-recheck.json")
        if not nums or not bel:
            log.append(f"{pid}: drafts not ready")
            continue
        numbers, rej_n = settle(nums["numbers"], "numbers", rc, pid, log)
        beliefs, rej_b = settle(bel["beliefs"], "beliefs", rc, pid, log)
        plan = copy.deepcopy(bel["plan"])
        rcp = verdicts(rc, "plan")
        for i, st in enumerate(plan):
            pr = st.get("proof")
            if not pr:
                continue
            c1 = pr.get("check1") or {}
            if i in rcp and rcp[i]["verdict"] == "reject":
                log.append(f"{pid} plan step {i + 1} proof: REJECTED, dropped from the step (kept in rejected)")
                rej_b.append({"planStep": i + 1, "proof": st.pop("proof"), "why": rcp[i].get("problems")})
                continue
            if i in rcp and rcp[i]["verdict"] == "fix":
                for path, val in (rcp[i].get("fix") or {}).items():
                    setpath(pr, path, val)
            pr["check"] = {"by": f"source checker ({pid})", "on": TODAY, "verdict": "ok"}
            for k in ("check1", "fixedFields", "unchecked"):
                pr.pop(k, None)
        page = {"id": pid, "numbers": numbers, "gaps": nums.get("gaps", []), "beliefs": beliefs, "plan": plan,
                "rejected": nums.get("rejected", []) + rej_n + bel.get("rejected", []) + rej_b,
                "notUsed": {"numbers": nums.get("notUsed", []), "beliefs": bel.get("notUsed", [])}}
        (V3 / "pages" / f"{pid}.json").write_text(json.dumps(page, ensure_ascii=False, indent=1))
        log.append(f"{pid}: {len(numbers)} numbers, {len(beliefs)} beliefs, {len(page['rejected'])} rejected")
    g = load("general-numbers.fixed.json")
    if g:
        numbers, rej = settle(g["numbers"], "numbers", load("general-recheck.json"), "general", log)
        for x in numbers:
            x["covers"] = GENERAL_COVERS
        (V3 / "general.json").write_text(json.dumps({"id": "general", "numbers": numbers, "gaps": g.get("gaps", []), "rejected": g.get("rejected", []) + rej}, ensure_ascii=False, indent=1))
        log.append(f"general: {len(numbers)} numbers")
    print("\n".join(log))


if __name__ == "__main__":
    main()
