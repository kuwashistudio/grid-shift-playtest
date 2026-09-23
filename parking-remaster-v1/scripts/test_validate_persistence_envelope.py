#!/usr/bin/env python3
"""Regression tests for deterministic persistence envelope validation."""
import copy, importlib.util, json, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("validator", HERE / "validate_persistence_envelope.py")
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

BASE = {
    "schema_version": "1.0",
    "content_version": "preproduction-fixture-v1",
    "level_id": "fixture_level_001",
    "level_state": {"accepted_action_index": 3, "cleared_vehicle_ids": ["car_a"]},
    "updated_at": "2026-09-23T10:00:00Z"
}
KNOWN = {"fixture_level_001"}

def must_pass(obj):
    e = v.validate(obj, known_levels=KNOWN, content_version="preproduction-fixture-v1")
    assert not e, e

def must_fail(obj, needle):
    e = v.validate(obj, known_levels=KNOWN, content_version="preproduction-fixture-v1")
    assert e and any(needle in x for x in e), (needle, e)

must_pass(copy.deepcopy(BASE))
for field in sorted(v.REQUIRED):
    x = copy.deepcopy(BASE); x.pop(field); must_fail(x, "missing required fields")
x = copy.deepcopy(BASE); x["schema_version"] = "999"; must_fail(x, "unsupported schema_version")
x = copy.deepcopy(BASE); x["content_version"] = "stale"; must_fail(x, "stale content_version")
x = copy.deepcopy(BASE); x["level_id"] = "unknown"; must_fail(x, "unknown level_id")
x = copy.deepcopy(BASE); x["level_state"] = []; must_fail(x, "level_state must be an object")
for field in sorted(v.FORBIDDEN):
    x = copy.deepcopy(BASE); x[field] = "leak"; must_fail(x, "forbidden transient fields")

# Recovery must be deterministic: validation cannot mutate persisted state.
x = copy.deepcopy(BASE); before = json.dumps(x, sort_keys=True); must_pass(x); assert json.dumps(x, sort_keys=True) == before
print("PASS: persistence envelope validator fails closed across corruption/staleness/transient-state matrix")
