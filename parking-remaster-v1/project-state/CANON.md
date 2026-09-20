# Parking Remaster — Current CANON

Status: ACTIVE AUTHORITY
Updated: 2026-09-20
Repository: `kuwashistudio/grid-shift-playtest`
Work scope: `parking-remaster-v1/`
Staging: `parking-remaster-v1-staging-20260917`

This file contains **current accepted rules only**. Historical experiments, rejected methods, and superseded gameplay are evidence in existing project files but are not current CANON.

## 1. Product identity and benchmark

- Parking Remaster is an **iPhone-first HTML5 parking puzzle**.
- Successful **Parking Jam / Car Out / Tap Away-style actual gameplay** is the benchmark family.
- Benchmarking is about proven interaction, pacing, legibility, retry desire, and satisfying vehicle motion—not copying artwork.
- The board's visible geometry, the rule that decides whether a car may move, and the car's actual physical movement must agree.
- The legacy hidden-ray blocker + shared curved/Bezier exit runtime is **REJECTED** as gameplay, even though its technical infrastructure passed automated tests.
- Old Level 1/2 gameplay is REJECTED. Level 3 remains LOCKED until the rebuilt core gameplay is accepted.

## 2. Approved visual authority

- The user-approved Parking Jam-style image is the only **VISUAL MASTER**.
- Canonical source: `parking-remaster-v1/assets/master.webp`.
- Git blob: `f0bc5be7d4ae9e4995eaa0302d6fd3ec2098babe`.
- MASTER SHA-256: `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`.
- No redesign, alternative parking-lot style, arbitrary replacement cars, or per-level full-image generation may silently replace the MASTER language.
- The production visual foundation is technically PASS and retained:
  - approved reusable clean plate: `assets/clean_plate.webp`;
  - SHA-256 `5906db99473a51ebf49d21e1bc456869a6588dbec4a17012b8fc4748b7921175`;
  - dimensions 941×1672;
  - 10 MASTER-derived reusable production car sprites under `assets/sprites/`.
- The old patch/reveal architecture is retired.
- Current single-car core-fun prototypes are isolated experiments. Passing an isolated prototype does not authorize bulk visual/content production.

## 3. Instant Start

The first meaningful screen is already playable Level 1.

Forbidden before first gameplay action:
- splash/title gate;
- mode selector;
- main menu;
- Start/Play button;
- tutorial modal;
- Tap to Start;
- dedicated audio-unlock screen.

The first car tap must be a real gameplay action and may simultaneously unlock/recover audio.

Parking Remaster target on target iPhone:
- **first gameplay control available <= 1.0 second**.

Nonessential systems/assets load after interaction is available. No gameplay input may wait for audio recovery.

## 4. AudioContext and iOS/WebKit recovery

Current runtime contract:
- initialize audio from an actual gameplay gesture;
- handle both `suspended` and `interrupted`;
- visibility/page transitions may invalidate audio state;
- use `visibilitychange`, `pagehide`, and `pageshow` recovery logic;
- on the next user gesture, resume or recreate the AudioContext as necessary;
- never delay game input waiting for audio;
- route SFX through a master gain / controlled output chain;
- sound is optional to comprehension;
- visible mute control exists;
- stop/suspend sound when the page is hidden/minimized.

Physical iPhone listening and saved-recording behavior remain authoritative; browser RMS/spectrum values prove signal, not perceived realism.

## 5. Current single-car motion CANON

The accepted direction established from V6 onward is:

**first tame -> nonlinear hard launch -> rear-dominant ~90° snap -> second tame -> stronger hard launch**

Reference timing:
- first tame ~0.54s;
- first blast ~0.32s;
- rear snap ~0.16s;
- second tame ~0.27s;
- second blast ~0.34s;
- full sequence ~1.7s.

Reference geometry:
- straight launch must not pre-turn;
- snap is dominated by rear displacement;
- V6 measured snap rear/front movement ratio about 9.13.

Skid mark CANON from V7.2:
- record actual left/right rear-wheel contact points;
- each snap wheel is one stroke;
- quadratic smoothing produces a continuous arc;
- outside/left rear is darker/thicker;
- inside/right rear is weaker;
- no fake skid during stationary charge/reload;
- marks fade over about 5.6s.

Current prototype V7.3 changes audio only and must not regress this motion/skid behavior.

## 6. Current audio gate

V7.2 was rejected for perceived audio quality: it still sounded like a Famicom/retro-game tone and lacked obvious tire squeal.

V7.3 current architecture:
- jittered combustion events;
- separate low/mid broadband engine roar;
- body resonance and dynamic low-pass shaping;
- gentle saturation/soft clipping;
- filtered broadband tire friction rather than a tonal oscillator;
- strongest squeal during rear snap.

Browser proof is PASS, but **human physical-iPhone feel review is still pending**. Until the user accepts the sound/feel, V7.3 is not a human-quality PASS.

## 7. Level Data and solver parity

One gameplay source of truth: **Level Data**.

