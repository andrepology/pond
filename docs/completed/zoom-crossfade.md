## Zoom crossfade: findings and options

### What we learned

- Perspective camera `zoom` stays 1; scroll adjusts CameraControls dolly distance. Use `CameraControls.getDistance()` (or a proxy) as the zoom driver.
- Crossfading off camera-to-center distance must be stable under orbit. Using dolly distance avoids orbit-induced changes to the driver.
- Transparency + points can vanish due to:
  - Frustum culling of the `Points` center
  - Depth test interactions with transparent water
  - Small star sphere radius relative to the near plane or camera motion
- Reliable visibility requires: `frustumCulled=false`, `depthWrite=false`, and often `depthTest=false` for the starfield.

### Crossfade target behavior

- Outside (far): water 1, stars 0
- Transition band: smooth fade between thresholds
- Inside (near): water 0, stars 1

### Three implementation plans

1) Dolly-driven + camera-locked starfield (recommended)
- Driver: `getDistance()` mapped via `smoothstep(start,end, distance)`
- Starfield follows camera position each frame (skybox-like); `depthTest=false`, `frustumCulled=false`
- Pass opacity via ref/prop; water uses inverse opacity via material ref
- Pros: robust under orbit and sorting; simplest mental model
- Cons: minor extra per-frame transform

2) Center-distance + world-centered starfield
- Driver: camera distance to pond center with thresholds
- Star sphere scaled to fit inside water; `depthTest=false`, `frustumCulled=false`
- Pros: intuitive relative to pond center
- Cons: still sensitive to occlusion unless `depthTest=false`; requires stable center

3) Post-processing overlay
- Render stars in a separate pass/layer, composited additively over scene
- Pros: visually robust
- Cons: heavier and more complex than needed here

### Picked plan: (1) Dolly-driven + camera-locked starfield

- Stable under orbit, minimal state, and straightforward tuning of thresholds (e.g., start=1.4, end=1.5).
- Implementation steps:
  - Make starfield follow camera (local to its parent)
  - Ensure `depthTest=false`, `depthWrite=false`, `frustumCulled=false`
  - Compute `opacity = 1 - smoothstep(start,end,distance)`; apply inverse for water
  - Keep thresholds tweakable


