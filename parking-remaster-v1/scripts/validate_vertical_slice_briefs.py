#!/usr/bin/env python3
"""Validate the 14-level Vertical Slice brief contract without authoring gameplay.

This is prerequisite QA only. It does not unlock P1-008/P1-009 or claim human fun.
"""
from __future__ import annotations
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "VERTICAL_SLICE_LEVEL_BRIEFS_V1.json"
SOFT = ("vehicle_count","dependency_depth_moves","initial_legal_choice_count","mean_legal_choices","forced_state_ratio","mean_choice_entropy_bits")

def main() -> int:
    errors=[]
    data=json.loads(PATH.read_text(encoding="utf-8"))
    briefs=data.get("briefs",[])
    ids=[b.get("id") for b in briefs]
    expected=[f"level_{i:03d}" for i in range(1,15)]
    if ids != expected: errors.append(f"brief ids/order must be exactly {expected}")
    if len(set(ids)) != len(ids): errors.append("brief ids must be unique")
    main_count=sum(b.get("track")=="main" for b in briefs)
    hard_count=sum(b.get("track")=="hard" for b in briefs)
    if (main_count,hard_count)!=(12,2): errors.append(f"track counts must be 12 main + 2 hard, got {main_count}+{hard_count}")
    for b in briefs:
        bid=b.get("id")
        soft=b.get("soft",{})
        hard=b.get("hard",{})
        for k in SOFT:
            v=soft.get(k)
            if not isinstance(v,list) or len(v)!=2 or not all(isinstance(x,(int,float)) for x in v) or v[0]>v[1]:
                errors.append(f"{bid}: invalid soft envelope {k}={v!r}")
        if hard.get("novelty_load",0)<0: errors.append(f"{bid}: novelty_load must be >=0")
        if hard.get("hard_fail"):
            if hard.get("required_mechanic")!="shared_exit_conflict": errors.append(f"{bid}: hard_fail requires shared_exit_conflict")
            if hard.get("conflict_group_count",0)<1: errors.append(f"{bid}: hard_fail requires conflict_group_count >=1")
            cm=hard.get("conflict_member_count")
            if not isinstance(cm,list) or len(cm)!=2 or cm[0]<2 or cm[0]>cm[1]: errors.append(f"{bid}: invalid conflict_member_count")
        if hard.get("forbid_mechanic") and hard.get("required_mechanic")==hard.get("forbid_mechanic"):
            errors.append(f"{bid}: same mechanic cannot be required and forbidden")
    l10=next((b for b in briefs if b.get("id")=="level_010"),{})
    if l10.get("hard",{}).get("safe_alternative_min_during_conflict",0)<1:
        errors.append("level_010 must preserve at least one safe alternative during taught conflict")
    rules=data.get("relational_rules",[])
    rule_ids=[r.get("id") for r in rules]
    if len(rule_ids)!=len(set(rule_ids)): errors.append("relational rule ids must be unique")
    for r in rules:
        for key in ("a","b","easier","harder"):
            if key in r and r[key] not in ids: errors.append(f"{r.get('id')}: {key} references unknown brief {r[key]}")
    if errors:
        print("VERTICAL_SLICE_BRIEFS_VALIDATION: FAIL")
        for e in errors: print("-",e)
        return 1
    print("VERTICAL_SLICE_BRIEFS_VALIDATION: PASS")
    print(f"briefs={len(briefs)} main={main_count} hard={hard_count} relational_rules={len(rules)}")
    print("scope=pre-authoring consistency only; no gameplay/human-quality promotion")
    return 0

if __name__=="__main__": sys.exit(main())
