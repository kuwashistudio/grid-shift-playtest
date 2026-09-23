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

FAIL_RETRY={"schema_version":"1.0","status":"COMPLETE","numeric_pass_is_human_quality_pass":False,"events":[
 {"type":"session_start","session_id":"s2","level_id":"L1","build_id":"b1","elapsed_ms":0},
 {"type":"first_action","session_id":"s2","level_id":"L1","vehicle_id":"c1","elapsed_ms":100},
 {"type":"vehicle_action","session_id":"s2","level_id":"L1","vehicle_id":"c1","result":"moved","elapsed_ms":101},
 {"type":"failure","session_id":"s2","level_id":"L1","reason":"shared_exit_conflict","elapsed_ms":300},
 {"type":"retry","session_id":"s2","level_id":"L1","elapsed_ms":500},
 {"type":"vehicle_action","session_id":"s2","level_id":"L1","vehicle_id":"c1","result":"moved","elapsed_ms":600},
 {"type":"level_complete","session_id":"s2","level_id":"L1","actions":2,"retries":1,"elapsed_ms":900},
 {"type":"session_end","session_id":"s2","level_id":"L1","reason":"complete","elapsed_ms":901}
]}

def must_fail(base, mut):
    d=deepcopy(base); mut(d)
    try: validate(d)
    except ValueError: return
    raise AssertionError("fixture unexpectedly passed")

validate(deepcopy(BASE))
validate(deepcopy(FAIL_RETRY))
must_fail(BASE, lambda d:d["events"][1].update({"email":"x@example.invalid"}))
must_fail(BASE, lambda d:d["events"].__setitem__(1,d["events"][2]))
must_fail(BASE, lambda d:d["events"][2].update({"elapsed_ms":10}))
must_fail(BASE, lambda d:d["events"][2].update({"result":"teleported"}))
must_fail(BASE, lambda d:d["events"][2].update({"session_id":"other"}))
must_fail(BASE, lambda d:d.update({"numeric_pass_is_human_quality_pass":True}))
must_fail(BASE, lambda d:d["events"].insert(1,{"type":"retry","session_id":"s1","level_id":"L1","elapsed_ms":20}))
must_fail(BASE, lambda d:d["events"].pop())
must_fail(BASE, lambda d:d.update({"status":"CAPTURED"}))
must_fail(BASE, lambda d:d["events"][3].update({"actions":2}))
must_fail(BASE, lambda d:d["events"][3].update({"retries":1}))
must_fail(BASE, lambda d:d["events"].__setitem__(-1,{"type":"session_end","session_id":"s1","level_id":"L1","reason":"abandon","elapsed_ms":901}))
must_fail(FAIL_RETRY, lambda d:d["events"].pop(4))
must_fail(FAIL_RETRY, lambda d:d["events"].insert(4,deepcopy(d["events"][3])))
must_fail(FAIL_RETRY, lambda d:d["events"][6].update({"retries":0}))

captured=deepcopy(BASE)
captured["status"]="CAPTURED"
captured["events"].pop()
captured["events"].pop()
validate(captured)
print("PASS: telemetry evidence validator regression suite")
