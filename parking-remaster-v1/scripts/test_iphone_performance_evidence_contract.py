#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "qa" / "IPHONE_PERFORMANCE_EVIDENCE_CONTRACT_V1.json"
d = json.loads(P.read_text(encoding="utf-8"))
assert d["status"] == "PREPARATION_ONLY_COLLECTION_DISABLED"
m = d["measurement"]
assert m["device_required"] == "physical_target_iPhone"
assert m["browser_required"] == "Safari"
assert m["visible_only"] is True
assert m["minimum_active_window_ms"] >= 10000
assert m["minimum_frame_samples"] >= 300
assert m["exclude_visibility_transition_windows"] is True
assert m["visibility_event_required"] == "visibilitychange"
t = d["thresholds"]
assert t["first_control_available_ms_max"] <= 1000
assert t["frame_interval_p95_ms_max"] <= 25
assert t["frame_interval_p99_ms_max"] <= 50
assert t["worst_frame_interval_ms_max"] <= 100
assert t["visibility_pause_resume_required"] is True
required = set(d["required_metrics"])
for k in ("first_control_available_ms", "frame_interval_p95_ms", "frame_interval_p99_ms", "worst_frame_interval_ms", "frame_sample_count", "visibility_pause_resume_pass"):
    assert k in required
assert d["optional_metrics"]["long_task_count"] == "OPTIONAL_ONLY_WHEN_SUPPORTED"
guards = " ".join(d["guardrails"])
for phrase in ("fixed 60 Hz", "hidden/background", "timestamps/delta time", "Long Tasks API", "does not establish fun", "evidence preparation only"):
    assert phrase in guards
print("PASS: target-iPhone performance evidence contract is finite, visibility-aware, refresh-rate-safe, and preparation-only")
