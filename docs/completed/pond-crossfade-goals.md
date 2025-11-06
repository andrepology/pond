## Pond crossfade goals and summary

### Goals
- **Zoom-driven crossfade**: Outside the sphere → water visible, stars hidden; Inside → water hidden, stars visible.
- **Orbit-stable**: Orbiting should not cause either layer to disappear or flicker.
- **Simple, tweakable thresholds**: One narrow band (e.g., 1.4 → 1.5) with smooth transition.
- **No per-frame React re-renders**: Drive via refs/material uniforms only.

### Non-goals
- No post-processing layer or external state libraries.
- No complex provider/stores unless we need global UI flags later.

### What we learned
- **Perspective zoom** stays 1; scroll affects `CameraControls` dolly distance → use that as the zoom proxy when needed.
- **Center-distance vs dolly-distance**:
  - Camera-to-center distance changes during orbit if the pivot isn’t fixed, causing brittle fades.
  - Dolley distance (`getDistance()`) is stable under orbit and maps well to a zoom-like control.
- **Transparency and sorting**:
  - Stars can look “gone” due to ordering with transparent water, not just culling.
  - Toggling visibility by opacity made disappearance worse at certain angles.
- **Robust starfield rendering**:
  - Set `frustumCulled=false`, `depthTest=false`, `depthWrite=false`, additive blending.
  - Keep points always visible; adjust opacity uniform only.
  - Keep star sphere comfortably inside the water shell; avoid near-plane issues.
- **Fade math**:
  - Use `smoothstep(start, end, value)` for a smooth, controllable band.
  - If we need a boolean (UI), add small hysteresis around the threshold.

### Candidate designs (when we reintroduce fade)
- **Plan A (recommended)**: Dolly-driven crossfade + camera-locked starfield
  - Driver: `opacity = 1 - smoothstep(1.4, 1.5, getDistance())`.
  - Starfield follows camera position each frame (skybox-like), avoiding orbit artifacts.
  - Stars: additive, `depthTest=false`, `depthWrite=false`, `frustumCulled=false`.
  - Water opacity = `1 - opacity` via material ref.

- **Plan B**: Signed distance to sphere surface (world center + world radius)
  - `signed = cameraToCenter - radiusWorld`; `opacity = 1 - smoothstep(-band, band, signed)`.
  - Keep robust starfield render settings; optional camera-locking for extra stability.

- **Plan C**: Zoom provider (only if many consumers)
  - Centralize the fade factor for UI and scene, but keep rendering settings from Plan A.

### Implementation checklist (when ready)
- Set robust starfield render settings (no depth test, no cull, additive).
- Pick Plan A; implement camera-follow wrapper for starfield.
- Drive crossfade from `getDistance()` with `smoothstep(1.4, 1.5, d)`.
- Apply inverse opacity to water via material ref; do not toggle visibility by opacity.
- Tune thresholds and band after visual verification.


