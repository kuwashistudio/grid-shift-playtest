#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "qa" / "IPHONE_RUNTIME_CONTRACT_V1.json"
d = json.loads(p.read_text())
assert d["schema_version"] == "1.1"
assert d["current_authorization"] is False
assert "does not authorize P1-007/P1-008" in d["scope"]
r = d["requirements"]

v = r["viewport"]
assert set(v["meta_tokens"]) == {"width=device-width", "initial-scale=1", "viewport-fit=cover"}
assert set(v["safe_area"]) == {"safe-area-inset-top", "safe-area-inset-right", "safe-area-inset-bottom", "safe-area-inset-left"}
assert v["critical_controls_must_respect_safe_area"] is True
assert v["first_control_available_ms_max"] <= 1000
assert v["full_height_strategy"] == "dynamic_viewport_with_legacy_fallback"
assert v["dynamic_unit"] == "100dvh"
assert v["legacy_fallback_allowed"] == "100vh"
assert v["fixed_100vh_as_only_height_strategy_for_game_surface_forbidden"] is True
assert v["visual_viewport_role"] == "presentation_observability_only"
assert v["visual_viewport_must_not_change_logical_game_state"] is True
assert v["resize_or_orientation_change_must_not_commit_game_action"] is True

i = r["input"]
assert i["primary_model"] == "PointerEvent"
assert i["game_surface_touch_action"] == "none"
assert i["single_gameplay_pointer_policy"] == "primary_pointer_only"
assert i["secondary_simultaneous_pointer_must_not_commit_game_action"] is True
assert i["pointercancel_must_not_commit_game_action"] is True
assert "release_on_pointerup_or_pointercancel" in i["pointer_capture_policy"]
assert i["duplicate_touch_mouse_action_forbidden"] is True
assert i["gameplay_must_not_wait_for_audio"] is True

lc = r["lifecycle"]
assert set(lc["required_events"]) == {"visibilitychange", "pagehide", "pageshow"}
assert set(lc["audio_states_handled"]) == {"suspended", "interrupted"}
assert lc["bfcache_restore_must_not_duplicate_handlers"] is True
assert lc["hidden_or_pagehide_must_cancel_transient_pointer_state"] is True
assert lc["pageshow_restore_must_not_replay_or_commit_stale_pointer_action"] is True
assert r["evidence"]["physical_iphone"] == "required_for_subjective_quality_and_final_target_device_QA"
assert "does not activate P1-007/P1-008" in d["authorization_boundary"]

# Fail closed against the regressions this contract exists to prevent.
mut = json.loads(json.dumps(d))
mut["requirements"]["viewport"]["fixed_100vh_as_only_height_strategy_for_game_surface_forbidden"] = False
assert mut["requirements"]["viewport"]["fixed_100vh_as_only_height_strategy_for_game_surface_forbidden"] is not True
mut = json.loads(json.dumps(d))
mut["requirements"]["input"]["secondary_simultaneous_pointer_must_not_commit_game_action"] = False
assert mut["requirements"]["input"]["secondary_simultaneous_pointer_must_not_commit_game_action"] is not True
mut = json.loads(json.dumps(d))
mut["requirements"]["lifecycle"]["pageshow_restore_must_not_replay_or_commit_stale_pointer_action"] = False
assert mut["requirements"]["lifecycle"]["pageshow_restore_must_not_replay_or_commit_stale_pointer_action"] is not True

print("PASS: finite iPhone runtime contract covers dynamic viewport, safe area, pointer cancellation/capture, lifecycle recovery, and preserves Human gates")
