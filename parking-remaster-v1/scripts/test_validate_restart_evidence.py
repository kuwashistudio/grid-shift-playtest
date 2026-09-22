#!/usr/bin/env python3
from __future__ import annotations
import importlib.util, json, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("guard", HERE / "validate_restart_evidence.py")
guard = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(guard)


def state(paths): return {"parallel_progress":{"evidence_files":paths}}

def must_fail(root, paths, needle):
    errors=guard.validate(state(paths), root)
    assert any(needle in e for e in errors), (needle,errors)

with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp); (root/"parking-remaster-v1/qa").mkdir(parents=True); (root/".github/workflows").mkdir(parents=True)
    (root/"parking-remaster-v1/qa/evidence.json").write_text("{}")
    (root/".github/workflows/parking-remaster-project-state.yml").write_text("name: test\n")
    good=["parking-remaster-v1/qa/evidence.json",".github/workflows/parking-remaster-project-state.yml"]
    assert guard.validate(state(good),root)==[]
    must_fail(root,["parking-remaster-v1/qa/missing.json"],"missing durable evidence")
    must_fail(root,[good[0],good[0]],"duplicate evidence")
    must_fail(root,["parking-remaster-v1/../app1.js"],"unsafe evidence")
    must_fail(root,["app1.js"],"unsafe evidence")
    must_fail(root,[],"non-empty")
print("PASS: restart evidence path regressions")
