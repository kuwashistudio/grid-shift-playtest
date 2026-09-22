#!/usr/bin/env python3
import copy, json, importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("audit", HERE / "validate_vertical_slice_cross_contract.py")
audit = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(audit)
beat = audit.load(audit.BEAT); briefs = audit.load(audit.BRIEFS)
assert audit.validate(beat, briefs) == [], audit.validate(beat, briefs)

cases = []
def bad(name, mutate):
    b, q = copy.deepcopy(beat), copy.deepcopy(briefs); mutate(b, q)
    assert audit.validate(b, q), f"negative fixture unexpectedly passed: {name}"
    cases.append(name)

bad("role drift", lambda b,q: q["briefs"][5].__setitem__("role", "challenge"))
bad("hard_fail drift", lambda b,q: q["briefs"][9]["hard"].__setitem__("hard_fail", False))
bad("novelty drift", lambda b,q: q["briefs"][9]["hard"].__setitem__("novelty_load", 0))
bad("hidden required mechanic", lambda b,q: b["levels"][10].__setitem__("practice", []))
bad("forbidden mechanic leak", lambda b,q: b["levels"][12].__setitem__("practice", ["shared_exit_conflict"]))
bad("peak introduces mechanic", lambda b,q: b["levels"][7].__setitem__("new_mechanics", ["surprise_rule"]))
bad("peak loses recovery", lambda b,q: b["levels"][8].__setitem__("recovery", False))
bad("L10 mandatory waiting", lambda b,q: q["briefs"][9]["hard"].__setitem__("safe_alternative_min_during_conflict", 0))
bad("L10 multiple conflict groups", lambda b,q: q["briefs"][9]["hard"].__setitem__("conflict_group_count", 2))
print(f"PASS: cross-contract baseline plus {len(cases)} negative regressions")
