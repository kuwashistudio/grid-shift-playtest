#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRIEFS = json.loads((ROOT / "VERTICAL_SLICE_LEVEL_BRIEFS_V1.json").read_text(encoding="utf-8"))
BY_ID = {x["id"]: x for x in BRIEFS["briefs"]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("difficulty", type=Path, help="difficulty feature JSON produced by extract_difficulty_features.py")
    ap.add_argument("--level", type=Path, help="canonical level JSON for hard mechanic checks")
    args = ap.parse_args()

    d = json.loads(args.difficulty.read_text(encoding="utf-8"))
    level_id = d["level_id"]
    brief = BY_ID.get(level_id)
    if not brief:
        raise SystemExit(f"no brief for {level_id}")

    features = d["structural_features"]
    warnings = []
    for name, rng in brief["soft"].items():
        if name not in features:
            continue
        value = features[name]
        if value < rng[0] or value > rng[1]:
            warnings.append({"feature": name, "value": value, "soft_range": rng})

    hard_errors = []
    if args.level:
        level = json.loads(args.level.read_text(encoding="utf-8"))
        hard = brief["hard"]
        mechanic = hard.get("required_mechanic")
        if mechanic and mechanic not in level.get("mechanics", []):
            hard_errors.append(f"missing required mechanic: {mechanic}")
        forbidden = hard.get("forbid_mechanic")
        if forbidden and forbidden in level.get("mechanics", []):
            hard_errors.append(f"forbidden mechanic present: {forbidden}")
        if "conflict_group_count" in hard:
            if len(level.get("conflict_groups", [])) != hard["conflict_group_count"]:
                hard_errors.append("conflict_group_count mismatch")
        if "conflict_member_count" in hard and level.get("conflict_groups"):
            lo, hi = hard["conflict_member_count"]
            for g in level["conflict_groups"]:
                n = len(g["vehicle_ids"])
                if not (lo <= n <= hi):
                    hard_errors.append(f"{g['id']} member count {n} outside {lo}..{hi}")

    print(json.dumps({
        "level_id": level_id,
        "hard_status": "PASS" if not hard_errors else "FAIL",
        "hard_errors": hard_errors,
        "soft_status": "PASS" if not warnings else "REVIEW",
        "soft_outliers": warnings,
        "policy": "Soft envelope outliers require design review; they are not automatic human-difficulty failures."
    }, indent=2))

    raise SystemExit(1 if hard_errors else 0)


if __name__ == "__main__":
    main()
