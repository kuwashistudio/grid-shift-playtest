#!/usr/bin/env python3
"""Validate future Parking telemetry session evidence against bounded v1 spec."""
from __future__ import annotations
import json, sys
from pathlib import Path
from validate_telemetry_spec import EVENT_FIELDS, ENUMS, FORBIDDEN


def _walk_forbidden(value, path="$"):
    if isinstance(value, dict):
        for k, v in value.items():
            if k in FORBIDDEN:
                raise ValueError(f"forbidden field {k} at {path}")
            _walk_forbidden(v, f"{path}.{k}")
    elif isinstance(value, list):
        for i, v in enumerate(value):
            _walk_forbidden(v, f"{path}[{i}]")


def validate(data: dict) -> None:
    if not isinstance(data, dict) or data.get("schema_version") != "1.0":
        raise ValueError("evidence schema_version must be 1.0")
    status = data.get("status")
    if status not in {"CAPTURED", "COMPLETE"}:
        raise ValueError("status must be CAPTURED or COMPLETE")
    events = data.get("events")
    if not isinstance(events, list) or not events:
        raise ValueError("events must be non-empty list")
    _walk_forbidden(data)
    if events[0].get("type") != "session_start":
        raise ValueError("session_start must be first")
    if sum(e.get("type") == "session_start" for e in events) != 1:
        raise ValueError("session_start must occur exactly once")
    end_count = sum(e.get("type") == "session_end" for e in events)
    if end_count > 1:
        raise ValueError("session_end may occur at most once")
    if any(e.get("type") == "session_end" for e in events[:-1]):
        raise ValueError("session_end must be last")
    if status == "COMPLETE" and end_count != 1:
        raise ValueError("COMPLETE evidence must end with session_end")
    if status == "CAPTURED" and end_count:
        raise ValueError("CAPTURED evidence must not already contain session_end")
    if sum(e.get("type") == "first_action" for e in events) > 1:
        raise ValueError("first_action may occur at most once")
    if sum(e.get("type") == "level_complete" for e in events) > 1:
        raise ValueError("level_complete may occur at most once")

    session_id = events[0].get("session_id")
    level_id = events[0].get("level_id")
    build_id = events[0].get("build_id")
    if not all(isinstance(x, str) and x.strip() for x in (session_id, level_id, build_id)):
        raise ValueError("session_start provenance IDs must be non-empty strings")

    elapsed = -1
    seen_first = False
    open_failure = False
    action_count = 0
    retry_count = 0
    complete_event = None
    end_reason = None
    post_first = {"vehicle_action", "failure", "retry", "level_complete"}
    for i, e in enumerate(events):
        if not isinstance(e, dict):
            raise ValueError(f"event[{i}] must be object")
        typ = e.get("type")
        if typ not in EVENT_FIELDS:
            raise ValueError(f"unknown event type {typ}")
        expected = EVENT_FIELDS[typ] | {"type"}
        if set(e) != expected:
            raise ValueError(f"{typ}: fields must exactly match telemetry spec")
        if e["session_id"] != session_id or e["level_id"] != level_id:
            raise ValueError("session/level provenance drift")
        ms = e["elapsed_ms"]
        if not isinstance(ms, int) or isinstance(ms, bool) or ms < 0 or ms < elapsed:
            raise ValueError("elapsed_ms must be monotonic non-negative integer")
        elapsed = ms

        if typ == "first_action":
            seen_first = True
        elif typ in post_first and not seen_first:
            raise ValueError(f"{typ} cannot precede first_action")

        if typ == "vehicle_action":
            action_count += 1
        elif typ == "failure":
            if open_failure:
                raise ValueError("failure cannot repeat before retry")
            open_failure = True
        elif typ == "retry":
            if not open_failure:
                raise ValueError("retry requires a preceding unresolved failure")
            open_failure = False
            retry_count += 1
        elif typ == "level_complete":
            if open_failure:
                raise ValueError("level_complete cannot occur while failure is unresolved")
            complete_event = e
        elif typ == "session_end":
            end_reason = e["reason"]

        for enum_key, allowed in ENUMS.items():
            ev, field = enum_key.split(".")
            if typ == ev and e[field] not in allowed:
                raise ValueError(f"{enum_key}: invalid value")

    if complete_event:
        if complete_event["actions"] != action_count:
            raise ValueError("level_complete.actions must equal observed vehicle_action count")
        if complete_event["retries"] != retry_count:
            raise ValueError("level_complete.retries must equal observed retry count")
    if end_reason == "complete" and complete_event is None:
        raise ValueError("session_end complete requires level_complete")
    if complete_event is not None and end_reason not in {None, "complete"}:
        raise ValueError("completed level cannot end as abandon/page_hidden")
    if status == "COMPLETE" and open_failure and end_reason == "complete":
        raise ValueError("complete session cannot end with unresolved failure")
    if data.get("numeric_pass_is_human_quality_pass") is not False:
        raise ValueError("numeric evidence must not claim Human quality PASS")


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_telemetry_evidence.py evidence.json", file=sys.stderr)
        return 2
    try:
        validate(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print("PASS: telemetry session evidence", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
