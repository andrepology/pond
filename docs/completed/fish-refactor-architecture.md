## Fish System Deep Critique and Bottom‑Up Redesign

This document is a methodical, engineering‑grade critique and redesign of the fish systems: `Fish.tsx`, `FishBehavior.ts`, and `invokeInnio`. It proceeds in four parts:

1) Thorough critique and understanding of current systems, section by section
2) Lifelike behavior upgrades (synthesizing `missing-fish-behaviors.md` and `innio-lifelike-behavior-plan.md`)
3) Body rendering: from spheres to a smooth envelope
4) Bottom‑up architecture redesign and stepwise implementation plan with quality gates

The goals: simplify, separate concerns, eliminate frame‑time allocations, improve realism, and make each subsystem independently testable.

---

### 1) System Critique (Section‑by‑Section)

This reads the current intentions and pain points without changing functionality.

- Imports & external deps
  - Mixed runtime and type imports; missing type‑only imports demanded by `verbatimModuleSyntax`.
  - Pathing issues (`../../steering/FishBehavior` vs actual location).
  - Heavy set of direct dependencies inside the component (leva, drei, postprocessing, react‑spring, jazz‑react, device context), increasing coupling.

- Global state within `Fish.tsx`
  - The component currently owns: physics state, behavior state, UI/speech orchestration, pointer gesture recognition, audio listener, and rendering. This violates separation of concerns and complicates testing.
  - Many refs (`currentVelocity`, `lastHeadDir`, `wander*`, `tailPositions`, `tailRefs`, `activeRipples`, `activePulseStartTimesRef`) are managed directly here, intertwining logic and presentation.

- Leva controls
  - Useful for tuning, but values are read directly in frame logic. Better to route them through a single params object or context to keep logic decoupled and promote deterministic testing.

- Vector pooling & temp vectors
  - Good initiative to control allocations. However, the pool, temp vectors, and geometry calculations live inside the render component. This prevents reuse and clutters the component. The pool should be a shared utility, and common temp vectors should be encapsulated by the movement system.

- Movement update (`updateMovement`) by state
  - State‑dependent sections: REST/TALK sway, WANDER steering with wander targets and boundary checks, APPROACH seek/arrive, EAT drift.
  - Positives: slowing radius, min‑speed clamp, occasional darting, forward vision point with boundary buffer, interpolated wander targets, easing via `smoothstep`.
  - Issues:
    - All logic sits in the component; difficult to unit test and to reuse.
    - Some clones are still used (e.g., `currentVelocity.current.clone()`); should avoid in frame loop.
    - Uses both behavior decisions and low‑level steering in the same place; better to have behavior produce intent and movement system execute it.

- Tail update (`updateTailSegments`)
  - Implements body wave and spacing using direction vector, with attenuation and different behavior per state.
  - Positives: reasonable, produces pleasing motion.
  - Issues: tied to scene refs; should be fed by a spine abstraction so rendering can choose mesh strategy independently.

- useFrame orchestration
  - Central loop updates behavior, movement, tail, hitbox, perspective line, ripple/pulse effects, UI callbacks.
  - Issues: too many responsibilities; creates hidden coupling between otherwise orthogonal systems (e.g., pulse -> emissive intensity baked here).

- Interaction handlers
  - Fish click triggers AI call; ground plane captures feed gestures (double‑click/long‑press logic) with custom timing thresholds and movement thresholds.
  - Positives: robust pointer logic cross‑platform.
  - Issues: pointer gesture logic belongs in a dedicated utility/hook so it can be reused and mocked in tests.

- Speech system (Html word‑by‑word)
  - Two effects orchestrate word reveal and lifecycle; directly depends on `FishBehavior` for message and stopTalking.
  - Issues: UI orchestration is mixed with movement/physics; should be a separate hook that consumes only an external message/state.

- Effects (Bloom, pulses, ripples)
  - Bloom is inside the fish group; emissive intensities boosted per pulse tick.
  - Ripples are created as standalone meshes added directly to the scene.
  - Issues: effects should be owned by effect managers/hooks with a simple event API (emitPulse, spawnRippleAt), decoupled from the fish body component.

- Behavior state machine (`FishBehavior.ts`)
  - Positives: clear states and transitions; incorporates probabilistic rest and queue of food targets.
  - Issues: ties to `THREE.Vector3` types; couples domain logic to rendering library. Should be pure and independent of Three. Timer and options are internal but no serialization/inspect; hard to test timings.

- invokeInnio coupling
  - `Fish.tsx` reads `me?.root?.draftEntry`, calls `generateResponse`, then pushes text back into behavior.
  - Issues: tightly coupled to a concrete source and side‑effects. Should be dependency‑injected as an interface that returns a `Promise<string>` and events for loading/error.

