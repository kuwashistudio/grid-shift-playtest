#!/usr/bin/env python3
"""Validate Parking Remaster persistence envelopes without activating gameplay gates."""
import json, math, sys
from pathlib import Path

REQUIRED = {"schema_version", "content_version", "level_id", "level_state", "updated_at"}
FORBIDDEN = {"audio_context_state", "transient_animation_frame", "dom_reference", "timer_handle", "raw_telemetry_log"}
SUPPORTED_SCHEMA = "1.0"


def validate(envelope, *, known_levels=None, content_version=None):
    errors = []
    if not isinstance(envelope, dict):
        return ["envelope must be an object"]
    missing = sorted(REQUIRED - set(envelope))
    if missing:
        errors.append("missing required fields: " + ", ".join(missing))
    leaked = sorted(FORBIDDEN & set(envelope))
    if leaked:
        errors.append("forbidden transient fields: " + ", ".join(leaked))
    if envelope.get("schema_version") != SUPPORTED_SCHEMA:
        errors.append("unsupported schema_version")
    for key in ("content_version", "level_id", "updated_at"):
        if key in envelope and (not isinstance(envelope[key], str) or not envelope[key].strip()):
            errors.append(f"{key} must be a non-empty string")
    if "level_state" in envelope and not isinstance(envelope["level_state"], dict):
        errors.append("level_state must be an object")
    if content_version is not None and envelope.get("content_version") != content_version:
        errors.append("stale content_version requires explicit tested migration or reset")
    if known_levels is not None and envelope.get("level_id") not in known_levels:
        errors.append("unknown level_id must fail closed")
    return errors


def main():
    if len(sys.argv) < 2:
        print("usage: validate_persistence_envelope.py ENVELOPE.json [CONTENT_VERSION] [LEVEL_ID ...]", file=sys.stderr)
        return 2
    try:
        data = json.loads(Path(sys.argv[1]).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: unreadable/malformed envelope: {exc}", file=sys.stderr)
        return 1
    content_version = sys.argv[2] if len(sys.argv) >= 3 else None
    known = set(sys.argv[3:]) if len(sys.argv) >= 4 else None
    errors = validate(data, known_levels=known, content_version=content_version)
    if errors:
        print("FAIL: " + "; ".join(errors), file=sys.stderr)
        return 1
    print("PASS: persistence envelope is structurally recoverable")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
