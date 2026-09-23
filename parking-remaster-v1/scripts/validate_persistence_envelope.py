#!/usr/bin/env python3
"""Validate Parking Remaster persistence envelopes without activating gameplay gates."""
import datetime as dt
import json, math, sys
from pathlib import Path

REQUIRED = {"schema_version", "content_version", "level_id", "level_state", "updated_at"}
FORBIDDEN = {"audio_context_state", "transient_animation_frame", "dom_reference", "timer_handle", "raw_telemetry_log"}
SUPPORTED_SCHEMA = "1.0"
MAX_ENVELOPE_BYTES = 64 * 1024
MAX_DEPTH = 12


def _portable_json_errors(value, path="$", depth=0):
    errors = []
    if depth > MAX_DEPTH:
        return [f"{path} exceeds maximum nesting depth"]
    if value is None or isinstance(value, (str, bool, int)):
        return errors
    if isinstance(value, float):
        if not math.isfinite(value):
            errors.append(f"{path} contains non-finite number")
        return errors
    if isinstance(value, list):
        for i, item in enumerate(value):
            errors.extend(_portable_json_errors(item, f"{path}[{i}]", depth + 1))
        return errors
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str):
                errors.append(f"{path} contains non-string object key")
                continue
            errors.extend(_portable_json_errors(item, f"{path}.{key}", depth + 1))
        return errors
    errors.append(f"{path} contains non-JSON value")
    return errors


def _valid_timestamp(value):
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None


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
    for key in ("content_version", "level_id"):
        if key in envelope and (not isinstance(envelope[key], str) or not envelope[key].strip()):
            errors.append(f"{key} must be a non-empty string")
    if "updated_at" in envelope and not _valid_timestamp(envelope["updated_at"]):
        errors.append("updated_at must be an offset-aware ISO-8601 timestamp")
    if "level_state" in envelope and not isinstance(envelope["level_state"], dict):
        errors.append("level_state must be an object")
    if content_version is not None and envelope.get("content_version") != content_version:
        errors.append("stale content_version requires explicit tested migration or reset")
    if known_levels is not None and envelope.get("level_id") not in known_levels:
        errors.append("unknown level_id must fail closed")
    errors.extend(_portable_json_errors(envelope))
    try:
        encoded = json.dumps(envelope, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")
        if len(encoded) > MAX_ENVELOPE_BYTES:
            errors.append("envelope exceeds bounded persistence size")
    except (TypeError, ValueError):
        # Portable-JSON errors above carry the specific reason.
        pass
    return errors


def main():
    if len(sys.argv) < 2:
        print("usage: validate_persistence_envelope.py ENVELOPE.json [CONTENT_VERSION] [LEVEL_ID ...]", file=sys.stderr)
        return 2
    try:
        raw = Path(sys.argv[1]).read_bytes()
        if len(raw) > MAX_ENVELOPE_BYTES:
            print("FAIL: envelope exceeds bounded persistence size", file=sys.stderr)
            return 1
        data = json.loads(raw.decode("utf-8"), parse_constant=lambda x: (_ for _ in ()).throw(ValueError(f"non-finite JSON constant {x}")))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
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
