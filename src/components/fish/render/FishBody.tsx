import React, { useRef, useMemo } from 'react'
import type { SpineState } from '../core/Spine'
import { TubeBody } from './TubeBody'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createFoodMarkerMaterial } from '../../../fish/components/FoodVisuals'
import { useControls, folder } from 'leva'

// Custom shader material for spine spheres with size variation and traveling wave
function createSpineSphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      opacity: { value: 1.0 },
      tailFadeStrength: { value: 0.6 },
      sphereRadius: { value: 64 },
      distanceFalloff: { value: 1.0 },
      coreBrightness: { value: 0.8 },
      minStarSize: { value: 2.0 },
      maxRenderDistance: { value: 100 },
      waveSpeed: { value: 0.4 },
      waveStrength: { value: 1.0 },
      wavelength: { value: 2.5 },
      headBoost: { value: 0.3 },
      baseSize: { value: 0.4 },
      sizeVariation: { value: 0.15 },
      phaseStrength: { value: 0.3 },
      phaseSpeed: { value: 1.5 },
    },
    vertexShader: `
      attribute float spinePosition; // 0.0 = head, 1.0 = tail
      attribute float phaseOffset;   // Per-sphere animation phase
      uniform float time;
      uniform float sphereRadius;
      uniform float minStarSize;
      uniform float maxRenderDistance;
      uniform float waveSpeed;
      uniform float waveStrength;
      uniform float wavelength;
      uniform float headBoost;
      uniform float baseSize;
      uniform float sizeVariation;
      uniform float phaseStrength;
      uniform float phaseSpeed;
      varying float vBrightness;
      varying vec3 vWorldPosition;
      varying float vDistance;
      varying float vCameraDistance;
      varying float vDistanceAlpha;
      varying float vSpinePosition;

      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Calculate distance for culling
        float cameraDistance = -mvPosition.z;
        vCameraDistance = cameraDistance / sphereRadius;

        // Distance-based alpha for smooth fade-out
        vDistanceAlpha = smoothstep(maxRenderDistance * 0.8, maxRenderDistance, cameraDistance);
        vDistanceAlpha = 1.0 - vDistanceAlpha;

        vSpinePosition = spinePosition;

        // Size variation: taper from head (1.0x) to tail (0.3x minimum)
        // Formula: radius ∝ (1 - position²), clamped to [0.3, 1.0]
        float sizeFactor = 1.0 - spinePosition * spinePosition;
        sizeFactor = clamp(sizeFactor, 0.3, 1.0);

        // Traveling wave: energy pulse moves along spine from head to tail
        // Configurable wave speed and wavelength for visible propagation
        float wavePhase = time * waveSpeed * 6.28318; // Full 2π cycle per waveSpeed cycles
        float waveDistance = spinePosition * wavelength * 6.28318; // Configurable wavelengths along spine
        // Wave travels head→tail: phase increases over time, creating traveling effect
        float travelingWave = sin(wavePhase - waveDistance) * 0.5 + 0.5; // 0-1 range
        travelingWave = mix(0.5, travelingWave, waveStrength); // Apply wave strength

        // Per-sphere phase offset for independent animation
        float individualPhase = sin(time * phaseSpeed + phaseOffset * 3.14159) * phaseStrength + (1.0 - phaseStrength * 0.5);

        // Combine traveling wave with individual phase
        float brightnessMod = travelingWave * individualPhase;

        // Head spheres brighter (energy source) - configurable boost
        float headBrightness = (1.0 - spinePosition) * headBoost + 1.0;
        vBrightness = brightnessMod * headBrightness;

        // Reduce brightness for very distant spheres
        float brightnessReduction = smoothstep(maxRenderDistance * 0.5, maxRenderDistance * 0.8, cameraDistance);
        vBrightness = mix(vBrightness, vBrightness * 0.5, brightnessReduction);

        vDistance = length(position) / sphereRadius;
        gl_Position = projectionMatrix * mvPosition;

        // Size calculation with position-based scaling
        float waveSizeMod = 1.0 + (travelingWave * 2.0 - 1.0) * sizeVariation; // Wave affects size too
        float calculatedSize = baseSize * sizeFactor * waveSizeMod * (90.0 / cameraDistance);
        gl_PointSize = max(calculatedSize, minStarSize);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform float tailFadeStrength;
      uniform float distanceFalloff;
      uniform float coreBrightness;
      varying float vBrightness;
      varying vec3 vWorldPosition;
      varying float vDistance;
      varying float vCameraDistance;
      varying float vDistanceAlpha;
      varying float vSpinePosition;

      void main() {
        // Early discard for distant spheres
        if (vDistanceAlpha <= 0.01) {
          discard;
        }

        vec2 center = vec2(0.5, 0.5);
        float dist = distance(gl_PointCoord, center);

        // Square to circle conversion
        if (dist > 0.5) {
          discard;
        }

        // Softer edge falloff
        float edgeFalloff = smoothstep(0.5, 0.0, dist);
        if (edgeFalloff <= 0.0001) {
          discard;
        }

        // Core and halo configuration (similar to starfield)
        float coreRadius = 0.03;
        float coreTransition = 0.15;
        float coreIntensity = coreBrightness * 1.2;

        // Halo effect
        float coreFactor = smoothstep(coreRadius + coreTransition, coreRadius, dist);
        float haloFactor = exp(-2.5 * dist * 0.8) * edgeFalloff;
        float outerGlow = exp(-dist * 2.2) * 0.2;

        // Blend core and halo
        float haloIntensity = haloFactor + outerGlow;
        float intensity = mix(
          haloIntensity,
          coreIntensity,
          coreFactor * 0.7
        );

        // Enhanced distance dimming
        float distanceDimming = mix(
          coreBrightness * 0.2,
          coreBrightness,
          1.0 / (1.0 + pow(vCameraDistance * 0.6, distanceFalloff))
        );

        // Warm→cool gradient based on spine position (head warm, tail cool)
        // Same color scheme as starfield
        vec3 warmCenter = vec3(0.95, 0.92, 0.85);
        vec3 coolEdge = vec3(0.85, 0.88, 0.95);
        
        // Mix color based on distance from center AND spine position
        float colorMix = mix(
          smoothstep(0.0, 0.6, dist), // Standard radial gradient
          vSpinePosition,              // Spine-based gradient (head warm, tail cool)
          0.4                          // Blend both influences
        );
        vec3 starColor = mix(warmCenter, coolEdge, colorMix);

        vec3 finalColor = starColor * intensity * distanceDimming;
        float finalAlpha = intensity * opacity * vBrightness * distanceDimming * vDistanceAlpha * edgeFalloff;

        // Extra transparency toward the tail: head stays brighter, tail fades out
        float tailAlpha = 1.0 - vSpinePosition * tailFadeStrength;
        tailAlpha = clamp(tailAlpha, 0.0, 1.0);

        // With additive blending, alpha alone doesn't control brightness strongly,
        // so scale the color intensity as well for a clearly visible fade.
        finalColor *= tailAlpha;
        finalAlpha *= tailAlpha;

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
}

interface FishBodyProps {
  spine: SpineState
  headRef: React.MutableRefObject<THREE.Mesh | null>
  headDirection: React.MutableRefObject<THREE.Vector3>
  velocity?: React.MutableRefObject<THREE.Vector3>
  bankRadians?: number
}

export function FishBody({ spine, headRef, headDirection, velocity, bankRadians = 0 }: FishBodyProps) {
  const spineSphereRefs = useRef<(THREE.Points | null)[]>([])
  const headSphereRef = useRef<THREE.Points | null>(null)
  const groupRef = useRef<THREE.Group>(null)

  // Leva controls for spine spheres
  const controls = useControls({
    'Spine Spheres': folder({
    enabled: { value: true, label: 'Enabled' },
    wave: folder({
      waveSpeed: { value: 0.4, min: 0.1, max: 2.0, step: 0.1, label: 'Wave Speed' },
      waveStrength: { value: 0.2, min: 0.0, max: 2.0, step: 0.1, label: 'Wave Strength' },
      wavelength: { value: 0.5, min: 0.5, max: 5.0, step: 0.1, label: 'Wavelengths' },
    }),
    brightness: folder({
      coreBrightness: { value: 0.9, min: 0.1, max: 2.0, step: 0.1, label: 'Core Brightness' },
      headBoost: { value: 1.0, min: 0.0, max: 1.0, step: 0.1, label: 'Head Boost' },
    }),
    size: folder({
      baseSize: { value: 0.6, min: 0.1, max: 1.0, step: 0.05, label: 'Base Size' },
      sizeVariation: { value: 0.0, min: 0.0, max: 0.5, step: 0.01, label: 'Size Variation' },
      minSize: { value: 0.5, min: 0.5, max: 5.0, step: 0.1, label: 'Min Size' },
    }),
    animation: folder({
      phaseStrength: { value: 0.0, min: 0.0, max: 1.0, step: 0.05, label: 'Phase Strength' },
      phaseSpeed: { value: 0.0, min: 0.5, max: 3.0, step: 0.1, label: 'Phase Speed' },
    }),
    visual: folder({
      opacity: { value: 1.0, min: 0.0, max: 1.0, step: 0.05, label: 'Opacity' },
      tailFadeStrength: { value: 1.0, min: 0.0, max: 1.0, step: 0.05, label: 'Tail Fade' },
      maxRenderDistance: { value: 100, min: 50, max: 200, step: 5, label: 'Max Distance' },
      spacingFalloff: { value: 0.8, min: 0.0, max: 3.0, step: 0.05, label: 'Spacing Falloff' },
    }),
  }, { collapsed: true })
})

  // Create custom spine sphere material with size variation and traveling wave
  const spineSphereMaterial = useMemo(() => createSpineSphereMaterial(), [])

  // Separate material instance for the head glow so it can stay constant-bright
  const headSphereMaterial = useMemo(() => createSpineSphereMaterial(), [])

  // Generate per-sphere phase offsets for variation (seed based on index)
  const phaseOffsets = useMemo(() => {
    return spine.points.map((_, idx) => {
      // Generate pseudo-random phase offset for each sphere
      const seed = idx * 0.123456789
      return (Math.sin(seed) * 0.5 + 0.5) * 6.28318 // 0 to 2π
    })
  }, [spine.points.length])

  useFrame((state) => {
    // Update shader uniforms for spine spheres
    if (spineSphereMaterial) {
      spineSphereMaterial.uniforms.time.value = state.clock.elapsedTime
      spineSphereMaterial.uniforms.opacity.value = controls.opacity
      spineSphereMaterial.uniforms.tailFadeStrength.value = controls.tailFadeStrength
      spineSphereMaterial.uniforms.waveSpeed.value = controls.waveSpeed
      spineSphereMaterial.uniforms.waveStrength.value = controls.waveStrength
      spineSphereMaterial.uniforms.wavelength.value = controls.wavelength
      spineSphereMaterial.uniforms.coreBrightness.value = controls.coreBrightness
      spineSphereMaterial.uniforms.headBoost.value = controls.headBoost
      spineSphereMaterial.uniforms.baseSize.value = controls.baseSize
      spineSphereMaterial.uniforms.sizeVariation.value = controls.sizeVariation
      spineSphereMaterial.uniforms.minStarSize.value = controls.minSize
      spineSphereMaterial.uniforms.phaseStrength.value = controls.phaseStrength
      spineSphereMaterial.uniforms.phaseSpeed.value = controls.phaseSpeed
      spineSphereMaterial.uniforms.maxRenderDistance.value = controls.maxRenderDistance
    }

    // Head glow: use same shader family but clamp to constant brightness (no wave/phase)
    if (headSphereMaterial) {
      headSphereMaterial.uniforms.time.value = state.clock.elapsedTime
      headSphereMaterial.uniforms.opacity.value = controls.opacity
      headSphereMaterial.uniforms.tailFadeStrength.value = 0.0
      headSphereMaterial.uniforms.waveSpeed.value = controls.waveSpeed
      headSphereMaterial.uniforms.waveStrength.value = 0.0
      headSphereMaterial.uniforms.wavelength.value = controls.wavelength
      // Slightly boosted core/head brightness so the head reads as the energy source,
      // but with a smaller apparent size than the first tail segment.
      headSphereMaterial.uniforms.coreBrightness.value = controls.coreBrightness * 1.2
      headSphereMaterial.uniforms.headBoost.value = 1.0
      headSphereMaterial.uniforms.baseSize.value = controls.baseSize * 0.6
      headSphereMaterial.uniforms.sizeVariation.value = 0.0
      headSphereMaterial.uniforms.minStarSize.value = controls.minSize * 0.6
      headSphereMaterial.uniforms.phaseStrength.value = 0.0
      headSphereMaterial.uniforms.phaseSpeed.value = controls.phaseSpeed
      headSphereMaterial.uniforms.maxRenderDistance.value = controls.maxRenderDistance
    }

    // Sync geometric spacing falloff with Leva control so segments bunch toward the tail.
    spine.falloff = controls.spacingFalloff

    // Keep head glow attached to the physical head transform
    if (headSphereRef.current && headRef.current) {
      headSphereRef.current.position.copy(headRef.current.position)
    }

    const pts = spine.points
    for (let i = 0; i < Math.min(spineSphereRefs.current.length, pts.length); i++) {
      const m = spineSphereRefs.current[i]
      if (m) m.position.copy(pts[i])
    }
    // Head sphere position is already managed by movement system via headRef
    if (groupRef.current) {
      groupRef.current.rotation.z = bankRadians
    }
  })

  return (
    <group ref={groupRef}>
      {/* Invisible head anchor; movement & other systems still use headRef for transforms */}
      <mesh ref={headRef}>
        <sphereGeometry args={[0.002, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Render spine spheres first, then tube body for proper transparency layering */}
      {/* Skip the last 4 spine segments to avoid overlap with tail */}
      {controls.enabled && spine.points.slice(0, -4).map((_, idx) => {
        const visibleCount = Math.max(1, spine.points.length - 4)
        // Normalize over the visible segment range so the last rendered sphere reaches spinePosition=1.0.
        const spinePosition = idx / Math.max(1, visibleCount - 1) // 0.0 (head) to 1.0 (tail end)
        const phaseOffset = phaseOffsets[idx]

        // Create geometry with per-sphere attributes
        const positions = new Float32Array([0, 0, 0])
        const spinePositions = new Float32Array([spinePosition])
        const phaseOffsetsArray = new Float32Array([phaseOffset])

        return (
          <points key={`spine-sphere-${idx}`} ref={(el: any) => (spineSphereRefs.current[idx] = el)}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[positions, 3]}
              />
              <bufferAttribute
                attach="attributes-spinePosition"
                args={[spinePositions, 1]}
              />
              <bufferAttribute
                attach="attributes-phaseOffset"
                args={[phaseOffsetsArray, 1]}
              />
            </bufferGeometry>
            <primitive object={spineSphereMaterial} attach="material" />
          </points>
        )
      })}
      <TubeBody spine={spine} headRef={headRef} headDirection={headDirection} velocity={velocity} />

      {/* Head glow: same shader family as spine spheres, but constant-bright.
          Rendered after TubeBody so it appears on top of the body geometry. */}
      {controls.enabled && (
        <points ref={headSphereRef}>
          <bufferGeometry>
            {/* Single point at local origin; world position is driven via headSphereRef.position */}
            <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0]), 3]} />
            {/* Head is spinePosition 0.0 so it uses the warm head color branch */}
            <bufferAttribute attach="attributes-spinePosition" args={[new Float32Array([0.0]), 1]} />
            {/* Phase offset unused because phaseStrength is 0, but attribute required by shader */}
            <bufferAttribute attach="attributes-phaseOffset" args={[new Float32Array([0.0]), 1]} />
          </bufferGeometry>
          <primitive object={headSphereMaterial} attach="material" />
        </points>
      )}
    </group>
  )
}


