#!/usr/bin/env python3
"""Regression-test fail-closed invariants in validate_project_state.py.

Stdlib-only. Uses an isolated temporary copy, so canonical project-state files are
never modified by the test.
"""
from __future__ import annotations

import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
STATE_DIR = ROOT / "project-state"
VALIDATOR = ROOT / "scripts" / "validate_project_state.py"


def run(root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(root / "scripts" / "validate_project_state.py")], cwd=root, text=True, capture_output=True, check=False)


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def isolated_root(tmp: str) -> Path:
    root = Path(tmp) / "parking-remaster-v1"
    (root / "scripts").mkdir(parents=True)
    shutil.copy2(VALIDATOR, root / "scripts" / "validate_project_state.py")
    shutil.copytree(STATE_DIR, root / "project-state")
    return root


def expect_fail(name: str, mutate, needle: str) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = isolated_root(tmp)
        mutate(root)
        result = run(root)
        output = result.stdout + result.stderr
        if result.returncode == 0 or needle not in output:
            raise AssertionError(f"{name}: expected fail containing {needle!r}; got rc={result.returncode}\n{output}")
        print(f"PASS negative: {name}")


def recount(root: Path, gates: dict) -> None:
    counts = {s: sum(1 for g in gates["gates"] if g["status"] == s) for s in ("TODO", "IN_PROGRESS", "BLOCKED", "PASS")}
    counts["total"] = len(gates["gates"])
    gates["counts"] = counts
    state_path = root / "project-state" / "PROJECT_STATE.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state["gate_counts"] = counts
    write_json(state_path, state)


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = isolated_root(tmp)
        result = run(root)
        if result.returncode != 0:
            raise AssertionError("canonical state must pass before negative tests\n" + result.stdout + result.stderr)
        print("PASS baseline canonical state")

    def stale_last_completed(root: Path) -> None:
        state_path = root / "project-state" / "PROJECT_STATE.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["last_completed_gate"] = "GP-000"
        write_json(state_path, state)

    expect_fail("last_completed_gate must be latest PASS before current gate", stale_last_completed, "last_completed_gate 'GP-000' is stale")

    def pending_audio_synthetic_pass(root: Path) -> None:
        gates_path = root / "project-state" / "GATES.json"
        state_path = root / "project-state" / "PROJECT_STATE.json"
        gates = json.loads(gates_path.read_text(encoding="utf-8"))
        for gate in gates["gates"]:
            if gate["id"] == "P1-006":
                gate["status"] = "PASS"
                gate["evidence"] = ["synthetic browser metric only"]
        recount(root, gates)
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["current_gate"] = "P1-007"
        state["last_completed_gate"] = "P1-006"
        write_json(gates_path, gates)
        write_json(state_path, state)

    expect_fail("P1-006 cannot synthetic-PASS while human review pending", pending_audio_synthetic_pass, "P1-006 cannot PASS while human_review_status is pending")

    def activate_p1_008_early(root: Path) -> None:
        gates_path = root / "project-state" / "GATES.json"
        gates = json.loads(gates_path.read_text(encoding="utf-8"))
        for gate in gates["gates"]:
            if gate["id"] == "P1-008":
                gate["status"] = "IN_PROGRESS"
                gate["blocker"] = None
        recount(root, gates)
        write_json(gates_path, gates)

    expect_fail("multi-car gate cannot bypass single-car acceptance", activate_p1_008_early, "P1-008 cannot be active/PASS before prerequisite P1-007 is PASS")

    def activate_production_early(root: Path) -> None:
        gates_path = root / "project-state" / "GATES.json"
        gates = json.loads(gates_path.read_text(encoding="utf-8"))
        for gate in gates["gates"]:
            if gate["id"] == "P2-001":
                gate["status"] = "IN_PROGRESS"
                gate["blocker"] = None
        recount(root, gates)
        write_json(gates_path, gates)

    expect_fail("production-scale gate cannot bypass rebuilt Level 1", activate_production_early, "P2-001 cannot be active/PASS before prerequisite P1-009 is PASS")

    def corrupt_counts(root: Path) -> None:
        gates_path = root / "project-state" / "GATES.json"
        gates = json.loads(gates_path.read_text(encoding="utf-8"))
        gates["counts"]["PASS"] += 1
        write_json(gates_path, gates)

    expect_fail("stored gate counts must match registry", corrupt_counts, "GATES counts mismatch")
    print("PROJECT_STATE_REGRESSION_TESTS: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
