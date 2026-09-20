# CHARGE / STRAIGHT-BLAST / REAR-SNAP RESEARCH V1
Date: 2026-09-20

## Why V4 was rejected
V4 changed body attitude before meaningful forward travel. That made the first readable motion diagonal, which contradicted the intended beat: a visible buildup, then a straight violent launch, then a separate rear-swing attitude change.

## Research findings

### 1. Rear-wheel smoke can exist before meaningful vehicle travel
Rear-wheel wheelspin/burnout is longitudinal slip at the driven wheels. If drive torque exceeds available tire-road traction, the rear wheels can spin while the vehicle is stationary or moving slowly; frictional heating creates visible smoke.
- University of Illinois Mechanics Reference: https://mechref.engr.illinois.edu/dyn/ava.html
- The design consequence is that the game does NOT need to rotate the body during the anticipation beat just to justify smoke.

### 2. Rear-end rotation is a different event
A handbrake turn briefly reduces rear lateral grip while the front tires continue rolling and retain greater directional authority. The resulting front/rear force imbalance creates yaw and the rear swings outward.
- Handbrake turn overview: https://en.wikipedia.org/wiki/Handbrake_turn
- Rallycross engineering overview: https://livephysics.com/infographics/engineering-rallycross-the-handbrake-turn/
- The game consequence is that the rear-swing should happen as its own discrete beat, after the straight launch, rather than being blended into the launch.

### 3. Real drifting is a large-sideslip / rear-saturation state
Research literature describes drifting through large sideslip angles, rear-tire saturation, countersteer and rear wheelspin.
- SAE 2006-01-1019: https://saemobilus.sae.org/papers/dynamics-automobile-drifting-2006-01-1019
- Stanford Dynamic Design Lab dissertation: https://ddl.stanford.edu/publications/thesis/dynamics-and-control-drifting-automobiles
- This supports separating body attitude from travel direction during a drift, but it does NOT require the first movement to be diagonal.

### 4. Transient maneuvers should not be treated as one smooth arc
Modern drift-control research explicitly studies highly transient transitions between saturated/sliding and grip regimes.
- Vehicle System Dynamics: https://www.tandfonline.com/doi/abs/10.1080/00423114.2023.2297799
- This supports discrete visual beats for a casual game rather than a single constant-radius animation.

## V5 hard motion contract

### BEAT A — CHARGE / TAME
- Duration target: about 0.36 s.
- Vehicle center must remain fixed.
- Vehicle heading must remain exactly at the initial heading.
- Rear-tire smoke must visibly build.
- No diagonal creep.
- No body yaw.

### BEAT B — STRAIGHT BLAST
- Duration target: about 0.22 s.
- Vehicle travels rapidly straight along the original body axis.
- Heading remains exactly unchanged.
- Lateral X deviation target: effectively zero.
- Smoke trail is allowed behind the rear tires.
- This is the first meaningful translational motion.

### BEAT C — REAR SNAP
- Only after straight launch is visibly established.
- Front axle becomes the dominant visual pivot.
- Rear axle displacement must greatly exceed front axle displacement.
- Target ratio >= 4; current proof achieved 9.13.
- This is the ONLY beat in which the body rotates from vertical to horizontal.

### BEAT D — EXIT BLAST
- Once attitude is aligned, immediately accelerate straight toward the exit.
- No pause after the snap.
- Final heading must be exactly aligned with exit direction.

## V5 proof
Browser run 35484442378:
- total duration 1096.1 ms;
- charge smoke count at sampled buildup: 80;
- straight-blast lateral deviation: 0 px;
- snap front-axle movement: 10.19 px;
- snap rear-axle movement: 93.03 px;
- rear/front movement ratio: 9.13;
- final heading: 0 rad;
- total smoke emissions: 154.

## Non-claims
- This is an arcade-compressed motion language, not a driving simulator.
- The linked YouTube Short was not available for frame-by-frame extraction through the current web reader.
- The purpose is to match the user's intended visual grammar while respecting real tire-slip and yaw principles.
