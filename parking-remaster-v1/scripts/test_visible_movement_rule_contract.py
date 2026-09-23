#!/usr/bin/env python3
import copy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "qa" / "visible_movement_rule_contract_v1.json"
GATES = ROOT / "project-state" / "GATES.json"


def validate(c, gates):
    errors = []
    by_id = {g["id"]: g for g in gates["gates"]}
    guard = c.get("activation_guard", {})
    required = guard.get("required_gate")
    if required != "P1-007": errors.append("activation must require P1-007")
    if guard.get("required_status") != "PASS": errors.append("activation must require PASS")
    actual = by_id.get(required, {}).get("status")
    authorized = guard.get("current_authorization")
    if authorized and actual != "PASS": errors.append("authorization bypasses P1-007")
    if c.get("preferred_baseline") != "LONGITUDINAL_VISIBLE_CLEARANCE": errors.append("researched baseline drift")
    lock = c.get("research_lock", {})
    if lock.get("status") != "SUFFICIENT_FOR_FIRST_CANDIDATE_SELECTION": errors.append("research selection must be explicitly locked")
    rejected = set(lock.get("rejected_first_candidate_models", []))
    required_rejected = {"CELL_STEP_SLIDING", "FREE_OR_CURVED_STEERING_TO_EXIT", "SHARED_EXIT_QUEUE_OR_HIDDEN_OCCUPANCY"}
    if not required_rejected.issubset(rejected): errors.append("rejected candidate set drift")
    legal = c.get("legal_move_contract", {})
    if not legal.get("solver_runtime_same_geometry"): errors.append("solver/runtime geometry must be identical")
    for forbidden in ("hidden_ray", "shared_hidden_bezier", "free_steering", "rng", "animation_frame_count_affects_legality", "viewport_affects_legality", "audio_state_affects_legality"):
        if legal.get(forbidden) is not False: errors.append(f"{forbidden} must be false")
    if legal.get("decision_time") != "tap_time_from_level_data": errors.append("legality decision time drift")
    if legal.get("terminal_state") != "exact_logical_terminal_state": errors.append("terminal state drift")
    limits = c.get("prototype_limits", {})
    if not isinstance(limits.get("max_cars"), int) or not (2 <= limits["max_cars"] <= 3): errors.append("prototype max_cars must be 2..3")
    if c.get("human_quality_separate_from_numeric_pass") is not True: errors.append("human quality separation required")
    evidence = set(c.get("required_future_evidence", []))
    for item in ("edge-touch blocked and one-unit-clearance fixture cases", "viewport resize/orientation/projection-scale legality invariance", "visible first-action human comprehension review on target iPhone"):
        if item not in evidence: errors.append(f"required evidence missing: {item}")
    return errors


def main():
    c = json.loads(CONTRACT.read_text())
    g = json.loads(GATES.read_text())
    assert not validate(c, g), validate(c, g)

    bad = copy.deepcopy(c); bad["activation_guard"]["current_authorization"] = True
    assert "authorization bypasses P1-007" in validate(bad, g)
    bad = copy.deepcopy(c); bad["legal_move_contract"]["hidden_ray"] = True
    assert "hidden_ray must be false" in validate(bad, g)
    bad = copy.deepcopy(c); bad["legal_move_contract"]["solver_runtime_same_geometry"] = False
    assert "solver/runtime geometry must be identical" in validate(bad, g)
    bad = copy.deepcopy(c); bad["prototype_limits"]["max_cars"] = 10
    assert "prototype max_cars must be 2..3" in validate(bad, g)
    bad = copy.deepcopy(c); bad["preferred_baseline"] = "FREE_OR_CURVED_STEERING_TO_EXIT"
    assert "researched baseline drift" in validate(bad, g)
    bad = copy.deepcopy(c); bad["legal_move_contract"]["viewport_affects_legality"] = True
    assert "viewport_affects_legality must be false" in validate(bad, g)
    bad = copy.deepcopy(c); bad["research_lock"]["rejected_first_candidate_models"] = []
    assert "rejected candidate set drift" in validate(bad, g)
    print("PASS visible movement rule contract + researched-baseline fail-closed regressions")

if __name__ == "__main__": main()
