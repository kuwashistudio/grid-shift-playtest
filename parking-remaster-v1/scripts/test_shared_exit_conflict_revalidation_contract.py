#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "qa" / "SHARED_EXIT_CONFLICT_REVALIDATION_CONTRACT_V1.json"
BRIEFS = ROOT / "VERTICAL_SLICE_LEVEL_BRIEFS_V1.json"
GATES = ROOT / "project-state" / "GATES.json"

c = json.loads(CONTRACT.read_text())
b = json.loads(BRIEFS.read_text())
g = json.loads(GATES.read_text())

assert c["status"] == "PREPARATION_ONLY_REVALIDATION_REQUIRED"
assert c["mechanic"] == "shared_exit_conflict"
assert c["prerequisites"]["p1_008_status_required"] == "PASS"
assert c["prerequisites"]["p1_009_status_required_before_vertical_slice_authoring"] == "PASS"
assert c["prerequisites"]["legacy_geometry_reuse_allowed"] is False

behavior = c["behavioral_acceptance"]
for key in (
    "conflict_zone_visible_before_action",
    "conflict_trigger_deterministic",
    "no_rng",
    "no_hidden_ray_blocker",
    "no_shared_bezier_exit_mismatch",
    "player_action_attributable",
    "fresh_player_can_explain_failure_after_one_exposure",
):
    assert behavior[key] is True, key
assert behavior["retry_target_ms_max"] <= 1500

required = set(c["required_evidence_before_mechanic_use"])
assert {
    "visible_merge_zone_geometry_ref",
    "level_data_rule_ref",
    "python_solver_rule_ref",
    "javascript_runtime_rule_ref",
    "parity_evidence_ref",
    "target_iphone_visual_review_ref",
    "failure_cause_comprehension_ref",
    "retry_timing_evidence_ref",
} <= required

briefs = {x["id"]: x for x in b["briefs"]}
for level_id in ("level_010", "level_011", "level_012", "level_014"):
    assert briefs[level_id]["hard"]["required_mechanic"] == "shared_exit_conflict", level_id
assert briefs["level_010"]["hard"]["safe_alternative_min_during_conflict"] >= 1
assert briefs["level_013"]["hard"]["forbid_mechanic"] == "shared_exit_conflict"

statuses = {x["id"]: x["status"] for x in g["gates"]}
# Preparation must remain non-authorizing while upstream gameplay gates are blocked.
if statuses["P1-008"] != "PASS":
    assert c["status"] != "PASS"
if statuses["P1-009"] != "PASS":
    assert c["status"] != "AUTHORIZED_FOR_VERTICAL_SLICE_AUTHORING"

fail_closed = " ".join(c["fail_closed"])
assert "H1_IMPL_RESULT" in fail_closed
assert "CI/numeric PASS" in fail_closed
assert "P1-008" in fail_closed and "P1-009" in fail_closed

print("PASS: shared_exit_conflict remains preparation-only and requires rebuilt visible-rule, parity, target-iPhone, and human-comprehension revalidation")
