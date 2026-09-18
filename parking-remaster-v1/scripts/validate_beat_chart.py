#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHART = ROOT / "VERTICAL_SLICE_BEAT_CHART_V1.json"


def require(cond, message):
    if not cond:
        raise AssertionError(message)


def main():
    chart = json.loads(CHART.read_text(encoding="utf-8"))
    levels = chart["levels"]
    require(len(levels) == 14, f"expected 14 slice levels, got {len(levels)}")

    main = [x for x in levels if x["track"] == "main"]
    hard = [x for x in levels if x["track"] == "hard"]
    require(len(main) == 12, "expected 12 Main levels")
    require(len(hard) == 2, "expected 2 optional Hard levels")

    expected_ids = [f"level_{i:03d}" for i in range(1, 15)]
    require([x["id"] for x in levels] == expected_ids, "level IDs/order must be 001-014")

    # New major mechanics must debut in easy/non-peak contexts.
    for level in levels:
        if level["new_mechanics"]:
            require(not level["peak"], f"{level['id']}: new mechanic cannot debut on peak")
            require(level["target_band"] in {"very_easy", "easy"}, f"{level['id']}: new mechanic intro must be easy")

    # No consecutive Main peaks and every pre-final peak must be followed by recovery.
    for i, level in enumerate(main):
        if level["peak"] and i + 1 < len(main):
            nxt = main[i + 1]
            require(not nxt["peak"], f"{level['id']}: consecutive peak")
            require(nxt["recovery"], f"{level['id']}: peak must be followed by recovery")

    # The first hard-fail teaching level must not simultaneously be a peak.
    fail_levels = [x for x in main if x["hard_fail"]]
    require(fail_levels, "slice must exercise genuine fail/retry")
    first_fail = fail_levels[0]
    require(first_fail["role"] == "failure_teach", "first hard fail must be failure_teach")
    require(first_fail["target_band"] == "easy", "first hard fail teaching level must be easy")
    require(not first_fail["peak"], "first hard fail teaching level cannot be peak")

    # Main progression must not depend on Hard.
    require(all(x["track"] == "hard" for x in levels[12:]), "Hard levels must remain after Main slice")

    # H1 is now research-resolved and must use the selected deterministic mechanic.
    resolved = {x["id"]: x for x in chart.get("resolved_design_decisions", [])}
    require("H1" in resolved and resolved["H1"]["status"] == "DECIDED", "H1 must be decided")
    require(resolved["H1"]["selected"] == "shared_exit_conflict", "unexpected H1 mechanic")
    require(not any(x["id"] == "H1" for x in chart.get("unresolved_design_decisions", [])), "H1 must not remain unresolved")
    level10 = next(x for x in levels if x["id"] == "level_010")
    require("shared_exit_conflict" in level10["new_mechanics"], "Level 10 must teach shared_exit_conflict")

    print("PASS Beat Chart v1: 12 Main + 2 Hard, heartbeat/recovery valid, H1=shared_exit_conflict")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
