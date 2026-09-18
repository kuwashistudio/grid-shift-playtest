#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

from solve_level import analyze, build_rules, intersect


def corridor_for(level, vehicle):
    x1, y1, x2, y2 = vehicle["body"]
    bounds = level["board"]["movement_bounds"]
    inset = level["board"]["corridor_inset"]
    d = vehicle["dir"]
    if d == "up":
        return [x1 + inset, bounds["top"], x2 - inset, y1]
    if d == "down":
        return [x1 + inset, y2, x2 - inset, bounds["bottom"]]
    if d == "left":
        return [bounds["left"], y1 + inset, x1, y2 - inset]
    if d == "right":
        return [x2, y1 + inset, bounds["right"], y2 - inset]
    raise ValueError(f"unknown direction: {d}")


def dependency_graph(level):
    vehicles = level["vehicles"]
    edges = []
    for blocked in vehicles:
        corridor = corridor_for(level, blocked)
        for blocker in vehicles:
            if blocker["id"] == blocked["id"]:
                continue
            if intersect(corridor, blocker["body"]):
                edges.append((blocker["id"], blocked["id"]))
    return edges


def longest_dependency_chain(ids, edges):
    adj = defaultdict(list)
    for src, dst in edges:
        adj[src].append(dst)

    memo = {}
    visiting = set()

    def visit(node):
        if node in memo:
            return memo[node]
        if node in visiting:
            raise ValueError("dependency cycle detected")
        visiting.add(node)
        children = adj[node]
        if not children:
            result = [node]
        else:
            result = max(([node] + visit(child) for child in children), key=len)
        visiting.remove(node)
        memo[node] = result
        return result

    return max((visit(node) for node in ids), key=len)


def reachable_state_metrics(level):
    ids, blocker, legal = build_rules(level)
    initial = tuple(ids)
    seen = {initial}
    stack = [initial]
    transitions = 0
    branching = []

    while stack:
        state = stack.pop()
        alive = set(state)
        if not state:
            continue
        moves = legal(alive)
        branching.append(len(moves))
        for vid in moves:
            nxt = tuple(x for x in state if x != vid)
            transitions += 1
            if nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)

    histogram = Counter(branching)
    return {
        "reachable_state_count": len(seen),
        "reachable_transition_count": transitions,
        "branch_histogram": {str(k): histogram[k] for k in sorted(histogram)},
        "mean_legal_choices": round(sum(branching) / len(branching), 6) if branching else 0,
        "max_legal_choices": max(branching, default=0),
        "forced_state_ratio": round(sum(1 for x in branching if x == 1) / len(branching), 6) if branching else 0,
        "mean_choice_entropy_bits": round(
            sum(math.log2(x) for x in branching if x > 0) / len(branching), 6
        ) if branching else 0,
    }


def extract(level):
    base = analyze(level)
    ids = [v["id"] for v in level["vehicles"]]
    edges = dependency_graph(level)
    chain = longest_dependency_chain(ids, edges)
    state = reachable_state_metrics(level)
    solution_fraction = base["solution_count"] / math.factorial(len(ids))

    return {
        "model_version": "difficulty_features_v1",
        "level_id": level["id"],
        "designer_target_band": level["design"]["target_band"],
        "structural_features": {
            "vehicle_count": len(ids),
            "dependency_edge_count": len(edges),
            "dependency_depth_vehicles": len(chain),
            "dependency_depth_moves": max(0, len(chain) - 1),
            "longest_dependency_chain": chain,
            "initial_legal_choice_count": len(base["initial_legal_moves"]),
            **state,
            "solution_count": base["solution_count"],
            "log2_solution_count": round(math.log2(base["solution_count"]), 6) if base["solution_count"] else None,
            "solution_order_fraction": round(solution_fraction, 9),
            "novelty_load": len(level["design"].get("introduced", [])),
            "hard_fail_recovery_cost": 0 if not level["tutorial"].get("hard_fail_enabled") else None,
        },
        "interpretation_guards": [
            "These are structural features, not a human difficulty score.",
            "Do not rank player-facing difficulty from solution_count alone.",
            "Weights must be calibrated later using fresh-player and controlled-release data.",
            "hard_fail_recovery_cost remains undefined for future failure mechanics until their schema exists."
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("level", type=Path)
    parser.add_argument("--write", type=Path)
    args = parser.parse_args()
    level = json.loads(args.level.read_text(encoding="utf-8"))
    result = extract(level)
    text = json.dumps(result, indent=2) + "\n"
    print(text, end="")
    if args.write:
        args.write.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
