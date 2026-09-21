#!/usr/bin/env python3
"""Fail-closed validator for the pre-production Parking telemetry contract."""
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "qa" / "TELEMETRY_SPEC_V1.json"
REQUIRED_EVENTS = {"session_start","first_action","vehicle_action","failure","retry","level_complete","session_end"}
REQUIRED_PRIVACY_FALSE = {"persistent_user_id","advertising_id","precise_location","free_text","raw_input_stream"}
FORBIDDEN = {"name","email","phone","address","ip","latitude","longitude","advertising_id","device_fingerprint","user_agent","free_text"}
COMMON = {"session_id","level_id","elapsed_ms"}

def validate(data: dict) -> None:
    if not isinstance(data, dict): raise ValueError("spec must be object")
    privacy = data.get("privacy")
    if not isinstance(privacy, dict): raise ValueError("privacy object required")
    for key in REQUIRED_PRIVACY_FALSE:
        if privacy.get(key) is not False: raise ValueError(f"privacy.{key} must be false")
    events = data.get("events")
    if not isinstance(events, dict) or set(events) != REQUIRED_EVENTS:
        raise ValueError("event set must match bounded v1 contract exactly")
    for event, fields in events.items():
        if not isinstance(fields, list) or len(fields) != len(set(fields)):
            raise ValueError(f"{event}: fields must be unique list")
        missing = COMMON - set(fields)
        if missing: raise ValueError(f"{event}: missing common fields {sorted(missing)}")
        bad = FORBIDDEN & set(fields)
        if bad: raise ValueError(f"{event}: forbidden fields {sorted(bad)}")
    declared_forbidden = set(data.get("forbidden_fields", []))
    if not FORBIDDEN <= declared_forbidden: raise ValueError("forbidden_fields incomplete")
    gate = data.get("activation_gate", "")
    if "disabled" not in gate or "privacy/legal" not in gate:
        raise ValueError("activation_gate must keep collection disabled pending privacy/legal gate")
    metrics = data.get("derived_metrics_only")
    if not isinstance(metrics, list) or not metrics: raise ValueError("derived_metrics_only required")

def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else SPEC
    try:
        validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr); return 1
    print("PASS: bounded privacy-minimal telemetry spec", file=sys.stderr); return 0

if __name__ == "__main__": raise SystemExit(main())
