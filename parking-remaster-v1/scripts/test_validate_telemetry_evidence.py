#!/usr/bin/env python3
from copy import deepcopy
from validate_telemetry_evidence import validate

BASE={"schema_version":"1.0","status":"COMPLETE","numeric_pass_is_human_quality_pass":False,"events":[
 {"type":"session_start","session_id":"s1","level_id":"L1","build_id":"b1","elapsed_ms":0},
 {"type":"first_action","session_id":"s1","level_id":"L1","vehicle_id":"c1","elapsed_ms":120},
 {"type":"vehicle_action","session_id":"s1","level_id":"L1","vehicle_id":"c1","result":"moved","elapsed_ms":121},
 {"type":"level_complete","session_id":"s1","level_id":"L1","actions":1,"retries":0,"elapsed_ms":900},
 {"type":"session_end","session_id":"s1","level_id":"L1","reason":"complete","elapsed_ms":901}
]}

def must_fail(mut):
    d=deepcopy(BASE); mut(d)
    try: validate(d)
    except ValueError: return
    raise AssertionError("fixture unexpectedly passed")

validate(deepcopy(BASE))
must_fail(lambda d:d["events"][1].update({"email":"x@example.invalid"}))
must_fail(lambda d:d["events"].__setitem__(1,d["events"][2]))
must_fail(lambda d:d["events"][2].update({"elapsed_ms":10}))
must_fail(lambda d:d["events"][2].update({"result":"teleported"}))
must_fail(lambda d:d["events"][2].update({"session_id":"other"}))
must_fail(lambda d:d.update({"numeric_pass_is_human_quality_pass":True}))
must_fail(lambda d:d["events"].insert(1,{"type":"retry","session_id":"s1","level_id":"L1","elapsed_ms":20}))
print("PASS: telemetry evidence validator regression suite")
