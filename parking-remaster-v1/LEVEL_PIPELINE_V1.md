# Parking Remaster — Level Data & Solver Pipeline v1

Updated: 2026-09-18
Status: CANON DESIGN CONTRACT
Parent: PRODUCTION_BLUEPRINT_V1.md / VERTICAL_SLICE_GATE_V1.md

## Research-derived principles

King describes large-scale casual level production as theory, thought, tools and testing rather than one-off manual authoring. Public descriptions of King's Level Library show level-wide metadata for comparing objectives and elements, while Beat Charts track when concepts are introduced and reused.

GDC examples for organizing hundreds of levels likewise emphasize searchable metadata, progression views and support tools that expose difficulty flow rather than designer memory.

Puzzle-production research shows that automatic validation saves designer time by proving solvability and estimating structural properties. Deterministic mechanics are especially suitable for state-space search: board state + legal input -> next state.

Automated generation research also warns that generated content may be invalid, unengaging or unsolvable. Generation therefore remains locked until validation and design conditioning are proven.

## Architecture decision

**One source of gameplay truth: Level Data.**

Runtime and Solver must read the same logical level definition. Do not maintain runtime-only coordinates, solver-only coordinates or a separate hand-maintained blocker graph.

## Layer separation

### Logical layer
Used by runtime + solver: board movement bounds, vehicle IDs, logical body rectangles, movement directions, mechanic state, hazards/timing rules when introduced, objective.

### Presentation layer
Used by renderer: sprite rectangle/asset, visual master, animation presentation, tutorial focus. Presentation must never secretly change logical difficulty.

### Design metadata
Used by Level Library / Beat Chart: role in difficulty wave, introduced mechanics, mastered mechanics, combinations, target band, expected player experience.

## Current schema

schemas/level_v1.schema.json supports the current vehicle-blocking core only. New hard-failure mechanics must extend the schema deliberately.

## Level 1 migration checkpoint

levels/level_001.json mirrors the current hard-coded Level 1 logical state.

Current exact solver analysis:
- 10 vehicles
- 3 legal initial vehicles
- 7,210 valid complete clear orders
- 90 unique states explored
- no hard-failure mechanic

Interpretation: Level 1 is a confidence/onboarding board with many ways to succeed. It must not calibrate normal/challenge difficulty.

## Solver v0

scripts/solve_level.py uses deterministic exhaustive search with memoization because current state is simply which vehicles remain. At 10 vehicles exact search is cheap and transparent.

Outputs: solvable, exact solution count, one canonical solution, states explored, legal initial moves, initial blockers and structural metrics v0.

## Critical limitation

**Solver difficulty is not human difficulty.** Statistical puzzle research shows completion probability alone is an incomplete difficulty model; player action distributions provide richer information.

Difficulty estimation therefore has layers:
1. Solver structural features
2. Designer target band
3. Fresh-player observations
4. Controlled-release telemetry
5. Refit/reweight the model

Never label a level Hard solely because the solver explores many states.

## Next migration gates

### LDP-1 — Data parity — PASS
Level 1 JSON reproduces the approved Level 1 logical state exactly.

### LDP-2 — Runtime consumes data — PASS
Runtime consumes the generated bundle derived from canonical Level JSON; hard-coded vehicle defs and runtime JSON fetch are removed.

### LDP-3 — Solver parity — PASS
Browser/Node functional core and independent Python solver agree on legal moves and blocker IDs across all 1,024 possible Level 1 vehicle subsets.

### LDP-4 — Difficulty features v1
Add dependency depth, branch distribution, forced-choice ratio, decision entropy, recovery cost and later hazard/timing load.

### LDP-5 — Vertical Slice authoring
Only then author Levels 2-14. Every candidate is schema-valid, solver-valid, metadata-complete, duplicate-screened, human-played and intentionally positioned on the Beat Chart.

## Generation policy

Do not build a procedural generator yet. First create the 14-level Vertical Slice by controlled authoring with solver assistance. Only after we understand what good Parking Remaster levels look like should generation be considered.

If generation begins later: generator proposes; solver validates; structural filters reject obvious duplicates/bad difficulty; human review remains required.

## Production consequence

The next implementation task is not Level 2. It is LDP-4: research and implement difficulty features v1 so candidate levels can be compared structurally before Vertical Slice authoring.
