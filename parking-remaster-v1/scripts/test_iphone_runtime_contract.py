#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "qa" / "IPHONE_RUNTIME_CONTRACT_V1.json"
d = json.loads(p.read_text())
assert d["schema_version"] == "1.0"
assert d["current_authorization"] is False
r = d["requirements"]
assert set(r["viewport"]["meta_tokens"]) == {"width=device-width", "initial-scale=1", "viewport-fit=cover"}
assert set(r["viewport"]["safe_area"]) == {"safe-area-inset-top", "safe-area-inset-right", "safe-area-inset-bottom", "safe-area-inset-left"}
assert r["viewport"]["first_control_available_ms_max"] <= 1000
assert r["input"]["primary_model"] == "PointerEvent"
assert r["input"]["game_surface_touch_action"] == "none"
assert r["input"]["pointercancel_must_not_commit_game_action"] is True
assert r["input"]["duplicate_touch_mouse_action_forbidden"] is True
assert r["input"]["gameplay_must_not_wait_for_audio"] is True
assert set(r["lifecycle"]["required_events"]) == {"visibilitychange", "pagehide", "pageshow"}
assert set(r["lifecycle"]["audio_states_handled"]) == {"suspended", "interrupted"}
assert r["lifecycle"]["bfcache_restore_must_not_duplicate_handlers"] is True
assert r["evidence"]["physical_iphone"] == "required_for_subjective_quality_and_final_target_device_QA"
print("PASS: finite iPhone runtime contract is fail-closed and preserves human/device gates")
