import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
p = ROOT/'qa/visible_movement_runtime_evidence_contract_v1.json'
d = json.loads(p.read_text())
assert d['schema_version'] == '1.0'
g = d['activation_guard']
assert g == {'required_gate':'P1-007','required_status':'PASS','current_authorization':False}
checks = {c['id']: c for c in d['required_checks']}
required = {'blocked_tap_no_displacement','animation_corridor_containment','runtime_solver_decision_match','accepted_single_car_grammar_regression'}
assert set(checks) == required
assert checks['blocked_tap_no_displacement']['tolerance_px'] == 0
assert 'legal_move=false' in checks['blocked_tap_no_displacement']['machine_evidence']
assert 'containment=true' in checks['animation_corridor_containment']['machine_evidence']
assert 'match=true' in checks['runtime_solver_decision_match']['machine_evidence']
assert checks['accepted_single_car_grammar_regression']['human_review_required'] is True
limits = d['prototype_limits']
assert limits['max_cars'] <= 3
assert limits['requires_P1_007_PASS_before_build'] is True
assert limits['bulk_level_authoring'] is False
assert limits['level_3_authoring'] is False
for phrase in ['runtime-only legal-move exception','solver-only legal-move exception','numeric PASS treated as human game-quality PASS']:
    assert phrase in d['forbidden_shortcuts']
print('PASS: pre-P1-008 runtime evidence is finite, fail-closed, and unauthorized before P1-007')