Key summary of issues
  - Single monolithic component conflating: intent (behavior), control (movement/steering), presentation (geometry/materials), interaction (pointer/AI), and effects.
  - Heavy frame‑time orchestration with allocations and DOM state updates.
  - Coupling to Three.js types inside behavior and to UI details inside physics logic.
  - Testing and evolvability hindered; missing clear boundaries and data contracts.

---

### 2) Lifelike Behavior Upgrades (Synthesized)

Based on `missing-fish-behaviors.md` and `innio-lifelike-behavior-plan.md`:

- High‑priority (must‑have)
  - Maintain minimum speed envelope to avoid stalls; clamp velocity range.
  - Darting bursts with short acceleration spikes; random but bounded.
  - Vision‑based boundary avoidance with buffer; preemptive steering away.
  - True 3D wander using spherical coordinate offset around a forward point.
  - Probabilistic rest in WANDER at intervals (already present; keep and tune).

- Natural swimming dynamics
  - Burst‑glide cycle with phase state: burst 0.3–0.5s, glide 0.5–1.5s, intensity varies 0.3x–1.2x base.
  - Momentum/drag lite: integrate forces -> velocity -> position to avoid instant direction changes; apply simple quadratic drag.
  - Sinusoidal body wave driven by speed; frequency and amplitude scale with target speed.
  - Banking (roll) into turns proportional to lateral acceleration.

- Contextual speed control
  - Reduce speed in awareness zone near boundary; increase near food target; special panic burst if startled (future).

- TALK state nuance
  - Option A: remain stationary with gentle sway (current approach).
  - Option B: keep moving along pre‑talk velocity with reduced speed and more pronounced sway (more lifelike).

- Effects alignment
  - Pulses propagate from head down spine timed to burst phase and user clicks.
  - Ripples spawn on feed impacts on the ground plane; pooled and batched to avoid GC.

---

### 3) From Spheres to a Smooth Body Envelope

We want a visually continuous fish body while retaining the procedural spine and tail dynamics. Viable strategies (ordered by practicality):

1) Tube along a spline spine (recommended)
  - Maintain a spine: ordered points from head through tail segments.
  - Build a `TubeBody` mesh by sweeping a circular (or elliptical) cross‑section along the spine using a curve (CatmullRomCurve3). Control radius along length with a taper function; optional vertical flattening for fish silhouette.
  - Implementation details:
    - Use a custom `BufferGeometry` for performance: preallocate vertex/index buffers for fixed segment counts and update in place each frame from the latest spine points.
    - Recompute tangents/normals minimally: for toon shading, stable vertex normals suffice; recompute smoothed normals when the spine updates, or approximate using Frenet frames.
    - Materials: `MeshToonMaterial` or `MeshStandardMaterial` with matcap/toon ramp; emissive band can be applied via vertex color ramp along V coordinate.
    - Keep tail spheres optionally for emissive pulses, or transfer pulse intensity into vertex colors/emissive map along the tube.

2) Skinned mesh with bones
  - Build a simple low‑poly fish, rig with a chain of bones matching the procedural spine; drive bones via the same tail wave and turn logic.
  - Pros: high visual quality; easy to add fins that animate.
  - Cons: upfront asset work; runtime complexity for skeletal animation.

3) Implicit surface (metaballs / marching cubes)
  - Combine spheres via an isosurface for a perfectly smooth envelope.
  - Cons: computationally expensive on CPU; requires GPU implementation or coarse resolution; overkill here.

Recommendation: implement (1) now with a `Spine` abstraction and a `TubeBody` that updates buffers in place. Consider (2) later if we add authored art assets.

---

### 4) Bottom‑Up Architecture Redesign

Principles
  - Pure domain logic (behavior) independent of Three/React.
  - Movement system owns integrator, steering, and time‑step; consumes behavior intent and outputs a spine (head + segments positions) and orientation.
  - Rendering consumes a spine and visual params to draw the body (tube) and effects.
  - Interaction is a thin layer that emits domain events (feedAt, startTalkWith(message)).
  - All frame logic allocation‑free; central vector pool or typed arrays.

Proposed module layout

- core/
  - `vector-pool.ts`: reusable vector pool; typed array helpers for contiguous positions.
  - `integrator.ts`: force integration (mass, drag), helpers: clampSpeed, applySteer.
  - `spine.ts`: spine state (Float32Arrays), utilities to update head/tail positions, compute tangents.

- behavior/
  - `fish-behavior.ts`: pure FSM with states, timers, queue. Operates on plain numbers/vectors (our own minimal `Vec3` interface) — no Three imports. Inputs: tick(dt, context). Outputs: intent { mode, target?, rest?, talkMessage? }.
  - Tests for transitions and timing.

