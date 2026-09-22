#!/usr/bin/env python3
import argparse, hashlib, json, math
from datetime import datetime
from pathlib import Path

STAGES = ("design","level_data","solver_parity","visual_assembly","qa","human_review_rework")
RESULTS = {"PASS","REWORK","REJECTED"}

def iso(s):
    if not isinstance(s,str): raise ValueError("timestamp must be string")
    return datetime.fromisoformat(s.replace("Z","+00:00"))

def sha(s): return isinstance(s,str) and len(s)==64 and all(c in "0123456789abcdef" for c in s)
def pct(xs,p):
    xs=sorted(xs); k=(len(xs)-1)*p; lo=math.floor(k); hi=math.ceil(k)
    return xs[lo] if lo==hi else xs[lo]+(xs[hi]-xs[lo])*(k-lo)

def validate_record(r):
    req=("level_id","authoring_run_id","started_at","finished_at","stage_seconds","rework_cycles","human_review_seconds","tool_compute_seconds","result","content_fingerprint")
    missing=[k for k in req if k not in r]
    if missing: raise ValueError("missing fields: "+",".join(missing))
    if not r["level_id"] or not r["authoring_run_id"]: raise ValueError("empty identity")
    start,end=iso(r["started_at"]),iso(r["finished_at"])
    if end < start: raise ValueError("finished_at precedes started_at")
    st=r["stage_seconds"]
    if set(st)!=set(STAGES): raise ValueError("stage_seconds must contain exactly canonical stages")
    if any(not isinstance(v,(int,float)) or isinstance(v,bool) or v<0 for v in st.values()): raise ValueError("invalid stage seconds")
    if not isinstance(r["rework_cycles"],int) or isinstance(r["rework_cycles"],bool) or r["rework_cycles"]<0: raise ValueError("invalid rework_cycles")
    for k in ("human_review_seconds","tool_compute_seconds"):
        if not isinstance(r[k],(int,float)) or isinstance(r[k],bool) or r[k]<0: raise ValueError("invalid "+k)
    if r["result"] not in RESULTS: raise ValueError("invalid result")
    if not sha(r["content_fingerprint"]): raise ValueError("content_fingerprint must be lowercase SHA-256")
    active=sum(st.values())
    wall=(end-start).total_seconds()
    if active > wall + 1e-6: raise ValueError("active production time exceeds wall clock")
    return active

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("evidence"); ap.add_argument("--batch",action="store_true"); a=ap.parse_args()
    data=json.loads(Path(a.evidence).read_text())
    records=data if isinstance(data,list) else [data]
    if not records: raise SystemExit("FAIL: empty evidence")
    active=[]; seen=set()
    try:
        for r in records:
            key=(r.get("level_id"),r.get("authoring_run_id"))
            if key in seen: raise ValueError("duplicate level/run identity")
            seen.add(key); active.append(validate_record(r))
        if a.batch:
            levels={r["level_id"] for r in records}; passed={r["level_id"] for r in records if r["result"]=="PASS"}
            if len(levels)<5 or len(passed)<5: raise ValueError("batch requires >=5 distinct levels and >=5 passed levels")
            out={"median_active_production_seconds":pct(active,.5),"p90_active_production_seconds":pct(active,.9),"median_rework_cycles":pct([r["rework_cycles"] for r in records],.5)}
            print(json.dumps(out,sort_keys=True))
        else: print("PASS")
    except (ValueError,TypeError) as e: raise SystemExit("FAIL: "+str(e))
if __name__=="__main__": main()
