#!/usr/bin/env python3
"""Fail-closed validator for the pre-production Parking telemetry contract."""
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "qa" / "TELEMETRY_SPEC_V1.json"
EVENT_FIELDS = {
    "session_start": {"session_id","level_id","build_id","elapsed_ms"},
    "first_action": {"session_id","level_id","vehicle_id","elapsed_ms"},
    "vehicle_action": {"session_id","level_id","vehicle_id","result","elapsed_ms"},
    "failure": {"session_id","level_id","reason","elapsed_ms"},
    "retry": {"session_id","level_id","elapsed_ms"},
    "level_complete": {"session_id","level_id","actions","retries","elapsed_ms"},
    "session_end": {"session_id","level_id","reason","elapsed_ms"},
}
REQUIRED_PRIVACY_FALSE = {"persistent_user_id","advertising_id","precise_location","free_text","raw_input_stream"}
FORBIDDEN = {"name","email","phone","address","ip","latitude","longitude","advertising_id","device_fingerprint","user_agent","free_text"}
ENUMS = {
    "vehicle_action.result": ["moved", "blocked"],
    "failure.reason": ["shared_exit_conflict"],
    "session_end.reason": ["complete", "abandon", "page_hidden"],
}
CONSTRAINT_KEYS = {"session_id","elapsed_ms","actions","retries","level_id","vehicle_id","build_id"}
METRICS = {
    "time_to_first_action_ms","level_completion_rate","median_level_completion_ms",
    "retry_rate","failure_reason_counts","blocked_action_rate",
}

def validate(data: dict) -> None:
    if not isinstance(data, dict): raise ValueError("spec must be object")
    if data.get("schema_version") != "1.0": raise ValueError("schema_version must remain 1.0")
    privacy = data.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != REQUIRED_PRIVACY_FALSE:
        raise ValueError("privacy keys must match bounded v1 contract exactly")
    for key in REQUIRED_PRIVACY_FALSE:
        if privacy.get(key) is not False: raise ValueError(f"privacy.{key} must be false")
    events = data.get("events")
    if not isinstance(events, dict) or set(events) != set(EVENT_FIELDS):
        raise ValueError("event set must match bounded v1 contract exactly")
    for event, required in EVENT_FIELDS.items():
        fields = events[event]
        if not isinstance(fields, list) or len(fields) != len(set(fields)):
            raise ValueError(f"{event}: fields must be unique list")
        actual = set(fields)
        if actual != required:
            raise ValueError(f"{event}: fields must match bounded v1 contract exactly")
        bad = FORBIDDEN & actual
        if bad: raise ValueError(f"{event}: forbidden fields {sorted(bad)}")
    declared_forbidden = data.get("forbidden_fields")
    if not isinstance(declared_forbidden, list) or set(declared_forbidden) != FORBIDDEN or len(declared_forbidden) != len(FORBIDDEN):
        raise ValueError("forbidden_fields must match bounded v1 denylist exactly")
    enums = data.get("enums")
    if not isinstance(enums, dict) or enums != ENUMS:
        raise ValueError("enums must match bounded v1 values exactly")
    constraints = data.get("constraints")
    if not isinstance(constraints, dict) or set(constraints) != CONSTRAINT_KEYS:
        raise ValueError("constraints must cover bounded v1 field set exactly")
    for key, rule in constraints.items():
        if not isinstance(rule, str) or not rule.strip(): raise ValueError(f"constraints.{key} must be non-empty")
    if "ephemeral random token" not in constraints["session_id"] or "never derived" not in constraints["session_id"]:
        raise ValueError("session_id must remain ephemeral and non-derived")
    if "integer >= 0" not in constraints["elapsed_ms"]:
        raise ValueError("elapsed_ms must remain a non-negative integer")
    if "release/rollback manifest identifier" not in constraints["build_id"]:
        raise ValueError("build_id must remain release-manifest bound")
    gate = data.get("activation_gate", "")
    if not isinstance(gate, str) or "disabled" not in gate or "privacy/legal" not in gate:
        raise ValueError("activation_gate must keep collection disabled pending privacy/legal gate")
    metrics = data.get("derived_metrics_only")
    if not isinstance(metrics, list) or len(metrics) != len(set(metrics)) or set(metrics) != METRICS:
        raise ValueError("derived_metrics_only must match bounded v1 aggregate set exactly")

def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else SPEC
    try:
        validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr); return 1
    print("PASS: bounded privacy-minimal telemetry spec", file=sys.stderr); return 0

if __name__ == "__main__": raise SystemExit(main())
