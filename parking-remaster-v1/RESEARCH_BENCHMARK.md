# Parking Remaster — Benchmark Research & QA Criteria

Updated: 2026-09-18

## Research target
Parking Jam-style mobile puzzle games with proven scale and current player feedback.

## Proven core pattern
1. The player should understand the objective immediately: clear the lot by moving cars in the correct order.
2. Input should be direct and low-friction. A tap/swipe should produce an immediate, readable response.
3. A blocked move must communicate *why* it failed without creating ambiguity about whether the tap registered.
4. Legal exits should feel fast and satisfying; animation must never delay the next decision unnecessarily.
5. Difficulty should come from ordering/space reasoning, not hidden rules, unclear hitboxes, artificial move limits, or visual confusion.
6. Visual contrast between cars, obstacles, walls, and exit direction is a gameplay requirement, not decoration.
7. A completed level must always transition/restart reliably; freezes or black screens are critical failures.
8. The first level should teach by play, not by text-heavy explanation.

## Evidence incorporated
- Parking Jam 3D: 100M+ Google Play installs / 1.7M+ reviews; the core description emphasizes clearing all cars in the correct order.
- Current player feedback specifically calls out poor wall visibility as a usability problem.
- Comparable titles receive strong negative feedback when ads interrupt every short level, when the game freezes after completion, or when imposed move limits make a level feel impossible.
- Therefore this remaster prioritizes uninterrupted core play and deterministic solvability before any monetization/meta systems.

## Parking Remaster v1 QA gates

### G4 — visual/asset-load QA
PASS only if:
- MASTER loads without fallback/substitution.
- All 10 interactive cars align with the approved visual master.
- EXIT direction is immediately readable.
- Car/obstacle boundaries remain readable at iPhone portrait size.
- No transparent/blank/black initial frame.
- No text or overlay obscures the puzzle.
- No layout shift after load.

### G5 — interaction QA
PASS only if:
- Every tappable car registers consistently.
- Blocked tap produces immediate bump feedback.
- Blocked feedback never resembles a legal move.
- Legal car exits in its permitted direction without clipping another car/obstacle.
- Input remains responsive during/after animation.
- Rapid repeated taps cannot corrupt state or trigger duplicate exits.
- Sound/vibration are supplemental; the puzzle remains fully understandable muted.

### G6 — solve/restart/mobile QA
PASS only if:
- The level has at least one deterministic full solution from initial state.
- Auto-solve and manual-equivalent sequence end in the same valid win state.
- Win state cannot trigger early.
- Restart restores the exact initial board and interaction state.
- Repeated solve -> restart cycles do not accumulate stale state.
- Portrait viewport works without horizontal scrolling or accidental browser zoom.
- No freeze, black screen, or dead input after completion.
- First meaningful interaction is available immediately; no mandatory tutorial text blocks play.

## Anti-patterns explicitly rejected
- Difficulty by unclear hitbox/low contrast.
- Impossible or deceptive move-count constraints.
- Long forced delays between moves.
- Full-screen interruption after every short puzzle.
- Hidden mechanics not visible in the board state.
- Decorative motion that reduces touch clarity.
- Any visual redesign that diverges from the approved MASTER.

## Implementation principle
Benchmark the successful interaction grammar, not the monetization clutter. The target is a clean, fast, deterministic parking-order puzzle that feels understandable on the first tap and remains stable through repeated solves.


## iPhone touch target and haptics audit — 2026-09-18
- Apple HIG requires touch-first interaction on iPhone and recommends frequently used controls at 44x44 pt or larger.
- The original car hitboxes had narrow dimensions down to 94 MASTER pixels, which shrink below 44 pt on common iPhone portrait widths.
- Runtime hitboxes were expanded invisibly to a minimum 112x112 MASTER pixels where needed. At 375 CSS px viewport width this yields about 44.6 CSS px; at 390 px it yields about 46.4 px.
- Pairwise geometry check across all 10 expanded hitboxes reports zero overlaps, so easier tapping does not introduce ambiguous target selection.
- Safari/iOS Safari does not implement the standard Vibration API according to current WebKit/MDN compatibility data. Therefore `navigator.vibrate()` is optional enhancement only; no gameplay meaning or QA PASS may depend on haptic feedback.
- Do not add checkbox/switch-based Safari haptic hacks or other nonstandard vibration workarounds. They increase fragility and are unnecessary because blocked/legal feedback is already conveyed visually and audibly.
