#!/usr/bin/env python3
"""Canonical structural fingerprint for Parking Remaster Level Data.

Pre-production QA utility only. It detects exact logical duplicates after
normalizing semantically irrelevant metadata, array order, vehicle IDs and exit
IDs. It does not judge fun/difficulty, solve a level, unlock P1-008, or approve
production.
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

    # IDs are referential labels, not gameplay geometry. Resolve each car's
    # exit reference to the exit's semantic rule before stripping labels, so a
    # copied level cannot evade duplicate detection merely by renaming cars or
    # exits. Presentation metadata remains excluded by design.
    exit_by_id = {
        e["id"]: {"axis": e["axis"], "direction": e["direction"]}
        for e in data["exits"]
    }
    exits = sorted(
        ({"axis": e["axis"], "direction": e["direction"]} for e in data["exits"]),
        key=lambda e: (e["axis"], e["direction"]),
    )
    cars = sorted(
        ({
            "x": c["x"],
            "y": c["y"],
            "length": c["length"],
            "orientation": c["orientation"],
            "exit": exit_by_id[c["exit_id"]],
        } for c in data["cars"]),
        key=lambda c: (
            c["x"], c["y"], c["length"], c["orientation"],
            c["exit"]["axis"], c["exit"]["direction"],
        ),
    )
    return {
        "schema_version": data["schema_version"],
        "board": {"width": data["board"]["width"], "height": data["board"]["height"]},
        "exits": exits,
        "cars": cars,
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
                print(f"FAIL: exact logical duplicate: {seen[digest]} == {path} ({digest})", file=sys.stderr)
                return 1
            seen[digest] = path
            print(f"{digest}  {path}")
    except (OSError, json.JSONDecodeError, KeyError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print(f"PASS: {len(seen)} logically unique Level Data file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