- movement/
  - `useFishMovement.ts`: React hook that owns movement params (from Leva or props), reads behavior intent, updates physics and spine per frame (`useFrame`). Exposes read‑only spine ref and head orientation; emits events (onPulse, onRipple, onPositionUpdate).
  - Implements: wander target interpolation, boundary awareness/avoidance, burst‑glide cycle, speed context, sinusoidal body wave, banking roll value.

- render/
  - `FishBody.tsx`: presentation component. Props: spine ref, bank angle, emissivePulse API. Internally renders `TubeBody` and optional fins. No behavior or movement logic inside.
  - `TubeBody.tsx`: low‑level BufferGeometry builder/updater for the swept body.
  - `FishGlow.tsx`: optional effect layer (bloom tuning, emissive pulses -> vertex colors or material uniforms).

- interaction/
  - `usePointerGestures.ts`: platform‑agnostic double‑click/long‑press; returns handlers to spread on meshes.
  - `useFishInteraction.ts`: composes gestures with domain events (feedAt) and AI speak triggers; owns spring/pulse trigger timing; exposes { onFishClick, onFeedAt, isLoading }.

- speech/
  - `useFishSpeech.ts`: orchestrates word‑by‑word reveal independent of behavior; consumes an external `message` and `isTalking` flag; exposes UI data for `Html`.

- ai/
  - `invokeInnio.ts`: define interface `InnioClient` with methods `reset`, `respond(text): Promise<string>`. Provide default implementation and allow dependency injection.

- config/
  - `constants.ts`: all tunables (speeds, radii, durations, buffers, pulse params) with comments; single source of truth.
  - `types.ts`: shared interfaces and type‑only imports.

Data flow (runtime)
  - Interaction emits domain events (feed at position, request talk).
  - Behavior FSM consumes events and time, decides intent (wander/approach/eat/rest/talk, targets/rest durations).
  - Movement system consumes intent and params, integrates forces, updates spine and bank angle, emits pulses/ripples.
  - Renderer consumes spine/bank/pulses and draws. Speech UI consumes message/flags only.

Performance guidelines
  - No object creation in `useFrame`; use preallocated vectors or typed arrays.
  - BufferGeometry updated in place (positions, normals, colors); avoid `new` geometry per frame.
  - State updates (`setState`) only for UI changes, not every frame. Movement uses refs.
  - Minimal work in TALK state; respect HMR by guarding dev‑only logs behind `import.meta.env.DEV`.

---

### 5) Stepwise Implementation Plan with Quality Gates

Phase 0 — Groundwork
  - Add `config/constants.ts`, `config/types.ts`, and `ai/invokeInnio.ts` interface with default client.
  - Extract `behavior/fish-behavior.ts` from current `FishBehavior.ts`, removing Three imports; port tests for transitions.
  - Quality gate: behavior unit tests green; type‑only imports pass linter.

Phase 1 — Movement core
  - Create `core/vector-pool.ts`, `core/integrator.ts`, `core/spine.ts`.
  - Implement `useFishMovement` hook with: min/max speed clamp, wander target interpolation, 3D wander, vision boundary avoidance with buffer zones (awareness/caution/danger), approach/arrive, probabilistic rest (from behavior), burst‑glide phase, simple drag.
  - Preserve existing visible behavior outputs for now (tail spheres) to validate movement.
  - Quality gate: no frame allocations (track via dev counters); fish never clips boundaries; movement feels natural.

Phase 2 — Rendering envelope
  - Implement `render/TubeBody.tsx` with preallocated `BufferGeometry` updated from spine; taper and vertical flattening; optional vertex color ramp for emissive.
  - Implement `render/FishBody.tsx` to compose tube + optional fins; accept bank angle to tilt group.
  - Replace tail sphere visuals with tube body; keep head sphere temporarily as landmark, then remove.
  - Quality gate: stable 60fps; normals correct; no geometry rebuilds per frame; visual continuity along body.

Phase 3 — Interaction and effects
  - Extract `usePointerGestures` and `useFishInteraction`; wire pulses and ripples through a small effect manager with pooling.
  - Decouple speech with `useFishSpeech`; render Html from hook state only.
  - Quality gate: identical UX for feed and talk; zero pointer false positives; no memory growth after 5 minutes.

Phase 4 — Polish and AI decoupling
  - Inject `InnioClient` into `useFishInteraction`; default to mock; handle loading/error states.
  - Expose a minimal `Fish` component API: `{ onPositionUpdate, aiClient?, debug? }`.
  - Add Leva bridge: one place to read controls and push into `useFishMovement` params.
  - Quality gate: lints clean; sizes/types documented in `constants.ts`; behavior and movement independently demoable.

