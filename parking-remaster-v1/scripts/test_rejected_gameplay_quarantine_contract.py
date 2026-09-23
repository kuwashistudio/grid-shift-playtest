#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
contract = json.loads((ROOT / 'qa/REJECTED_GAMEPLAY_QUARANTINE_CONTRACT_V1.json').read_text())
gates = json.loads((ROOT / 'project-state/GATES.json').read_text())
canon = (ROOT / 'project-state/CANON.md').read_text()

def gate(gid):
    return next(g for g in gates['gates'] if g['id'] == gid)

assert contract['fail_closed'] is True
assert contract['required_classification'] == 'REJECTED_GAMEPLAY_ENGINEERING_EVIDENCE_ONLY'
assert set(contract['legacy_levels']) == {
    'parking-remaster-v1/levels/level_001.json',
    'parking-remaster-v1/levels/level_002.json'
}
for rel in contract['legacy_levels']:
    assert (ROOT.parent / rel).exists(), rel
assert 'Old Level 1/2 gameplay is REJECTED' in canon
assert 'Level 3 remains LOCKED' in canon
assert gate('P1-006')['status'] == 'IN_PROGRESS'
assert gate('P1-007')['status'] == 'BLOCKED'
assert gate('P1-008')['status'] == 'BLOCKED'
assert gate('P1-007')['blocker'] == 'P1-006 must pass first.'
assert gate('P1-008')['blocker'].startswith('P1-007 must pass.')
for required in ['publish_as_rebuilt_level','treat_solver_pass_as_gameplay_acceptance','unlock_level_3','bulk_authoring_seed_without_explicit_rebuild']:
    assert required in contract['forbidden_uses']
print('PASS rejected gameplay quarantine contract')
