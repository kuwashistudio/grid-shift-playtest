#!/usr/bin/env python3
"""Build/check a deterministic Parking Remaster Level Library manifest.

Pre-production QA only. Every input must pass the structural Level Data contract,
and exact structural duplicates are rejected via level_fingerprint. The manifest
records stable IDs/fingerprints and source paths; it does not solve levels, judge
fun/difficulty, unlock P1-008, or authorize production.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from level_fingerprint import fingerprint, load


def build(paths: list[Path]) -> dict:
    entries: list[dict[str, str]] = []
    ids: dict[str, Path] = {}
    digests: dict[str, Path] = {}
    for path in paths:
        data = load(path)
        digest = fingerprint(data)  # also validates structural contract
        level_id = data["level_id"]
        if level_id in ids:
            raise ValueError(f"duplicate level_id: {ids[level_id]} == {path} ({level_id})")
        if digest in digests:
            raise ValueError(f"exact structural duplicate: {digests[digest]} == {path} ({digest})")
        ids[level_id] = path
        digests[digest] = path
        entries.append({"level_id": level_id, "fingerprint": digest, "source": path.as_posix()})
    entries.sort(key=lambda e: e["level_id"])
    return {"schema_version": "1.0", "level_count": len(entries), "levels": entries}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("levels", nargs="+", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        manifest = build(args.levels)
        encoded = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(encoded, encoding="utf-8")
        else:
            sys.stdout.write(encoded)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print(f"PASS: Level Library manifest contains {manifest['level_count']} unique level(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
