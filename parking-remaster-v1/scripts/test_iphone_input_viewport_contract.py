#!/usr/bin/env python3
import copy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / 'qa' / 'IPHONE_INPUT_VIEWPORT_CONTRACT_V1.json'
GATES = ROOT / 'project-state' / 'GATES.json'


def validate(c, gates):
    errors = []
    by_id = {g['id']: g for g in gates['gates']}
    guard = c.get('activation_guard', {})
    if guard.get('required_gate') != 'P1-007' or guard.get('required_status') != 'PASS':
        errors.append('P1-007 PASS activation guard required')
    if guard.get('current_authorization') and by_id.get('P1-007', {}).get('status') != 'PASS':
        errors.append('authorization bypasses P1-007')
    coord = c.get('coordinate_contract', {})
    for k in ('raw_client_coordinates_in_legality','viewport_affects_legality','device_pixel_ratio_affects_legality','safe_area_affects_legality'):
        if coord.get(k) is not False: errors.append(f'{k} must be false')
    if coord.get('single_projection_before_hit_test') is not True: errors.append('single projection required')
    tol = coord.get('projection_round_trip_tolerance_css_px_max')
    if not isinstance(tol, (int,float)) or tol <= 0 or tol > 0.5: errors.append('projection tolerance must be >0 and <=0.5 CSS px')
    pointer = c.get('pointer_contract', {})
    if pointer.get('primary_model') != 'POINTER_EVENTS': errors.append('Pointer Events model required')
    if pointer.get('pointercancel_mutates_gameplay') is not False: errors.append('pointercancel must not mutate gameplay')
    if pointer.get('max_gameplay_actions_per_physical_pointer_sequence') != 1: errors.append('one action max per physical pointer sequence')
    if pointer.get('synthetic_click_double_fire_allowed') is not False: errors.append('synthetic double-fire forbidden')
    if pointer.get('explicit_touch_action_policy_required') is not True: errors.append('explicit touch-action required')
    fixtures = set(c.get('viewport_fixture_classes', []))
    required = {'portrait_baseline','visual_viewport_height_offset_change','device_pixel_ratio_change','orientation_sized_projection'}
    if fixtures != required: errors.append('viewport fixture set drift')
    instant = c.get('instant_start', {})
    if instant.get('first_gameplay_control_available_ms_max') != 1000: errors.append('instant-start budget drift')
    if instant.get('may_wait_for_viewport_stabilization') is not False or instant.get('may_wait_for_audio_recovery') is not False:
        errors.append('gameplay input may not wait for viewport/audio')
    if c.get('human_quality_separate_from_machine_pass') is not True: errors.append('human quality boundary required')
    forbidden = set(c.get('forbidden_promotions', []))
    for item in ('P1-006 PASS','P1-007 PASS','P1-008 activation','multi-car implementation','Level 3 authoring','production start'):
        if item not in forbidden: errors.append(f'forbidden promotion missing: {item}')
    return errors


def main():
    c = json.loads(CONTRACT.read_text())
    g = json.loads(GATES.read_text())
    assert not validate(c, g), validate(c, g)
    bad = copy.deepcopy(c); bad['activation_guard']['current_authorization'] = True
    assert 'authorization bypasses P1-007' in validate(bad, g)
    bad = copy.deepcopy(c); bad['coordinate_contract']['viewport_affects_legality'] = True
    assert 'viewport_affects_legality must be false' in validate(bad, g)
    bad = copy.deepcopy(c); bad['pointer_contract']['pointercancel_mutates_gameplay'] = True
    assert 'pointercancel must not mutate gameplay' in validate(bad, g)
    bad = copy.deepcopy(c); bad['pointer_contract']['max_gameplay_actions_per_physical_pointer_sequence'] = 2
    assert 'one action max per physical pointer sequence' in validate(bad, g)
    bad = copy.deepcopy(c); bad['instant_start']['may_wait_for_audio_recovery'] = True
    assert 'gameplay input may not wait for viewport/audio' in validate(bad, g)
    print('PASS iPhone input/viewport prerequisite is finite, deterministic, and fail-closed before P1-007')

if __name__ == '__main__':
    main()
