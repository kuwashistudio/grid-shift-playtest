#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRIEFS = ROOT / "VERTICAL_SLICE_LEVEL_BRIEFS_V1.json"


def midpoint(r):
    return (r[0] + r[1]) / 2


def require(cond, message):
    if not cond:
        raise AssertionError(message)


def easier_direction(feature, easy_range, hard_range):
    if feature in {"dependency_depth_moves", "forced_state_ratio"}:
        return midpoint(easy_range) < midpoint(hard_range)
    if feature in {"mean_legal_choices", "mean_choice_entropy_bits"}:
        return midpoint(easy_range) > midpoint(hard_range)
    raise ValueError(feature)


def harder_direction(feature, hard_range, easy_range):
    if feature in {"dependency_depth_moves", "forced_state_ratio"}:
        return midpoint(hard_range) > midpoint(easy_range)
    if feature in {"mean_legal_choices", "mean_choice_entropy_bits"}:
        return midpoint(hard_range) < midpoint(easy_range)
    raise ValueError(feature)


def main():
    data = json.loads(BRIEFS.read_text(encoding="utf-8"))
    briefs = data["briefs"]
    by_id = {x["id"]: x for x in briefs}
    require(len(briefs) == 14 and len(by_id) == 14, "expected 14 unique level briefs")
    require(list(by_id) == [f"level_{i:03d}" for i in range(1, 15)], "brief order must be level_001..014")

    for brief in briefs:
        for feature, rng in brief["soft"].items():
            require(isinstance(rng, list) and len(rng) == 2 and rng[0] <= rng[1], f"{brief['id']} invalid range {feature}")
        if brief["schema_version"] == 2:
            require(brief["hard"].get("required_mechanic") == "shared_exit_conflict", f"{brief['id']} schema v2 must require conflict mechanic")

    l10 = by_id["level_010"]
    require(l10["hard"]["novelty_load"] == 1, "Level 10 must introduce exactly one concept")
    require(l10["hard"]["conflict_group_count"] == 1, "Level 10 must teach one conflict group")
    require(l10["hard"]["conflict_member_count"] == [2, 2], "Level 10 must teach exactly two conflicting cars")
    require(l10["hard"]["safe_alternative_min_during_conflict"] >= 1, "Level 10 requires a safe alternative")

    l13 = by_id["level_013"]
    require(l13["hard"].get("forbid_mechanic") == "shared_exit_conflict", "Level 13 must remain pure reasoning")

    for rule in data["relational_rules"]:
        if rule["type"] == "recovery_envelope":
            easy, hard = by_id[rule["easier"]], by_id[rule["harder"]]
            hits = sum(easier_direction(f, easy["soft"][f], hard["soft"][f]) for f in rule["dimensions"])
            require(hits >= rule["minimum_directional_dimensions"], f"{rule['id']} recovery envelope too weak")
        elif rule["type"] == "challenge_envelope":
            hard, easy = by_id[rule["harder"]], by_id[rule["easier"]]
            hits = sum(harder_direction(f, hard["soft"][f], easy["soft"][f]) for f in rule["dimensions"])
            require(hits >= rule["minimum_directional_dimensions"], f"{rule['id']} challenge envelope too weak")
        elif rule["type"] == "greater_or_equal_midpoint":
            require(midpoint(by_id[rule["a"]]["soft"][rule["feature"]]) >= midpoint(by_id[rule["b"]]["soft"][rule["feature"]]), rule["id"])
        elif rule["type"] == "less_or_equal_max":
            require(by_id[rule["a"]]["soft"][rule["feature"]][1] <= by_id[rule["b"]]["soft"][rule["feature"]][1], rule["id"])
        elif rule["type"] == "not_structurally_harder_than":
            a, b = by_id[rule["a"]], by_id[rule["b"]]
            for f in rule["dimensions"]:
                if f in {"dependency_depth_moves", "forced_state_ratio"}:
                    require(a["soft"][f][1] <= b["soft"][f][1] + 0.03, f"{rule['id']} {f}")
        else:
            raise AssertionError(f"unknown rule type {rule['type']}")

    print("PASS VS-BRIEF: 14 briefs, soft envelopes valid, heartbeat relations and H1 teaching constraints coherent")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
