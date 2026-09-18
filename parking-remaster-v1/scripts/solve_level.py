#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from functools import lru_cache
from pathlib import Path

def intersect(a, b):
    return not (a[2] <= b[0] or a[0] >= b[2] or a[3] <= b[1] or a[1] >= b[3])

def analyze(level):
    vehicles = level['vehicles']
    ids = [v['id'] for v in vehicles]
    if len(ids) != len(set(ids)): raise ValueError('duplicate vehicle id')
    by_id = {v['id']: v for v in vehicles}
    bounds = level['board']['movement_bounds']
    inset = level['board']['corridor_inset']

    def blocker(vid, alive):
        v = by_id[vid]
        x1, y1, x2, y2 = v['body']
        d = v['dir']
        if d == 'up': corridor = [x1 + inset, bounds['top'], x2 - inset, y1]
        elif d == 'down': corridor = [x1 + inset, y2, x2 - inset, bounds['bottom']]
        elif d == 'left': corridor = [bounds['left'], y1 + inset, x1, y2 - inset]
        else: corridor = [x2, y1 + inset, bounds['right'], y2 - inset]
        for oid in ids:
            if oid == vid or oid not in alive: continue
            if intersect(corridor, by_id[oid]['body']): return oid
        return None

    states = 0
    branching = []

    @lru_cache(None)
    def dfs(state):
        nonlocal states
        states += 1
        alive = set(state)
        if not alive: return 1, ()
        legal = [vid for vid in ids if vid in alive and blocker(vid, alive) is None]
        branching.append(len(legal))
        total = 0
        canonical = None
        for vid in legal:
            nxt = tuple(x for x in state if x != vid)
            count, seq = dfs(nxt)
            if count:
                total += count
                if canonical is None: canonical = (vid,) + seq
        return total, canonical or ()

    initial = tuple(ids)
    solution_count, canonical = dfs(initial)
    alive = set(ids)
    initial_legal = [vid for vid in ids if blocker(vid, alive) is None]
    initial_blockers = {vid: blocker(vid, alive) for vid in ids}
    forced = sum(1 for n in branching if n == 1)
    return {
        'level_id': level['id'],
        'solvable': solution_count > 0,
        'solution_count': solution_count,
        'canonical_solution': list(canonical),
        'states_explored': states,
        'initial_legal_moves': initial_legal,
        'initial_blockers': initial_blockers,
        'structural_metrics_v0': {
            'vehicle_count': len(ids),
            'initial_legal_choice_count': len(initial_legal),
            'mean_legal_choices_per_nonterminal_state': round(sum(branching) / len(branching), 3) if branching else 0,
            'forced_state_ratio': round(forced / len(branching), 3) if branching else 0,
            'solution_count': solution_count,
        },
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('level', type=Path)
    parser.add_argument('--write-analysis', type=Path)
    args = parser.parse_args()
    level = json.loads(args.level.read_text(encoding='utf-8'))
    result = analyze(level)
    text = json.dumps(result, indent=2) + '\n'
    print(text, end='')
    if args.write_analysis: args.write_analysis.write_text(text, encoding='utf-8')
    raise SystemExit(0 if result['solvable'] else 2)

if __name__ == '__main__': main()
