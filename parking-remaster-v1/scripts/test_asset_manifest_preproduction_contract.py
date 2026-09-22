#!/usr/bin/env python3
import hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
contract = json.loads((ROOT / "qa" / "ASSET_MANIFEST_PREPRODUCTION_CONTRACT_V1.json").read_text())
rules = contract["manifest_rules"]
assert contract["status"] == "PREPARATION_ONLY"
assert all(contract["authority_boundary"].values())
assert rules["path_must_be_relative_and_under_root"] and rules["path_traversal_forbidden"]
assert rules["duplicate_paths_forbidden"] and rules["deterministic_order"] == "path_ascending"
assert contract["release_link"]["require_exact_fingerprint_match_before_publish"] is True

sha_re = re.compile(rules["sha256_pattern"])
locked = contract["locked_assets"]
assert len({x["path"] for x in locked}) == len(locked)
for item in locked:
    p = item["path"]
    assert not p.startswith("/") and ".." not in Path(p).parts
    assert sha_re.fullmatch(item["sha256"])
    assert item["role"] in rules["allowed_roles"]
    assert item["provenance"] in rules["allowed_provenance"]
    disk = ROOT / p
    assert disk.is_file(), f"locked asset missing: {p}"
    actual = hashlib.sha256(disk.read_bytes()).hexdigest()
    assert actual == item["sha256"], f"locked asset hash mismatch: {p}"

# Canonical fingerprint algorithm must be deterministic and order-independent at input.
fixture = [
    {"path":"assets/z.webp","sha256":"a"*64,"bytes":2,"role":"runtime_asset","provenance":"PROJECT_AUTHORED"},
    {"path":"assets/a.webp","sha256":"b"*64,"bytes":1,"role":"ui_asset","provenance":"PROJECT_AUTHORED"}
]
def fingerprint(entries):
    ordered = sorted(entries, key=lambda x: x["path"])
    payload = json.dumps(ordered, ensure_ascii=False, separators=(",", ":")).encode()
    return "sha256:" + hashlib.sha256(payload).hexdigest()
assert fingerprint(fixture) == fingerprint(list(reversed(fixture)))
assert re.fullmatch(r"sha256:[0-9a-f]{64}", fingerprint(fixture))
print("PASS: asset manifest contract, locked hashes, provenance enums, and deterministic fingerprint")
