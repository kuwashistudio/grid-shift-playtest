#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys, tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/"index.html").read_text(encoding="utf-8")

def req(x,msg):
    if not x: raise AssertionError(msg)

def main():
    scripts=[]
    pos=0
    while True:
        start=html.find("<script",pos)
        if start<0: break
        gt=html.find(">",start)
        end=html.find("</script>",gt)
        req(gt>=0 and end>=0,"unterminated script tag")
        tag=html[start:gt+1]
        body=html[gt+1:end]
        if " src=" not in tag:
            scripts.append(body)
        pos=end+9
    req(scripts,"no inline runtime script found")
    source="\n".join(scripts)
    with tempfile.NamedTemporaryFile("w",suffix=".js",delete=False,encoding="utf-8") as f:
        f.write(source)
        tmp=f.name
    proc=subprocess.run(["node","--check",tmp],text=True,capture_output=True)
    req(proc.returncode==0,"inline runtime JS syntax failed:\n"+proc.stderr)
    print("PASS inline runtime JavaScript syntax")
    return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as e:
        print(f"FAIL {e}",file=sys.stderr)
        raise SystemExit(1)
