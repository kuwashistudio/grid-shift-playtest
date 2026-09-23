#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
contract = json.loads((ROOT / "qa/LEVEL_LIBRARY_PREPRODUCTION_CONTRACT_V1.json").read_text())
required = set(contract["required_record_fields"])
expected = {
    "level_id", "level_data_schema_version", "level_data_sha256",
    "solver_ruleset_version", "runtime_ruleset_version", "solver_proof_sha256",
    "parity_fixture_sha256", "visible_rule_contract_version", "difficulty_role",
    "mechanics", "duplicate_fingerprint", "review_status", "provenance"
}
assert contract["status"] == "PREPARATION_ONLY"
assert expected <= required
assert contract["activation_guard"]["content_authoring_for_publication_requires"] == ["P1-009 PASS"]
assert "P2-002 GREENLIGHT" in contract["activation_guard"]["bulk_authoring_requires"]
assert "P3-001 active" in contract["activation_guard"]["bulk_authoring_requires"]
assert contract["duplicate_detection"]["fingerprint"].startswith("SHA-256")
assert "PUBLISHABLE" in contract["review_status_enum"]
assert any("cannot be inferred from CI" in x for x in contract["publishable_invariants"])
assert any("prerequisite finite gates" in x for x in contract["publishable_invariants"])
assert any("human difficulty" in x for x in contract["forbidden_claims"])
assert any("experiential uniqueness" in x for x in contract["forbidden_claims"])

cost = contract["production_cost_evidence"]
assert cost["canonical_validator"] == "parking-remaster-v1/scripts/validate_level_production_cost_evidence.py"
assert set(cost["record_required_fields"]) == {
    "level_id", "authoring_run_id", "started_at", "finished_at", "stage_seconds",
    "rework_cycles", "human_review_seconds", "tool_compute_seconds", "result", "content_fingerprint"
}
assert cost["stage_seconds_exact_keys"] == [
    "design", "level_data", "solver_parity", "visual_assembly", "qa", "human_review_rework"
]
assert "5 distinct" in cost["batch_minimum"]
assert "cannot PASS human quality" in cost["claim_boundary"]

storage = contract["evidence_storage_policy"]
assert storage["status"] == "PREPRODUCTION_GUARDRAIL"
assert storage["actions_artifact_rules"]["required_explicit_retention_days"] is True
assert storage["actions_artifact_rules"]["default_project_retention_days"] == 7
assert 1 <= storage["actions_artifact_rules"]["maximum_project_retention_days_without_human_exception"] <= 14
assert storage["actions_artifact_rules"]["artifact_must_not_be_restart_authority"] is True
assert storage["actions_artifact_rules"]["large_media_requires_human_exception"] is True
assert storage["cache_rules"]["must_not_contain_unique_evidence"] is True
assert storage["cache_rules"]["cache_eviction_must_not_break_restart"] is True
assert "build caches" in storage["git_forbidden_by_default"]
assert "large temporary video" in storage["git_forbidden_by_default"]
assert len(storage["official_sources"]) >= 3
assert all(url.startswith("https://docs.github.com/") for url in storage["official_sources"])
assert "does not estimate future production volume" in storage["claim_boundary"]

legacy = contract["legacy_cost_helper"]
assert legacy["status"] == "COARSE_COMPATIBILITY_ONLY"
assert "not canonical" in legacy["rule"]
print("LEVEL_LIBRARY_PREPRODUCTION_CONTRACT_V1 PASS")
