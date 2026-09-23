#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

SPEC = Path(__file__).resolve().parents[1] / "qa" / "RELEASE_ROLLBACK_MANIFEST_SPEC_V1.json"

def fail(msg):
    raise ValueError(msg)

def validate(data, spec, publishing=False, production_started=False):
    c = spec["constraints"]
    for key in spec["required_fields"]:
        if key not in data: fail(f"missing required field: {key}")
    if data["source_branch"] != c["source_branch"]: fail("wrong source_branch")
    if data["build_profile"] != c["build_profile"]: fail("wrong build_profile")
    if not re.fullmatch(c["source_commit_pattern"], data["source_commit"]): fail("invalid source_commit")
    if not re.fullmatch(c["release_id_pattern"], data["release_id"]): fail("invalid release_id")
    for key in ("level_library_fingerprint", "asset_manifest_fingerprint"):
        if not re.fullmatch(c["fingerprint_pattern"], data[key]): fail(f"invalid {key}")
    runtime = data["runtime_contract_fingerprints"]
    if not isinstance(runtime, dict): fail("runtime_contract_fingerprints must be an object")
    for key in c["runtime_contract_required"]:
        if key not in runtime: fail(f"runtime contract fingerprint missing {key}")
        if not re.fullmatch(c["fingerprint_pattern"], runtime[key]): fail(f"invalid runtime contract fingerprint: {key}")
    if set(runtime) != set(c["runtime_contract_required"]): fail("unexpected runtime contract fingerprint key")
    evidence = data["qa_evidence"]
    if not isinstance(evidence, list) or len(evidence) < c["qa_evidence_minimum"]: fail("insufficient qa_evidence")
    names, refs = set(), set()
    for item in evidence:
        if not isinstance(item, dict): fail("qa evidence entry must be an object")
        for key in c["qa_evidence_entry_required"]:
            if key not in item: fail(f"qa evidence missing {key}")
        if item["status"] not in c["qa_allowed_status"]: fail("non-passing qa evidence")
        if not isinstance(item["name"], str) or not item["name"].strip(): fail("empty qa evidence name")
        if item["name"] in names: fail("duplicate qa evidence name")
        names.add(item["name"])
        if not isinstance(item["evidence_ref"], str) or not re.fullmatch(c["evidence_ref_pattern"], item["evidence_ref"]): fail("invalid qa evidence_ref")
        if ".." in Path(item["evidence_ref"]).parts: fail("qa evidence_ref traversal forbidden")
        if item["evidence_ref"] in refs: fail("duplicate qa evidence_ref")
        refs.add(item["evidence_ref"])
    rb = data["rollback"]
    if not isinstance(rb, dict): fail("rollback must be an object")
    for key in c["rollback_required"]:
        if not rb.get(key): fail(f"rollback missing {key}")
    if not re.fullmatch(c["rollback_commit_pattern"], rb["known_good_commit"]): fail("invalid rollback commit")
    if not re.fullmatch(c["release_id_pattern"], rb["known_good_release_id"]): fail("invalid rollback release id")
    if not re.fullmatch(c["procedure_ref_pattern"], rb["procedure_ref"]): fail("invalid rollback procedure_ref")
    auth = data["authorization"]
    if not isinstance(auth, dict): fail("authorization must be an object")
    for key in c["authorization_required"]:
        if key not in auth: fail(f"authorization missing {key}")
    if not isinstance(auth["human_release_approved"], bool): fail("human_release_approved must be boolean")
    if publishing:
        if c["forbid_publish_when_project_production_started_false"] and not production_started: fail("publish forbidden while production_started=false")
        if auth["release_gate"] != c["release_gate_required_value"]: fail("publish forbidden before release gate")
        if c["human_release_approved_required_for_publish"] and auth["human_release_approved"] is not True: fail("publish requires explicit human approval")
        if c.get("publish_requires_distinct_rollback_commit") and rb["known_good_commit"] == data["source_commit"]: fail("publish rollback commit must differ from source_commit")
    return True

def main():
    if len(sys.argv) < 2:
        print("usage: validate_release_rollback_manifest.py MANIFEST [--publish] [--production-started]", file=sys.stderr); return 2
    spec = json.loads(SPEC.read_text())
    data = json.loads(Path(sys.argv[1]).read_text())
    try: validate(data, spec, "--publish" in sys.argv[2:], "--production-started" in sys.argv[2:])
    except (ValueError, KeyError, TypeError) as e:
        print(f"FAIL: {e}", file=sys.stderr); return 1
    print("PASS: release/rollback manifest contract")
    return 0
if __name__ == "__main__": raise SystemExit(main())
