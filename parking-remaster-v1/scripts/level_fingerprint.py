#!/usr/bin/env python3
"""Canonical structural fingerprint for Parking Remaster Level Data.

Pre-production QA utility only. It detects exact structural duplicates after
normalizing semantically irrelevant array/order differences. It does not judge
fun/difficulty, solve a level, unlock P1-008, or approve production.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from validate_level_data_contract import validate


def canonical_payload(data: dict) -> dict:
    validate(data)
    return {
        "schema_version": data["schema_version"],
        "board": {"width": data["board"]["width"], "height": data["board"]["height"]},
        "exits": sorted(
            ({"id": e["id"], "axis": e["axis"], "direction": e["direction"]} for e in data["exits"]),
            key=lambda e: (e["id"], e["axis"], e["direction"]),
        ),
        "cars": sorted(
            ({
                "id": c["id"], "x": c["x"], "y": c["y"], "length": c["length"],
                "orientation": c["orientation"], "exit_id": c["exit_id"],
            } for c in data["cars"]),
            key=lambda c: c["id"],
        ),
    }


def fingerprint(data: dict) -> str:
    encoded = json.dumps(canonical_payload(data), sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def load(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{path}: root must be an object")
    return data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("levels", nargs="+", type=Path)
    args = parser.parse_args()
    seen: dict[str, Path] = {}
    try:
        for path in args.levels:
            digest = fingerprint(load(path))
            if digest in seen:
                print(f"FAIL: exact structural duplicate: {seen[digest]} == {path} ({digest})", file=sys.stderr)
                return 1
            seen[digest] = path
            print(f"{digest}  {path}")
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print(f"PASS: {len(seen)} structurally unique Level Data file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
