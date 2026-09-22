#!/usr/bin/env python3
import importlib.util
from pathlib import Path

p=Path(__file__).with_name("validate_level_production_cost_evidence.py")
s=importlib.util.spec_from_file_location("v",p); v=importlib.util.module_from_spec(s); s.loader.exec_module(v)

def good(level="L01",run="r1"):
    return {"level_id":level,"authoring_run_id":run,"started_at":"2026-09-22T00:00:00+00:00","finished_at":"2026-09-22T00:10:00+00:00","stage_seconds":{"design":60,"level_data":90,"solver_parity":30,"visual_assembly":90,"qa":60,"human_review_rework":30},"rework_cycles":1,"human_review_seconds":30,"tool_compute_seconds":20,"result":"PASS","content_fingerprint":"a"*64}

def must_fail(r,needle):
    try: v.validate_record(r)
    except ValueError as e:
        assert needle in str(e),(needle,str(e)); return
    raise AssertionError("expected failure: "+needle)

assert v.validate_record(good())==360
r=good(); r["stage_seconds"].pop("qa"); must_fail(r,"canonical stages")
r=good(); r["stage_seconds"]["qa"]=-1; must_fail(r,"invalid stage")
r=good(); r["content_fingerprint"]="ABC"; must_fail(r,"SHA-256")
r=good(); r["finished_at"]="2026-09-21T23:59:00+00:00"; must_fail(r,"precedes")
r=good(); r["finished_at"]="2026-09-22T00:01:00+00:00"; must_fail(r,"exceeds wall")
r=good(); r["result"]="FUN"; must_fail(r,"invalid result")
xs=[100,200,300,400,500]
assert v.pct(xs,.5)==300 and v.pct(xs,.9)==460
print("PASS: production cost evidence validator regressions")
