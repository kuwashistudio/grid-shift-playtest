#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BEAT = ROOT / "VERTICAL_SLICE_BEAT_CHART_V1.json"
BRIEFS = ROOT / "VERTICAL_SLICE_LEVEL_BRIEFS_V1.json"


def load(path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def validate(beat, briefs):
    errors = []
    blevels = beat.get("levels", [])
    qbriefs = briefs.get("briefs", [])
    bm = {x.get("id"): x for x in blevels}
    qm = {x.get("id"): x for x in qbriefs}
    expected = [f"level_{i:03d}" for i in range(1, 15)]

    if list(bm) != expected: errors.append("beat chart must contain level_001..level_014 exactly and in order")
    if list(qm) != expected: errors.append("briefs must contain level_001..level_014 exactly and in order")
    if set(bm) != set(qm): errors.append("beat/brief level id sets differ")

    for lid in sorted(set(bm) & set(qm)):
        b, q = bm[lid], qm[lid]
        hard = q.get("hard", {})
        if b.get("role") != q.get("role"): errors.append(f"{lid}: role mismatch")
        if b.get("track") != q.get("track"): errors.append(f"{lid}: track mismatch")
        if bool(b.get("hard_fail")) != bool(hard.get("hard_fail")): errors.append(f"{lid}: hard_fail mismatch")
        new = b.get("new_mechanics", [])
        req = hard.get("required_mechanic")
        forbid = hard.get("forbid_mechanic")
        if req and req not in new and req not in b.get("practice", []) and req not in b.get("combine", []):
            errors.append(f"{lid}: required_mechanic absent from beat semantics")
        if forbid and (forbid in new or forbid in b.get("practice", []) or forbid in b.get("combine", [])):
            errors.append(f"{lid}: forbidden mechanic appears in beat semantics")
        novelty = hard.get("novelty_load")
        if novelty is not None and novelty != len(new): errors.append(f"{lid}: novelty_load != new_mechanics count")
        if b.get("recovery") and (b.get("peak") or b.get("hard_fail")):
            errors.append(f"{lid}: recovery cannot simultaneously be peak/hard_fail")

    main = [x for x in blevels if x.get("track") == "main"]
    hard_levels = [x for x in blevels if x.get("track") == "hard"]
    scope = beat.get("scope", {})
    if len(main) != scope.get("main_levels"): errors.append("main level count disagrees with scope")
    if len(hard_levels) != scope.get("optional_hard_levels"): errors.append("hard level count disagrees with scope")
    if len(blevels) != scope.get("total"): errors.append("total level count disagrees with scope")

    peaks = [i for i,x in enumerate(main) if x.get("peak")]
    for i in peaks:
        if main[i].get("new_mechanics"): errors.append(f"{main[i]['id']}: peak introduces mechanic")
        if i + 1 < len(main) and main[i+1].get("peak"): errors.append("consecutive main-track peaks")
    for i,x in enumerate(main[:-1]):
        if x.get("peak") and not main[i+1].get("recovery"):
            errors.append(f"{x['id']}: peak lacks immediate recovery")

    l10 = bm.get("level_010", {})
    q10 = qm.get("level_010", {}).get("hard", {})
    if l10.get("new_mechanics") != ["shared_exit_conflict"]:
        errors.append("level_010 must introduce only shared_exit_conflict")
    if q10.get("safe_alternative_min_during_conflict", 0) < 1:
        errors.append("level_010 must guarantee a non-conflicting action during conflict")
    if q10.get("conflict_group_count") != 1:
        errors.append("level_010 must teach exactly one conflict group")

    return errors


def main():
    errors = validate(load(BEAT), load(BRIEFS))
    if errors:
        for e in errors: print("ERROR:", e)
        raise SystemExit(1)
    print("PASS: vertical slice beat/brief/failure contracts are mutually consistent")

if __name__ == "__main__": main()
