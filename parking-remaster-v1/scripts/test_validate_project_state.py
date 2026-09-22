#!/usr/bin/env python3
"""Regression-test fail-closed invariants in validate_project_state.py."""
from __future__ import annotations
import json
from pathlib import Path
import shutil, subprocess, sys, tempfile

ROOT = Path(__file__).resolve().parents[1]
STATE_DIR = ROOT / "project-state"
VALIDATOR = ROOT / "scripts" / "validate_project_state.py"

def run(root: Path):
    return subprocess.run([sys.executable, str(root / "scripts" / "validate_project_state.py")], cwd=root, text=True, capture_output=True, check=False)

def write_json(path: Path, data: dict): path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

def isolated_root(tmp: str) -> Path:
    root=Path(tmp)/"parking-remaster-v1"; (root/"scripts").mkdir(parents=True)
    shutil.copy2(VALIDATOR, root/"scripts"/"validate_project_state.py"); shutil.copytree(STATE_DIR, root/"project-state"); return root

def expect_fail(name, mutate, needle):
    with tempfile.TemporaryDirectory() as tmp:
        root=isolated_root(tmp); mutate(root); result=run(root); output=result.stdout+result.stderr
        if result.returncode==0 or needle not in output: raise AssertionError(f"{name}: expected {needle!r}; rc={result.returncode}\n{output}")
        print(f"PASS negative: {name}")

def mutate_state(root, fn):
    p=root/"project-state"/"PROJECT_STATE.json"; d=json.loads(p.read_text(encoding="utf-8")); fn(d); write_json(p,d)

def recount(root: Path, gates: dict):
    counts={s:sum(1 for g in gates["gates"] if g["status"]==s) for s in ("TODO","IN_PROGRESS","BLOCKED","PASS")}; counts["total"]=len(gates["gates"]); gates["counts"]=counts
    mutate_state(root, lambda s:s.__setitem__("gate_counts",counts))

def main():
    with tempfile.TemporaryDirectory() as tmp:
        result=run(isolated_root(tmp))
        if result.returncode!=0: raise AssertionError("canonical state must pass\n"+result.stdout+result.stderr)
        print("PASS baseline canonical state")

    expect_fail("repository identity locked", lambda r: mutate_state(r,lambda s:s.__setitem__("repository","other/repo")), "repository identity mismatch")
    expect_fail("staging branch locked", lambda r: mutate_state(r,lambda s:s.__setitem__("staging_branch","main")), "staging_branch mismatch")
    expect_fail("work scope locked", lambda r: mutate_state(r,lambda s:s.__setitem__("work_scope","./")), "work_scope mismatch")
    expect_fail("canonical restart paths locked", lambda r: mutate_state(r,lambda s:s["canonical_files"].__setitem__("gates","GATES.json")), "canonical_files must match")
    expect_fail("evidence cannot escape Parking scope", lambda r: mutate_state(r,lambda s:s["parallel_progress"]["evidence_files"].append("app1.js")), "evidence path escapes Parking Remaster scope")
    expect_fail("evidence cannot traverse", lambda r: mutate_state(r,lambda s:s["parallel_progress"]["evidence_files"].append("parking-remaster-v1/../app1.js")), "evidence path escapes Parking Remaster scope")
    expect_fail("Phase 1 cannot silently start production", lambda r: mutate_state(r,lambda s:s.__setitem__("production_started",True)), "Phase 1 core-fun proof requires production_started=false")
    expect_fail("last_completed_gate latest", lambda r: mutate_state(r,lambda s:s.__setitem__("last_completed_gate","GP-000")), "last_completed_gate 'GP-000' is stale")
    expect_fail("verified commit must be full SHA", lambda r: mutate_state(r,lambda s:s.__setitem__("latest_verified_commit","deadbeef")), "latest_verified_commit must be a full lowercase 40-hex commit SHA")
    expect_fail("verified CI must be success", lambda r: mutate_state(r,lambda s:s["latest_verified_ci"].__setitem__("status","PENDING")), "latest_verified_ci.status must be SUCCESS")
    expect_fail("verified CI head must match commit", lambda r: mutate_state(r,lambda s:s["latest_verified_ci"].__setitem__("verified_head","0"*40)), "latest_verified_ci.verified_head must equal latest_verified_commit")
    expect_fail("verified CI workflow locked", lambda r: mutate_state(r,lambda s:s["latest_verified_ci"].__setitem__("workflow","Other Workflow")), "latest_verified_ci.workflow must be Parking Remaster Project State")
    expect_fail("verified CI run id valid", lambda r: mutate_state(r,lambda s:s["latest_verified_ci"].__setitem__("run_id",0)), "latest_verified_ci.run_id must be a positive integer")

    def pending_audio(root):
        gp=root/"project-state"/"GATES.json"; gates=json.loads(gp.read_text(encoding="utf-8"))
        for g in gates["gates"]:
            if g["id"]=="P1-006": g["status"]="PASS"; g["evidence"]=["synthetic browser metric only"]
        recount(root,gates); mutate_state(root,lambda s:(s.__setitem__("current_gate","P1-007"),s.__setitem__("last_completed_gate","P1-006"))); write_json(gp,gates)
    expect_fail("P1-006 cannot synthetic-PASS", pending_audio, "P1-006 cannot PASS while human_review_status is pending")

    def activate(root,gid):
        gp=root/"project-state"/"GATES.json"; gates=json.loads(gp.read_text(encoding="utf-8"))
        for g in gates["gates"]:
            if g["id"]==gid: g["status"]="IN_PROGRESS"; g["blocker"]=None
        recount(root,gates); write_json(gp,gates)
    expect_fail("multi-car cannot bypass P1-007", lambda r:activate(r,"P1-008"), "P1-008 cannot be active/PASS before prerequisite P1-007 is PASS")
    expect_fail("production cannot bypass rebuilt Level 1", lambda r:activate(r,"P2-001"), "P2-001 cannot be active/PASS before prerequisite P1-009 is PASS")

    def corrupt(root):
        gp=root/"project-state"/"GATES.json"; gates=json.loads(gp.read_text(encoding="utf-8")); gates["counts"]["PASS"]+=1; write_json(gp,gates)
    expect_fail("stored gate counts",corrupt,"GATES counts mismatch")
    print("PROJECT_STATE_REGRESSION_TESTS: PASS"); return 0

if __name__=="__main__": sys.exit(main())
