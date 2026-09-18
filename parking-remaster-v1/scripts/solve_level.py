#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from functools import lru_cache
from pathlib import Path


def intersect(a, b):
    return not (a[2] <= b[0] or a[0] >= b[2] or a[3] <= b[1] or a[1] >= b[3])


def build_rules(level):
    vehicles = level["vehicles"]
    ids = [v["id"] for v in vehicles]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate vehicle id")

    by_id = {v["id"]: v for v in vehicles}
    bounds = level["board"]["movement_bounds"]
    inset = level["board"]["corridor_inset"]

    def blocker(vid, alive):
        if vid not in alive:
            return None
        v = by_id[vid]
        x1, y1, x2, y2 = v["body"]
        d = v["dir"]
        if d == "up":
            corridor = [x1 + inset, bounds["top"], x2 - inset, y1]
        elif d == "down":
            corridor = [x1 + inset, y2, x2 - inset, bounds["bottom"]]
        elif d == "left":
            corridor = [bounds["left"], y1 + inset, x1, y2 - inset]
        elif d == "right":
            corridor = [x2, y1 + inset, bounds["right"], y2 - inset]
        else:
            raise ValueError(f"unknown direction: {d}")

        for oid in ids:
            if oid == vid or oid not in alive:
                continue
            if intersect(corridor, by_id[oid]["body"]):
                return oid
        return None

    def legal(alive):
        return [vid for vid in ids if vid in alive and blocker(vid, alive) is None]

    return ids, blocker, legal


def conflict_groups(level):
    return level.get("conflict_groups", [])


def conflict_group_for_vehicle(level, vehicle_id):
    groups = [g for g in conflict_groups(level) if vehicle_id in g["vehicle_ids"]]
    if len(groups) > 1:
        raise ValueError(f"vehicle belongs to multiple conflict groups: {vehicle_id}")
    return groups[0] if groups else None


def create_game_state(level):
    return {
        "active_ids": [v["id"] for v in level["vehicles"]],
        "occupied_groups": {},
        "failed": None,
    }


def copy_game_state(state):
    return {
        "active_ids": list(state["active_ids"]),
        "occupied_groups": dict(state["occupied_groups"]),
        "failed": dict(state["failed"]) if state["failed"] else None,
    }


def conflict_risk(level, state, vehicle_id):
    group = conflict_group_for_vehicle(level, vehicle_id)
    if not group:
        return None
    occupant = state["occupied_groups"].get(group["id"])
    if occupant and occupant != vehicle_id:
        return {"group_id": group["id"], "occupant_id": occupant}
    return None


def build_state_rules(level):
    ids, blocker, legal = build_rules(level)

    def safe_moves(state):
        if state["failed"]:
            return []
        alive = set(state["active_ids"])
        return [vid for vid in legal(alive) if conflict_risk(level, state, vid) is None]

    def risky_conflict_moves(state):
        if state["failed"]:
            return []
        alive = set(state["active_ids"])
        return [vid for vid in legal(alive) if conflict_risk(level, state, vid) is not None]

    def attempt_launch(state, vehicle_id):
        nxt = copy_game_state(state)
        if nxt["failed"]:
            return {"status": "failed_state", "state": nxt}
        if vehicle_id not in nxt["active_ids"]:
            return {"status": "inactive", "state": nxt}

        alive = set(nxt["active_ids"])
        static_blocker = blocker(vehicle_id, alive)
        if static_blocker:
            return {"status": "blocked", "blocker_id": static_blocker, "state": nxt}

        risk = conflict_risk(level, nxt, vehicle_id)
        if risk:
            nxt["failed"] = {
                "type": "shared_exit_conflict",
                "group_id": risk["group_id"],
                "occupant_id": risk["occupant_id"],
                "attempted_vehicle_id": vehicle_id,
            }
            return {"status": "conflict_fail", "failure": dict(nxt["failed"]), "state": nxt}

        nxt["active_ids"] = [vid for vid in nxt["active_ids"] if vid != vehicle_id]
        group = conflict_group_for_vehicle(level, vehicle_id)
        if group:
            nxt["occupied_groups"][group["id"]] = vehicle_id
        return {"status": "launched", "group_id": group["id"] if group else None, "state": nxt}

    def complete_exit(state, vehicle_id):
        nxt = copy_game_state(state)
        for group in conflict_groups(level):
            if nxt["occupied_groups"].get(group["id"]) == vehicle_id:
                del nxt["occupied_groups"][group["id"]]
        return nxt

    return {
        "ids": ids,
        "blocker": blocker,
        "legal": legal,
        "safe_moves": safe_moves,
        "risky_conflict_moves": risky_conflict_moves,
        "attempt_launch": attempt_launch,
        "complete_exit": complete_exit,
    }


def analyze(level):
    ids, blocker, legal = build_rules(level)
    states = 0
    branching = []

    @lru_cache(None)
    def dfs(state):
        nonlocal states
        states += 1
        alive = set(state)
        if not alive:
            return 1, ()

        moves = legal(alive)
        branching.append(len(moves))
        total = 0
        canonical = None

        for vid in moves:
            nxt = tuple(x for x in state if x != vid)
            count, seq = dfs(nxt)
            if count:
                total += count
                if canonical is None:
                    canonical = (vid,) + seq

        return total, canonical or ()

    initial = tuple(ids)
    solution_count, canonical = dfs(initial)
    alive = set(ids)
    initial_legal = legal(alive)
    initial_blockers = {vid: blocker(vid, alive) for vid in ids}
    forced = sum(1 for n in branching if n == 1)

    return {
        "level_id": level["id"],
        "solvable": solution_count > 0,
        "solution_count": solution_count,
        "canonical_solution": list(canonical),
        "states_explored": states,
        "initial_legal_moves": initial_legal,
        "initial_blockers": initial_blockers,
        "structural_metrics_v0": {
            "vehicle_count": len(ids),
            "initial_legal_choice_count": len(initial_legal),
            "mean_legal_choices_per_nonterminal_state": round(sum(branching) / len(branching), 3) if branching else 0,
            "forced_state_ratio": round(forced / len(branching), 3) if branching else 0,
            "solution_count": solution_count,
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("level", type=Path)
    parser.add_argument("--write-analysis", type=Path)
    args = parser.parse_args()
    level = json.loads(args.level.read_text(encoding="utf-8"))
    result = analyze(level)
    text = json.dumps(result, indent=2) + "\n"
    print(text, end="")
    if args.write_analysis:
        args.write_analysis.write_text(text, encoding="utf-8")
    raise SystemExit(0 if result["solvable"] else 2)


if __name__ == "__main__":
    main()
