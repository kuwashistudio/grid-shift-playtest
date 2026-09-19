#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("level",type=Path)
    ap.add_argument("--out-dir",type=Path,required=True)
    a=ap.parse_args()
    level=json.loads(a.level.read_text(encoding="utf-8"))
    bg=Image.open(ROOT/"assets"/"clean_plate.webp").convert("RGBA")
    for v in level["vehicles"]:
        x1,y1,x2,y2=map(int,v["sprite"])
        sp=Image.open(ROOT/"assets"/"sprites"/f"{v['id']}.webp").convert("RGBA")
        if sp.size!=(x2-x1,y2-y1):
            raise SystemExit(f"{v['id']} sprite dimensions {sp.size} != rect {(x2-x1,y2-y1)}")
        bg.alpha_composite(sp,(x1,y1))
    a.out_dir.mkdir(parents=True,exist_ok=True)
    lot=bg.convert("RGB").crop((60,420,880,1410))
    full=a.out_dir/f"{level['id']}_lot_full.jpg"
    phone=a.out_dir/f"{level['id']}_lot_390.jpg"
    lot.save(full,quality=93)
    target_h=round(lot.height*390/lot.width)
    lot.resize((390,target_h),Image.Resampling.LANCZOS).save(phone,quality=91)
    print(json.dumps({"status":"PASS","full":str(full),"phone":str(phone),"crop":[60,420,880,1410],"phone_width":390},indent=2))
if __name__=="__main__":
    main()
