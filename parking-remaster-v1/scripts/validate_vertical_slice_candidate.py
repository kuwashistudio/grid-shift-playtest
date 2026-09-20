#!/usr/bin/env python3
"""Validate one future Vertical Slice candidate against its frozen brief.

Prerequisite QA only: this does not author gameplay, unlock P1-008/P1-009,
or promote solver/numeric evidence to human-quality acceptance.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BRIEFS = ROOT / "VERTICAL_SLICE_LEVEL_BRIEFS_V1.json"
SOFT = ("vehicle_count","dependency_depth_moves","initial_legal_choice_count","mean_legal_choices","forced_state_ratio","mean_choice_entropy_bits")


def fail(errors: list[str]) -> int:
    print("VERTICAL_SLICE_CANDIDATE_VALIDATION: FAIL")
    for e in errors:
        print("-", e)
    return 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("candidate", type=Path, help="JSON fixture with brief_id, metrics, mechanics")
    args = ap.parse_args()
    data = json.loads(BRIEFS.read_text(encoding="utf-8"))
    candidate = json.loads(args.candidate.read_text(encoding="utf-8"))
    brief_id = candidate.get("brief_id")
    brief = next((b for b in data.get("briefs", []) if b.get("id") == brief_id), None)
    if not brief:
        return fail([f"unknown brief_id {brief_id!r}"])
    errors: list[str] = []
    metrics = candidate.get("metrics", {})
    for key in SOFT:
        value = metrics.get(key)
        env = brief.get("soft", {}).get(key)
        if not isinstance(value, (int, float)):
            errors.append(f"{key}: numeric candidate metric required")
        elif not env or not (env[0] <= value <= env[1]):
            errors.append(f"{key}: {value} outside frozen envelope {env}")
    mechanics = set(candidate.get("mechanics", []))
    hard = brief.get("hard", {})
    required = hard.get("required_mechanic")
    forbidden = hard.get("forbid_mechanic")
    if required and required not in mechanics:
        errors.append(f"required mechanic missing: {required}")
    if forbidden and forbidden in mechanics:
        errors.append(f"forbidden mechanic present: {forbidden}")
    if hard.get("hard_fail"):
        if candidate.get("conflict_group_count") != hard.get("conflict_group_count"):
            errors.append("conflict_group_count does not match brief")
        cm = candidate.get("conflict_member_count")
        env = hard.get("conflict_member_count")
        if not isinstance(cm, int) or not env or not (env[0] <= cm <= env[1]):
            errors.append(f"conflict_member_count {cm!r} outside {env}")
    safe_min = hard.get("safe_alternative_min_during_conflict")
    if safe_min is not None and candidate.get("safe_alternative_min_during_conflict", -1) < safe_min:
        errors.append(f"safe alternative count below required minimum {safe_min}")
    if errors:
        return fail(errors)
    print("VERTICAL_SLICE_CANDIDATE_VALIDATION: PASS")
    print(f"brief_id={brief_id} metrics={len(SOFT)} mechanics={sorted(mechanics)}")
    print("scope=brief-contract QA only; solver proof, runtime parity, visual review, and human fun remain separate gates")
    return 0


if __name__ == "__main__":
    sys.exit(main())
