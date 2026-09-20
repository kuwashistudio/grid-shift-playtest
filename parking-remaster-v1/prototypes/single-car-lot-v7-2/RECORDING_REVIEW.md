# V7.2 Recording Review

User-supplied iPhone microphone recording was reviewed locally.

Observed:
- Motion itself is now close to target.
- Snap skid traces read as polygonal because V7.1 renders frame-to-frame straight line segments during a ~0.16s high-displacement snap.
- The audio recording shows a strong harmonic ladder / tonal sweep, consistent with audible oscillator nodes rather than an engine-like broadband combustion texture.
- Direct system-audio capture was not present in the user's screen recording; microphone capture did record the speaker output.

V7.2 corrections:
- Rear tire contact positions are accumulated as per-phase point strokes.
- Blast, snap, and exit are separate strokes; there is no connector across non-skid phases.
- Snap strokes are rendered with quadratic smoothing through rear-wheel contact points.
- Inner/right rear mark remains thinner/lighter than outer/left mark.
- Audible OscillatorNode engine path is removed.
- Temporary engine is generated from a looped randomized combustion-pulse AudioBuffer, shaped with low-pass/body filters and variable playbackRate.
- Tire sound uses filtered broadband noise rather than pitched chirps.
- V6/V7 cadence is unchanged.
