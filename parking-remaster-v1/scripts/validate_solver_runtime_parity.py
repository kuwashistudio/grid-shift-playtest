#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from solve_level import build_rules

ROOT = Path(__file__).resolve().parents[1]
LEVEL = ROOT / "levels" / "level_001.json"
JS_EVAL = ROOT / "scripts" / "eval_js_logic.mjs"


def require(cond, message):
    if not cond:
        raise AssertionError(message)


def main():
    level = json.loads(LEVEL.read_text(encoding="utf-8"))
    ids, blocker, legal = build_rules(level)
    require(len(ids) <= 14, "exhaustive parity guard exceeded")

    states = []
    for mask in range(1 << len(ids)):
        states.append([vid for i, vid in enumerate(ids) if mask & (1 << i)])

    proc = subprocess.run(
        ["node", str(JS_EVAL), str(LEVEL)],
        input=json.dumps(states),
        text=True,
        capture_output=True,
        check=True,
    )
    js_rows = json.loads(proc.stdout)
    require(len(js_rows) == len(states), "JS state count mismatch")

    mismatches = []
    for active_list, js in zip(states, js_rows):
        alive = set(active_list)
        py_legal = legal(alive)
        py_blockers = {vid: blocker(vid, alive) for vid in active_list}
        if js["legal"] != py_legal or js["blockers"] != py_blockers:
            mismatches.append({
                "active": active_list,
                "python_legal": py_legal,
                "js_legal": js["legal"],
                "python_blockers": py_blockers,
                "js_blockers": js["blockers"],
            })
            if len(mismatches) >= 5:
                break

    require(not mismatches, f"solver/runtime parity mismatch: {mismatches}")
    print(f"PASS LDP-3: Python solver vs JS functional core parity across {len(states)} states")
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
