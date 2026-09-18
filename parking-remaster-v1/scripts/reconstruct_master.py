#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRANSFER = ROOT / ".transfer"
OUT = ROOT / "assets" / "master.webp"

EXPECTED_B64_LEN = 597_492
EXPECTED_BYTES = 448_118
EXPECTED_SHA256 = "535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"

PART_RE = re.compile(r"^master\.part-(\d{2})\.b64$")
PACK_RE = re.compile(r"^master\.pack-(\d{2})-(\d{2})\.b64$")


def read_ascii(path: Path) -> str:
    text = path.read_text(encoding="ascii")
    if any(ch.isspace() for ch in text):
        text = "".join(text.split())
    return text


def load_segment(index: int) -> str:
    direct = TRANSFER / f"master.part-{index:02d}.b64"
    if index == 4:
        a = TRANSFER / "master.part-04a.b64"
        b = TRANSFER / "master.part-04b.b64"
        if a.exists() and b.exists():
            return read_ascii(a) + read_ascii(b)
    if direct.exists():
        return read_ascii(direct)

    for path in TRANSFER.glob("master.pack-??-??.b64"):
        m = PACK_RE.match(path.name)
        if not m:
            continue
        lo, hi = map(int, m.groups())
        if lo <= index <= hi:
            payload = read_ascii(path)
            count = hi - lo + 1
            expected = 20_000 * count
            if hi == 29:
                expected -= 2_508
            if len(payload) != expected:
                raise ValueError(
                    f"{path.name}: expected {expected} chars for parts {lo:02d}-{hi:02d}, got {len(payload)}"
                )
            offset = (index - lo) * 20_000
            if index == 29:
                return payload[offset:]
            return payload[offset:offset + 20_000]

    raise FileNotFoundError(f"missing canonical segment part-{index:02d}")


def main() -> int:
    chunks: list[str] = []
    for index in range(30):
        piece = load_segment(index)
        if index < 29 and len(piece) != 20_000:
            raise ValueError(f"part-{index:02d}: expected 20000 chars, got {len(piece)}")
        chunks.append(piece)

    joined = "".join(chunks)
    if len(joined) != EXPECTED_B64_LEN:
        raise ValueError(f"base64 length mismatch: {len(joined)} != {EXPECTED_B64_LEN}")

    raw = base64.b64decode(joined, validate=True)
    if len(raw) != EXPECTED_BYTES:
        raise ValueError(f"byte length mismatch: {len(raw)} != {EXPECTED_BYTES}")

    digest = hashlib.sha256(raw).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError(f"sha256 mismatch: {digest} != {EXPECTED_SHA256}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(raw)
    print(f"PASS master.webp bytes={len(raw)} sha256={digest}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
