#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from solve_level import build_state_rules, create_game_state

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "shared_exit_conflict_v2.json"
JS_EVAL = ROOT / "scripts" / "eval_shared_exit_conflict.mjs"


def normalize_state(state):
    return {
        "activeIds": list(state["active_ids"]),
        "occupiedGroups": dict(state["occupied_groups"]),
        "failed": None if not state["failed"] else {
            "type": state["failed"]["type"],
            "groupId": state["failed"]["group_id"],
            "occupantId": state["failed"]["occupant_id"],
            "attemptedVehicleId": state["failed"]["attempted_vehicle_id"],
        },
    }


def py_trace(level):
    rules = build_state_rules(level)
    s = create_game_state(level)
    rows = []

    def snap(label, **extra):
        rows.append({
            "label": label,
            "state": normalize_state(s),
            "safe": rules["safe_moves"](s),
            "risky": rules["risky_conflict_moves"](s),
            **extra,
        })

    snap("initial")
    r = rules["attempt_launch"](s, "merge_a")
    s = r["state"]
    snap("launch_a", status=r["status"], groupId=r["group_id"])

    r = rules["attempt_launch"](s, "merge_b")
    rows.append({
        "label": "conflict_b",
        "state": normalize_state(s),
        "safe": rules["safe_moves"](s),
        "risky": rules["risky_conflict_moves"](s),
        "status": r["status"],
        "failure": {
            "type": r["failure"]["type"],
            "groupId": r["failure"]["group_id"],
            "occupantId": r["failure"]["occupant_id"],
            "attemptedVehicleId": r["failure"]["attempted_vehicle_id"],
        },
        "stateAfter": normalize_state(r["state"]),
    })

    r = rules["attempt_launch"](s, "safe_c")
    s = r["state"]
    snap("launch_safe_c", status=r["status"])

    s = rules["complete_exit"](s, "merge_a")
    snap("complete_a")

    r = rules["attempt_launch"](s, "merge_b")
    s = r["state"]
    snap("launch_b_after_clear", status=r["status"], groupId=r["group_id"])
    return rows


def main():
    level = json.loads(FIXTURE.read_text(encoding="utf-8"))
    expected_ids = {v["id"] for v in level["vehicles"]}
    seen = set()
    for group in level["conflict_groups"]:
        for vid in group["vehicle_ids"]:
            if vid not in expected_ids:
                raise AssertionError(f"unknown conflict vehicle: {vid}")
            if vid in seen:
                raise AssertionError(f"vehicle in multiple conflict groups: {vid}")
            seen.add(vid)

    py = py_trace(level)
    proc = subprocess.run(["node", str(JS_EVAL), str(FIXTURE)], text=True, capture_output=True, check=True)
    js = json.loads(proc.stdout)
    if py != js:
        print(json.dumps({"python": py, "js": js}, indent=2), file=sys.stderr)
        raise AssertionError("shared_exit_conflict Python/JS trace mismatch")

    assert py[0]["safe"] == ["merge_a", "merge_b", "safe_c"]
    assert py[1]["safe"] == ["safe_c"]
    assert py[1]["risky"] == ["merge_b"]
    assert py[2]["status"] == "conflict_fail"
    assert py[3]["status"] == "launched"
    assert py[4]["safe"] == ["merge_b"]
    assert py[5]["status"] == "launched"

    print("PASS H1-IMPL fixture: deterministic occupancy, visible conflict failure, safe alternative, Python/JS parity")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(exc.stdout, file=sys.stderr)
        print(exc.stderr, file=sys.stderr)
        raise SystemExit(exc.returncode or 1)
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
