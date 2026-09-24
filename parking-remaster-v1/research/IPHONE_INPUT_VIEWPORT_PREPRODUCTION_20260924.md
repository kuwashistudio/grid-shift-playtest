# iPhone input / viewport preproduction research — 2026-09-24

Scope: non-subjective prerequisite evidence only. This does **not** authorize P1-007, P1-008, multi-car gameplay, Level 3, or production.

## Question
What finite browser/runtime invariants should the rebuilt Parking Remaster preserve so a target-iPhone tap maps to gameplay deterministically even when Safari viewport/UI state changes?

## Sources checked
- WebKit, “New WebKit Features in Safari 13”: Pointer Events and Visual Viewport API are supported; Visual Viewport exists specifically to expose the actually visible region including zoom/onscreen-keyboard effects.
- MDN Pointer Events: touch is represented through the hardware-agnostic Pointer Events model; direct-manipulation touch may use implicit pointer capture; `pointercancel` can occur when the browser takes over a gesture.
- MDN `touch-action`: browser panning/zooming can cancel an application pointer stream; the intended browser gesture policy should be declared before listeners run.
- MDN VisualViewport / resize: visual viewport dimensions can change independently of layout viewport and emit resize events.
- MDN viewport meta: `width=device-width` establishes device-width layout behavior; `viewport-fit=cover` requires safe-area handling for important controls.

## Locked preproduction conclusion
1. Gameplay legality stays in Level Data/world coordinates. CSS pixels, devicePixelRatio, orientation, VisualViewport size/offset, safe-area insets and browser chrome are presentation/input-projection concerns only.
2. A pointer sample is projected exactly once through an explicit viewport transform into board/world coordinates before hit testing. Runtime/solver legality never consumes raw clientX/clientY.
3. The same world-space point must select the same vehicle and produce the same legal/illegal decision across portrait resize, browser-toolbar resize, VisualViewport offset/scale changes, and DPR changes, within a declared projection tolerance.
4. Pointer cancellation is a cancelled interaction: it must not launch/move a vehicle or mutate gameplay state. No synthetic click fallback may double-fire the same physical tap.
5. Gameplay surface declares an explicit touch-action policy suitable for the chosen interaction; no document-wide preventDefault dependency is accepted as the sole gesture-control mechanism.
6. Safe-area/layout adaptation may move presentation controls but must not alter Level Data geometry or solver decisions.
7. First actionable gameplay remains <=1.0 s and cannot wait for viewport stabilization or audio recovery.

## Required machine fixtures before P1-008 activation
- identical world-point hit result under at least portrait baseline, changed visual viewport height/offset, changed DPR, and orientation-sized projection fixtures;
- pointercancel produces zero gameplay-state mutation;
- one physical pointer sequence produces at most one gameplay action;
- projection round-trip error is bounded and explicit;
- raw viewport values are absent from the logical legal-move function contract.

## Human boundary
These checks prove deterministic input plumbing only. They do not prove target size, comfort, legibility, satisfaction, audio quality, or fresh-player comprehension. Those remain Human evidence at their existing finite gates.

Research is sufficient for this prerequisite. Repeat only if a target-iPhone failure demonstrates a concrete mismatch or the input model materially changes.