Required separation:
- logical layer: movement bounds, vehicle IDs, collision bodies, movement directions, mechanic state, objective;
- presentation layer: sprites/visual placement/animation;
- design metadata: difficulty role, mechanic introduction/mastery, Beat Chart placement.

For any published/rebuilt level:
- schema validation is required;
- solver must prove at least one valid complete solution;
- JavaScript runtime logic and independent Python solver must agree on the same state rules;
- parity is required before publication;
- solver structural complexity is **not** proof of human difficulty or fun.

Legacy Level 1/2 parity and infrastructure remain useful engineering evidence, but their rejected gameplay rule is not CANON.

## 8. Failure design

The fair-failure principle remains:
- deterministic;
- attributable to player action;
- visible from board/path geometry;
- no RNG;
- no global countdown as the first failure system;
- no autonomous pedestrian/crossing actor as the first failure system;
- retry should return to playable state in <=1.5s target;
- fresh player should be able to explain the failure cause after seeing it once.

The selected first failure concept is **shared_exit_conflict**: two player-launched vehicles conflict in the same clearly visible merge/exit zone.

Its old state-machine implementation passed parity, but because the old core movement model was rejected, the mechanic must be revalidated against the rebuilt visible movement rule before it is used in production levels. Never preserve an invisible/conflicting geometry implementation merely because old CI passed.

## 9. 14-level Vertical Slice

Production has **not started**.

The representative Vertical Slice is fixed at:
- 12 Main levels;
- 2 optional Hard levels;
- total 14.

Main difficulty waveform:
1. onboarding confidence
2. easy
3. easy-normal
4. normal
5. small twist
6. recovery
7. normal+
8. first challenge
9. recovery
10. safe teaching of genuine fail/retry
11. learned-mechanic challenge
12. chapter peak

The 2 Hard levels prove optional challenge without making Main progression hostile.

Vertical Slice requirements include:
- all 14 solver-proven;
- all 14 visually reviewed;
- deliberate difficulty wave;
- fresh-player progression without developer explanation;
- visible fair failure;
- immediate retry;
- no mandatory monetization interruption;
- measurable level production time/cost;
- bounded technical debt;
- repeatable target quality.

If the Vertical Slice fails, repair it. Do not scale content.

## 10. Visual Production current location

Reusable visual production infrastructure is technically PASS:
- MASTER locked;
- clean plate locked;
- 10 production sprites locked;
- Level Data-driven clean-plate/sprite runtime path was demonstrated;
- Level 2 controlled authoring and runtime progression were technically proven.

However, physical iPhone review invalidated the old multi-car gameplay. Therefore:
- preserve the reusable visual assets and production tooling;
- do not treat legacy Level 1/2 gameplay as accepted;
- do not author Level 3;
- do not scale to multiple cars until current single-car feel is accepted and one visible multi-car movement rule is prototyped.

## 11. Production phase and scaling

Current macro phase: **PHASE_1_CORE_FUN_PROOF**.
`production_started = false`.

Scale path remains finite:
core-fun proof -> rebuilt Level 1 -> 14-level Vertical Slice -> greenlight -> content-factory proof -> 30-level pilot -> closed external playtest -> controlled release -> validated 144-level production -> release candidate.

No 120/144-level bulk production, elaborate meta, LiveOps, or monetization work may start early.

## 12. Repository safety

- GRID SHIFT production/root files must not be changed.
- Parking Remaster work is limited to `parking-remaster-v1/` and dedicated Parking Remaster workflows unless an explicitly approved repository-level change is required.
- Staging is the implementation branch.
- Main may receive **isolated Parking Remaster public prototype paths** when needed for physical-iPhone human review; this does not authorize unrelated main changes or GRID SHIFT changes.
- Every working turn advances at most one atomic gate.
- CI/numeric PASS never substitutes for human game-quality judgment.
- Physical iPhone look/sound/feel has the highest priority for subjective quality.

## 13. Persistent project-state operating rule

Chat history is no longer the only current-state record.

At the start of every work turn:
1. read `project-state/PROJECT_STATE.json`;
2. read this CANON;
3. read `project-state/GATES.json`;
4. fetch latest staging HEAD;
5. inspect CI/evidence required by the current gate.

At the end of every work turn:
1. commit the actual implementation/evidence;
2. update `GATES.json` if any gate status/evidence changed;
3. update `PROJECT_STATE.json`;
4. leave GitHub as the exact resume point.

A new Chat should be able to resume from:
**“Parking RemasterをGitHubのPROJECT_STATEから再開して。1 Gate進めて”**

Long Chat HANDOFF packages are no longer normal workflow.

## 14. Finite research rule

Research exists to close a named gate, not to create an endless roadmap.

A new Gate may be added only if new evidence reveals a genuinely necessary completion requirement that is not covered by the existing finite registry. Record why it was added and which completion risk it retires.

## 15. Storage policy

Persist:
- code;
- HTML/CSS/JS;
- JSON;
- Markdown;
- workflows;
- small test data;
- project-state information;
- essential lightweight assets.

Do not accumulate without bound:
- temporary screenshots/images;
- large videos;
- long-lived disposable workflow artifacts;
- build caches;
- render intermediates;
- duplicate backup copies.