De‑risking & Testing
  - Add a headless movement test that runs 10k frames and asserts boundary compliance and speed envelope without React.
  - Add an allocation counter in dev to assert zero new allocations per frame under fixed camera.
  - Visual QA checklist: turn smoothness, banking proportionality, burst‑glide rhythm, near‑boundary deceleration, approach momentum.

---

### 6) Notes on Migration & Compatibility

- Keep current fish visual (spheres) behind a feature flag while bringing up the tube body; toggle via Leva.
- Provide shims for `FishBehavior` API during transition: `getMessage`, `startTalking`, `stopTalking` remain until UI hook consumes new message source.
- Maintain the existing ripple/pulse visuals initially; migrate intensity to vertex colors once TubeBody is stable.

---

### 7) Appendix: Minimal Interfaces

```ts
// config/types.ts
export interface Vec3 { x: number; y: number; z: number }

export interface FishIntent {
  state: 'wander' | 'approach' | 'eat' | 'rest' | 'talk'
  target?: Vec3
  talkMessage?: string
}

export interface InnioClient {
  reset(): void
  respond(input: string): Promise<string>
}
```

```ts
// behavior/fish-behavior.ts (shape)
export interface FishBehavior {
  state(): FishIntent['state']
  intent(): FishIntent
  enqueueFood(target: Vec3): void
  startTalking(message?: string): void
  stopTalking(): void
  tick(dt: number, context: { time: number }): void
}
```

```ts
// movement/useFishMovement.ts (shape)
export interface MovementParams {
  maxSpeed: number
  maxSteer: number
  slowingRadius: number
  visionDistance: number
  forwardDistance: number
  wanderRadius: number
  boundary: { min: number; max: number; buffer: number }
}
```

---

This plan keeps the good behaviors you already have, adds lifelike dynamics, replaces the body with a performant tube envelope, and splits responsibilities into clean, testable modules. We proceed in phases with explicit quality gates to ensure we never regress realism or performance.

---

## Progress & Learnings (Phases 0–3)

What we implemented:
- Phase 0
  - Config/types and constants modules created.
  - AI client interface with default mock (`createDefaultInnioClient`).
  - Pure `FishBehaviorFSM` scaffold (no Three deps) extracted.
- Phase 1
  - Core utilities: vector pool, integrator, spine follow.
  - `useFishMovement` hook with lifelike dynamics: 3D wander with target interpolation, vision‑based boundary avoidance, arrive steering, burst‑glide cycle, banking angle output, allocation‑free frame loop.
- Phase 2
  - `TubeBody` buffered geometry updated per frame from spine, with taper and vertical flattening.
  - `FishBody` wrapper with bank rotation.
  - `Fish2` composes head + body and runs side‑by‑side in the pond.
- Phase 3
  - `usePointerGestures` added for desktop double‑tap and mobile long‑press.
  - `useFishMovement` exposes `setFoodTarget(vec3)`; clamped to bounds.
  - `Fish2` includes an invisible ground/handlers to feed; approach + arrive validated. Ripples added with cleanup.

Partial:
- Phase 4 (Speech & AI)
  - Implemented `useFishSpeech` (word‑by‑word reveal) and `useFishInteraction` (AI client wrapper). UI wiring in `Fish2` pending.

Early learnings:
- The tube envelope performs well with preallocated buffers; normals via radial vectors are visually acceptable for toon shading.
- Banking derived from turn rate adds noticeable lifelike feel without extra complexity.
- Keeping wander and boundary logic inside the movement layer simplifies orchestration; behavior FSM should issue high‑level intents (approach/eat/rest/talk) while movement executes steering.

Refinements to plan based on learnings:
- Expose a minimal movement API to accept external "feed" targets (so interaction can set approach goals) while keeping wander as the default.
- Drive speech UI via a focused hook later; for now, add minimal interaction and feeding to validate FSM approach transitions before full talk UX.
- Migrate emissive pulses to vertex colors after interactions land; geometry path is stable.

---

## Next Steps (Refined)

Phase 4 — Speech & AI (minimal first)
- Wire `useFishSpeech` bubble in `Fish2` (click‑to‑talk via `useFishInteraction`).
- Optionally modulate movement during TALK (reduced speed + sway) via `useFishMovement` param.
- Quality gate: loading visible; TALK ends and resumes wander/approach cleanly.

Phase 5 — Effects & polish
- Pulse propagation along spine via vertex colors; ripple pooling on feed impact.
- Finalize Leva bridge and constants tuning.


