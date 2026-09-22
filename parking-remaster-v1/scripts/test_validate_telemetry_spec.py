#!/usr/bin/env python3
from __future__ import annotations
import copy, json
from validate_telemetry_spec import SPEC, validate

def must_fail(data, label):
    try: validate(data)
    except ValueError: return
    raise AssertionError(label + " unexpectedly passed")

def main():
    base = json.loads(SPEC.read_text(encoding="utf-8"))
    validate(base)
    x = copy.deepcopy(base); x["privacy"]["persistent_user_id"] = True; must_fail(x, "persistent id")
    x = copy.deepcopy(base); x["privacy"]["cohort_id"] = False; must_fail(x, "unknown privacy field")
    x = copy.deepcopy(base); x["events"]["vehicle_action"].append("ip"); must_fail(x, "ip field")
    x = copy.deepcopy(base); x["events"]["vehicle_action"].append("screen_width"); must_fail(x, "undeclared event field")
    x = copy.deepcopy(base); del x["events"]["retry"]; must_fail(x, "missing event")
    x = copy.deepcopy(base); x["events"]["failure"].remove("elapsed_ms"); must_fail(x, "missing elapsed")
    x = copy.deepcopy(base); x["enums"]["session_end.reason"].append("background_timeout"); must_fail(x, "enum expansion")
    x = copy.deepcopy(base); x["enums"]["vehicle_action.result"] = ["moved"]; must_fail(x, "enum contraction")
    x = copy.deepcopy(base); del x["constraints"]["session_id"]; must_fail(x, "missing session constraint")
    x = copy.deepcopy(base); x["constraints"]["session_id"] = "persistent UUID"; must_fail(x, "persistent session token")
    x = copy.deepcopy(base); x["constraints"]["build_id"] = "arbitrary string"; must_fail(x, "unbound build id")
    x = copy.deepcopy(base); x["derived_metrics_only"].append("device_retention_score"); must_fail(x, "metric expansion")
    x = copy.deepcopy(base); x["forbidden_fields"].remove("user_agent"); must_fail(x, "denylist contraction")
    x = copy.deepcopy(base); x["activation_gate"] = "enabled"; must_fail(x, "activation bypass")
    x = copy.deepcopy(base); x["schema_version"] = "1.1"; must_fail(x, "silent schema version drift")
    print("PASS: telemetry validator rejects privacy/schema/enum/constraint/metric/activation regressions")

if __name__ == "__main__": main()
