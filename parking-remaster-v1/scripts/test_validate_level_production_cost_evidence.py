#!/usr/bin/env python3
import importlib.util, math
from pathlib import Path

p=Path(__file__).with_name("validate_level_production_cost_evidence.py")
s=importlib.util.spec_from_file_location("v",p); v=importlib.util.module_from_spec(s); s.loader.exec_module(v)

def good(level="L01",run="r1"):
    return {"level_id":level,"authoring_run_id":run,"started_at":"2026-09-22T00:00:00+00:00","finished_at":"2026-09-22T00:10:00+00:00","stage_seconds":{"design":60,"level_data":90,"solver_parity":30,"visual_assembly":90,"qa":60,"human_review_rework":30},"rework_cycles":1,"human_review_seconds":30,"tool_compute_seconds":20,"result":"PASS","content_fingerprint":"a"*64}

def must_fail(r,needle):
    try: v.validate_record(r)
    except (ValueError,TypeError) as e:
        assert needle in str(e),(needle,str(e)); return
    raise AssertionError("expected failure: "+needle)

m=v.validate_record(good()); assert m=={"active":360,"human":330,"automation":50}
r=good(); r["stage_seconds"].pop("qa"); must_fail(r,"canonical stages")
r=good(); r["stage_seconds"]["qa"]=-1; must_fail(r,"invalid stage")
r=good(); r["stage_seconds"]["qa"]=float("nan"); must_fail(r,"invalid stage")
r=good(); r["content_fingerprint"]="ABC"; must_fail(r,"SHA-256")
r=good(); r["finished_at"]="2026-09-21T23:59:00+00:00"; must_fail(r,"precedes")
r=good(); r["finished_at"]="2026-09-22T00:01:00+00:00"; must_fail(r,"exceeds wall")
r=good(); r["started_at"]="2026-09-22T00:00:00"; must_fail(r,"timezone")
r=good(); r["result"]="FUN"; must_fail(r,"invalid result")
r=good(); r["human_review_seconds"]=31; must_fail(r,"human_review_seconds exceeds")
r=good(); r["tool_compute_seconds"]=601; must_fail(r,"tool_compute_seconds exceeds")
r=good(); r["level_id"]=7; must_fail(r,"empty identity")
xs=[100,200,300,400,500]
assert v.pct(xs,.5)==300 and v.pct(xs,.9)==460
batch=[good(f"L{i}",f"r{i}") for i in range(1,6)]
out=v.validate_batch(batch); assert out["median_active_production_seconds"]==360 and out["p90_active_production_seconds"]==360
try: v.validate_batch(batch[:4])
except ValueError as e: assert "5 distinct" in str(e)
else: raise AssertionError("expected underfilled batch failure")
print("PASS: production cost evidence validator regressions")
