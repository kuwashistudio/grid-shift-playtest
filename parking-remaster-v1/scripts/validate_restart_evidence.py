#!/usr/bin/env python3
"""Fail closed when PROJECT_STATE names repository evidence that no longer exists.

This validates only durable repository paths. Human review quality/status is deliberately
out of scope and is never inferred here.
"""
from __future__ import annotations
import json
from pathlib import Path, PurePosixPath
import sys

PARKING_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PARKING_ROOT.parent
STATE_PATH = PARKING_ROOT / "project-state" / "PROJECT_STATE.json"
ALLOWED_PREFIXES = ("parking-remaster-v1/", ".github/workflows/parking-remaster-")


def safe_path(value: object) -> bool:
    if not isinstance(value, str) or not value:
        return False
    p = PurePosixPath(value)
    return not p.is_absolute() and ".." not in p.parts and any(value.startswith(prefix) for prefix in ALLOWED_PREFIXES)


def validate(state: dict, repo_root: Path) -> list[str]:
    errors: list[str] = []
    paths = state.get("parallel_progress", {}).get("evidence_files")
    if not isinstance(paths, list) or not paths:
        return ["parallel_progress.evidence_files must be a non-empty list"]
    seen: set[str] = set()
    for value in paths:
        if not safe_path(value):
            errors.append(f"unsafe evidence path: {value!r}")
            continue
        if value in seen:
            errors.append(f"duplicate evidence path: {value}")
            continue
        seen.add(value)
        target = repo_root / PurePosixPath(value)
        if not target.is_file():
            errors.append(f"missing durable evidence file: {value}")
    return errors


def main() -> int:
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    errors = validate(state, REPO_ROOT)
    if errors:
        print("RESTART_EVIDENCE_VALIDATION: FAIL")
        for e in errors:
            print("- " + e)
        return 1
    print(f"RESTART_EVIDENCE_VALIDATION: PASS files={len(state['parallel_progress']['evidence_files'])}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
