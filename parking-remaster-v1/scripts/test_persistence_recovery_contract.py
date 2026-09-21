#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
contract = json.loads((ROOT / "qa/PERSISTENCE_RECOVERY_CONTRACT_V1.json").read_text())

assert contract["status"] == "PREPARATION_ONLY"
b = contract["authority_boundary"]
assert all(b.values())

storage = contract["storage_model"]
required = {"schema_version", "content_version", "level_id", "level_state", "updated_at"}
assert required.issubset(set(storage["required_envelope_fields"]))
assert "transient_animation_frame" in storage["forbidden_payloads"]
assert "audio_context_state" in storage["forbidden_payloads"]

writes = contract["write_rules"]
assert writes["save_only_at_deterministic_boundaries"] is True
assert writes["never_block_gameplay_input_on_storage"] is True
assert {"accepted_player_action", "level_completion", "explicit_restart"}.issubset(set(writes["required_boundaries"]))

recovery = contract["recovery_rules"]
assert recovery["validate_schema_before_restore"] is True
assert recovery["validate_content_version_before_restore"] is True
assert recovery["invalid_or_corrupt_save"] == "fail_closed_to_known_playable_state"
assert recovery["pagehide_or_visibilitychange"].startswith("may_attempt_best_effort_save")
assert recovery["audio_recovery_separate_from_game_state_recovery"] is True

matrix = set(contract["test_matrix"])
for case in ("fresh_no_save", "valid_current_save", "malformed_json", "unknown_schema_version", "stale_content_version_without_migration", "unknown_level_id", "interrupted_session_after_accepted_action"):
    assert case in matrix

needed = set(contract["acceptance_evidence_required_before_release"])
assert "physical_iPhone reload/background/foreground evidence" in needed
assert "corrupt-save fail-closed evidence" in needed

print("PASS: persistence/recovery contract is bounded, deterministic, fail-closed, and preparation-only")
