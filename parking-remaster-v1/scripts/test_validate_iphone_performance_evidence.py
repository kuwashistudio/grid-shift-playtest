#!/usr/bin/env python3
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_iphone_performance_evidence import validate
contract = json.loads((ROOT / "qa" / "IPHONE_PERFORMANCE_EVIDENCE_CONTRACT_V1.json").read_text(encoding="utf-8"))
base = {
  "device_model":"target iPhone", "ios_version":"test-version", "safari_version_or_user_agent":"Mobile Safari test",
  "candidate_commit":"a"*40, "measurement_started_at":"2026-09-23T00:00:00Z", "visibility_cycle_observed":True,
  "metrics":{"first_control_available_ms":700,"frame_interval_p50_ms":16.7,"frame_interval_p95_ms":20,"frame_interval_p99_ms":35,"worst_frame_interval_ms":80,"frame_sample_count":600,"visibility_pause_resume_pass":True}
}
assert validate(base, contract) == []

def rejected(mutator, phrase):
    d = copy.deepcopy(base); mutator(d); errs = validate(d, contract)
    assert errs and any(phrase in e for e in errs), (phrase, errs)

rejected(lambda d: d["metrics"].__setitem__("frame_sample_count", 299), "frame_sample_count")
rejected(lambda d: d["metrics"].__setitem__("first_control_available_ms", 1001), "exceeds")
rejected(lambda d: d["metrics"].__setitem__("frame_interval_p95_ms", 26), "exceeds")
rejected(lambda d: d["metrics"].__setitem__("frame_interval_p99_ms", 51), "exceeds")
rejected(lambda d: d["metrics"].__setitem__("worst_frame_interval_ms", 101), "exceeds")
rejected(lambda d: d["metrics"].__setitem__("visibility_pause_resume_pass", False), "visibility_pause_resume")
rejected(lambda d: d.__setitem__("visibility_cycle_observed", False), "visibility cycle")
rejected(lambda d: d.__setitem__("candidate_commit", "short"), "40-hex")
rejected(lambda d: d["metrics"].__setitem__("frame_interval_p50_ms", 30), "monotonic")
rejected(lambda d: d["metrics"].pop("frame_interval_p99_ms"), "missing metric")
print("PASS: iPhone performance evidence validator rejects undersampling, threshold failures, malformed provenance, visibility failures, and impossible percentile ordering")
