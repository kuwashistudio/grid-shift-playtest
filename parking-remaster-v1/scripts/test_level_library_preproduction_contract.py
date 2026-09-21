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
print("LEVEL_LIBRARY_PREPRODUCTION_CONTRACT_V1 PASS")
