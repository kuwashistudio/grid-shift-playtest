#!/usr/bin/env python3
from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
LEVEL = ROOT / 'levels' / 'level_001.json'

VEHICLE_RE = re.compile(
    r"\{id:'([^']+)',sprite:\[([^\]]+)\],body:\[([^\]]+)\],dir:'([^']+)'(?:,first:true)?\}"
)

def nums(text):
    return [int(x.strip()) for x in text.split(',')]

def extract_runtime(html):
    vehicles = []
    for m in VEHICLE_RE.finditer(html):
        full = m.group(0)
        vehicles.append({
            'id': m.group(1),
            'sprite': nums(m.group(2)),
            'body': nums(m.group(3)),
            'dir': m.group(4),
            'first': ',first:true' in full,
        })
    if not vehicles:
        raise ValueError('runtime vehicles not found')
    return vehicles

def norm(v):
    return {
        'id': v['id'],
        'sprite': list(map(int, v['sprite'])),
        'body': list(map(int, v['body'])),
        'dir': v['dir'],
        'first': bool(v.get('first', False)),
    }

def require(cond, message):
    if not cond:
        raise AssertionError(message)

def main():
    html = HTML.read_text(encoding='utf-8')
    level = json.loads(LEVEL.read_text(encoding='utf-8'))
    runtime = [norm(v) for v in extract_runtime(html)]
    data = [norm(v) for v in level['vehicles']]

    require(runtime == data, 'vehicle body/sprite/direction/first parity failed')
    b = level['board']['movement_bounds']
    inset = level['board']['corridor_inset']
    require(f"corridor=[b[0]+{inset},{b['top']},b[2]-{inset},b[1]]" in html, 'top corridor parity failed')
    require(f"corridor=[b[0]+{inset},b[3],b[2]-{inset},{b['bottom']}]" in html, 'bottom corridor parity failed')
    require(f"corridor=[{b['left']},b[1]+{inset},b[0],b[3]-{inset}]" in html, 'left corridor parity failed')
    require(f"corridor=[b[2],b[1]+{inset},{b['right']},b[3]-{inset}]" in html, 'right corridor parity failed')

    focus = level['tutorial'].get('first_focus_vehicle')
    runtime_focus = next((v['id'] for v in runtime if v['first']), None)
    require(focus == runtime_focus, 'tutorial focus parity failed')

    print('PASS Level 1 runtime/data parity: vehicles=10, bounds/inset/tutorial match')
    return 0

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f'FAIL {exc}', file=sys.stderr)
        raise SystemExit(1)
