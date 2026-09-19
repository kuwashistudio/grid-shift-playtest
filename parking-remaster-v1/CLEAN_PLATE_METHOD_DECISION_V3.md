# Parking Remaster — Clean Plate Method Decision v3

Updated: 2026-09-19
Status: SUPERSEDED / HISTORICAL ONLY

This document used to describe the LaMa comparison phase. It is retained only as historical evidence and must not be used as the current implementation decision.

## Current CANON

- VP-3 reusable car sprites: **PASS / CLOSED**.
- Production clean plate: **BLOCKED / MISSING**.
- LaMa standard/refined/sequential/hybrid/local variants, including independent-local margin 7 and margin 26: **REJECTED / RETIRED**.
- OpenCV Telea/Navier-Stokes/xphoto, bmquilting, rectified generic inpaint, naïve exemplar fill and failed structured low-field prototypes: **REJECTED / RETIRED**.
- Active clean-plate route: `STRUCTURED_ASPHALT_FIELD_PLUS_VECTOR_MARKINGS`.
- Next gate: **VP-2D Parking Structure Model** — detect visible parking markings, group line families, infer slot/grid structure, model known-asphalt illumination, and define MASTER-only donor texture candidates before generating any new clean-plate pixels.
- Direct visual QA is authoritative. Late CI or target-scale-only review cannot promote an already rejected clean-plate candidate.
- Level 2 remains locked until clean plate PASS, Level 1 clean-plate+sprite rebuild PASS, patch dependency removal, and mobile/runtime QA.
