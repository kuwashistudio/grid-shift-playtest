#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "qa" / "P1_009_HUMAN_EVIDENCE_CONTRACT_V1.json"
data = json.loads(path.read_text())

assert data["gate"] == "P1-009"
assert data["status"] == "PREPARATION_ONLY"
assert data["prerequisites"] == ["P1-008 PASS", "rebuilt Level 1 candidate exists"]
assert data["required_sessions"]["minimum_fresh_players"] >= 3
assert data["required_sessions"]["target_device_family"] == "physical iPhone"
assert data["required_sessions"]["developer_coaching"] == "forbidden before first useful action"
assert data["hard_technical_bounds"]["first_control_available_ms_max"] <= 1000
assert data["hard_technical_bounds"]["retry_to_playable_ms_target_max"] <= 1500
assert data["hard_technical_bounds"]["solver_runtime_parity_required"] is True
assert data["hard_technical_bounds"]["visible_movement_runtime_evidence_required"] is True
required = set(data["required_observations_per_session"])
for field in {
    "prototype_commit", "first_control_available_ms", "first_useful_action_ms",
    "first_useful_action_without_explanation", "visible_rule_explanation_after_play",
    "failure_cause_explanation_if_failure_seen", "retry_to_playable_ms_if_retry_used"
}:
    assert field in required, field
limits = " ".join(data["automation_limits"])
assert "must not mark P1-009 PASS" in limits
assert "do not substitute" in limits
assert data["storage_policy"]["avoid_pii"] is True
print("P1-009 human evidence contract: PASS (preparation only; no human gate advanced)")
