#!/usr/bin/env python3
import copy, json
from pathlib import Path
from validate_release_rollback_manifest import validate

ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / "qa" / "RELEASE_ROLLBACK_MANIFEST_SPEC_V1.json").read_text())
GOOD = {
 "manifest_version":"1.0","release_id":"parking-remaster-20260921-prep","source_commit":"0"*40,
 "source_branch":"parking-remaster-v1-staging-20260917","build_profile":"iphone-html5",
 "level_library_fingerprint":"sha256:"+"1"*64,"asset_manifest_fingerprint":"sha256:"+"2"*64,
 "qa_evidence":[{"name":"fixture","status":"PASS","evidence_ref":"qa/fixture.json"}],
 "rollback":{"known_good_commit":"3"*40,"known_good_release_id":"parking-remaster-20260920-known-good","procedure_ref":"qa/ROLLBACK.md"},
 "authorization":{"release_gate":"NOT_OPEN","human_release_approved":False}
}

def must_fail(mutator, publishing=False, production_started=False):
    d=copy.deepcopy(GOOD); mutator(d)
    try: validate(d,spec,publishing,production_started)
    except (ValueError,KeyError,TypeError): return
    raise AssertionError("expected fail-closed rejection")

validate(GOOD,spec)
must_fail(lambda d:d.pop("source_commit"))
must_fail(lambda d:d.__setitem__("source_commit","main"))
must_fail(lambda d:d.__setitem__("source_branch","main"))
must_fail(lambda d:d.__setitem__("level_library_fingerprint","unknown"))
must_fail(lambda d:d.__setitem__("qa_evidence",[]))
must_fail(lambda d:d["qa_evidence"][0].__setitem__("status","PENDING"))
must_fail(lambda d:d["rollback"].__setitem__("known_good_commit","HEAD"))
must_fail(lambda d:None,publishing=True,production_started=False)
must_fail(lambda d:d["authorization"].update({"release_gate":"P8-001","human_release_approved":False}),publishing=True,production_started=True)
APPROVED=copy.deepcopy(GOOD); APPROVED["authorization"]={"release_gate":"P8-001","human_release_approved":True}
validate(APPROVED,spec,publishing=True,production_started=True)
print("PASS: release/rollback manifest fail-closed regression suite")
