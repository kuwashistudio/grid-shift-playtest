#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVEL_DIR = ROOT / 'levels'
OUT = ROOT / 'levels.generated.js'

def main():
    levels = {}
    for path in sorted(LEVEL_DIR.glob('level_*.json')):
        if path.name.endswith(('.analysis.json', '.parity.json', '.difficulty.json')):
            continue
        level = json.loads(path.read_text(encoding='utf-8'))
        level_id = level.get('id')
        if not level_id:
            raise ValueError(f'{path}: missing id')
        if level_id in levels:
            raise ValueError(f'duplicate level id: {level_id}')
        expected = f'{level_id}.json'
        if path.name != expected:
            raise ValueError(f'{path.name}: expected filename {expected}')
        vehicle_ids = [v['id'] for v in level.get('vehicles', [])]
        if len(vehicle_ids) != len(set(vehicle_ids)):
            raise ValueError(f'{level_id}: duplicate vehicle id')
        levels[level_id] = level

    payload = json.dumps(levels, separators=(',', ':'), ensure_ascii=False)
    text = '// GENERATED FILE. Source of truth: levels/level_*.json\n' + 'window.__PARKING_LEVELS__=' + payload + ';\n'
    OUT.write_text(text, encoding='utf-8')
    print(f'PASS built {len(levels)} level(s) -> {OUT.name} bytes={len(text.encode("utf-8"))}')

if __name__ == '__main__':
    main()
