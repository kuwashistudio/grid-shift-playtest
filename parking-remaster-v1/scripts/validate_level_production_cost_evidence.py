#!/usr/bin/env python3
import argparse, json, math
from datetime import datetime
from pathlib import Path

STAGES = ("design","level_data","solver_parity","visual_assembly","qa","human_review_rework")
RESULTS = {"PASS","REWORK","REJECTED"}
HUMAN_STAGES = ("design","level_data","visual_assembly","qa","human_review_rework")

def iso(s):
    if not isinstance(s,str): raise ValueError("timestamp must be string")
    d=datetime.fromisoformat(s.replace("Z","+00:00"))
    if d.tzinfo is None: raise ValueError("timestamp must include timezone")
    return d

def sha(s): return isinstance(s,str) and len(s)==64 and all(c in "0123456789abcdef" for c in s)
def number(v): return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) and v>=0
def pct(xs,p):
    xs=sorted(xs); k=(len(xs)-1)*p; lo=math.floor(k); hi=math.ceil(k)
    return xs[lo] if lo==hi else xs[lo]+(xs[hi]-xs[lo])*(k-lo)

def validate_record(r):
    req=("level_id","authoring_run_id","started_at","finished_at","stage_seconds","rework_cycles","human_review_seconds","tool_compute_seconds","result","content_fingerprint")
    missing=[k for k in req if k not in r]
    if missing: raise ValueError("missing fields: "+",".join(missing))
    if not isinstance(r["level_id"],str) or not r["level_id"].strip() or not isinstance(r["authoring_run_id"],str) or not r["authoring_run_id"].strip(): raise ValueError("empty identity")
    start,end=iso(r["started_at"]),iso(r["finished_at"])
    if end < start: raise ValueError("finished_at precedes started_at")
    st=r["stage_seconds"]
    if not isinstance(st,dict) or set(st)!=set(STAGES): raise ValueError("stage_seconds must contain exactly canonical stages")
    if any(not number(v) for v in st.values()): raise ValueError("invalid stage seconds")
    if not isinstance(r["rework_cycles"],int) or isinstance(r["rework_cycles"],bool) or r["rework_cycles"]<0: raise ValueError("invalid rework_cycles")
    for k in ("human_review_seconds","tool_compute_seconds"):
        if not number(r[k]): raise ValueError("invalid "+k)
    if r["result"] not in RESULTS: raise ValueError("invalid result")
    if not sha(r["content_fingerprint"]): raise ValueError("content_fingerprint must be lowercase SHA-256")
    active=sum(st.values())
    wall=(end-start).total_seconds()
    if active > wall + 1e-6: raise ValueError("active production time exceeds wall clock")
    human_stage=sum(st[k] for k in HUMAN_STAGES)
    if r["human_review_seconds"] > st["human_review_rework"] + 1e-6: raise ValueError("human_review_seconds exceeds human_review_rework stage")
    if r["tool_compute_seconds"] > wall + 1e-6: raise ValueError("tool_compute_seconds exceeds wall clock")
    return {"active":active,"human":human_stage,"automation":st["solver_parity"]+r["tool_compute_seconds"]}

def validate_batch(records):
    seen=set(); metrics=[]
    for r in records:
        key=(r.get("level_id"),r.get("authoring_run_id"))
        if key in seen: raise ValueError("duplicate level/run identity")
        seen.add(key); metrics.append(validate_record(r))
    levels={r["level_id"] for r in records}; passed={r["level_id"] for r in records if r["result"]=="PASS"}
    if len(levels)<5 or len(passed)<5: raise ValueError("batch requires >=5 distinct levels and >=5 passed levels")
    return {"median_active_production_seconds":pct([m["active"] for m in metrics],.5),"p90_active_production_seconds":pct([m["active"] for m in metrics],.9),"median_rework_cycles":pct([r["rework_cycles"] for r in records],.5)}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("evidence"); ap.add_argument("--batch",action="store_true"); a=ap.parse_args()
    data=json.loads(Path(a.evidence).read_text()); records=data if isinstance(data,list) else [data]
    if not records: raise SystemExit("FAIL: empty evidence")
    try:
        if a.batch: print(json.dumps(validate_batch(records),sort_keys=True))
        else:
            seen=set()
            for r in records:
                key=(r.get("level_id"),r.get("authoring_run_id"))
                if key in seen: raise ValueError("duplicate level/run identity")
                seen.add(key); validate_record(r)
            print("PASS")
    except (ValueError,TypeError) as e: raise SystemExit("FAIL: "+str(e))
if __name__=="__main__": main()
