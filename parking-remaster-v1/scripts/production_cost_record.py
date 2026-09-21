#!/usr/bin/env python3
"""Validate/write bounded per-level production-cost records.

Pre-production measurement only. This records human/tool elapsed minutes and
revision counts so future P2/P3 can test repeatability without analytics,
artifacts, or gameplay changes. It never judges fun/difficulty or unlocks gates.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REQUIRED = ("level_id", "authoring_minutes", "qa_minutes", "revision_count")


def validate(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("record must be an object")
    missing = [key for key in REQUIRED if key not in data]
    if missing:
        raise ValueError("missing required field(s): " + ", ".join(missing))
    if not isinstance(data["level_id"], str) or not data["level_id"].strip():
        raise ValueError("level_id must be a non-empty string")
    for key in ("authoring_minutes", "qa_minutes"):
        value = data[key]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
            raise ValueError(f"{key} must be a non-negative number")
    revisions = data["revision_count"]
    if isinstance(revisions, bool) or not isinstance(revisions, int) or revisions < 0:
        raise ValueError("revision_count must be a non-negative integer")
    allowed = set(REQUIRED) | {"notes"}
    unknown = sorted(set(data) - allowed)
    if unknown:
        raise ValueError("unknown field(s): " + ", ".join(unknown))
    result = dict(data)
    result["total_minutes"] = data["authoring_minutes"] + data["qa_minutes"]
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("record", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.record.read_text(encoding="utf-8"))
        result = validate(data)
        encoded = json.dumps(result, indent=2, sort_keys=True) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(encoded, encoding="utf-8")
        else:
            sys.stdout.write(encoded)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print(f"PASS: {result['level_id']} total={result['total_minutes']} min", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
