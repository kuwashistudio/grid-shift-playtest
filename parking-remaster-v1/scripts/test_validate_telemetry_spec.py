#!/usr/bin/env python3
from __future__ import annotations
import copy, json, tempfile
from pathlib import Path
from validate_telemetry_spec import SPEC, validate

def must_fail(data, label):
    try: validate(data)
    except ValueError: return
    raise AssertionError(label + " unexpectedly passed")

def main():
    base = json.loads(SPEC.read_text(encoding="utf-8"))
    validate(base)
    x = copy.deepcopy(base); x["privacy"]["persistent_user_id"] = True; must_fail(x, "persistent id")
    x = copy.deepcopy(base); x["events"]["vehicle_action"].append("ip"); must_fail(x, "ip field")
    x = copy.deepcopy(base); del x["events"]["retry"]; must_fail(x, "missing event")
    x = copy.deepcopy(base); x["events"]["failure"].remove("elapsed_ms"); must_fail(x, "missing elapsed")
    x = copy.deepcopy(base); x["activation_gate"] = "enabled"; must_fail(x, "activation bypass")
    print("PASS: telemetry validator rejects privacy/schema/activation regressions")

if __name__ == "__main__": main()
