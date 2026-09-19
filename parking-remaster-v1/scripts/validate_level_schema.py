#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
from jsonschema import Draft202012Validator

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("level",type=Path)
    ap.add_argument("schema",type=Path)
    a=ap.parse_args()
    level=json.loads(a.level.read_text(encoding="utf-8"))
    schema=json.loads(a.schema.read_text(encoding="utf-8"))
    errors=sorted(Draft202012Validator(schema).iter_errors(level),key=lambda e:list(e.path))
    if errors:
        for e in errors:
            print("FAIL",list(e.path),e.message,file=sys.stderr)
        return 1
    print(f"PASS schema {a.level.name} -> {a.schema.name}")
    return 0
if __name__=="__main__":
    raise SystemExit(main())
