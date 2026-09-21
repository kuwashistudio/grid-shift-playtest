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
    legal = c.get("legal_move_contract", {})
    if not legal.get("solver_runtime_same_geometry"): errors.append("solver/runtime geometry must be identical")
    for forbidden in ("hidden_ray", "shared_hidden_bezier", "free_steering", "rng"):
        if legal.get(forbidden) is not False: errors.append(f"{forbidden} must be false")
    limits = c.get("prototype_limits", {})
    if not isinstance(limits.get("max_cars"), int) or not (2 <= limits["max_cars"] <= 3): errors.append("prototype max_cars must be 2..3")
    if c.get("human_quality_separate_from_numeric_pass") is not True: errors.append("human quality separation required")
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
    print("PASS visible movement rule contract + fail-closed regressions")

if __name__ == "__main__": main()
