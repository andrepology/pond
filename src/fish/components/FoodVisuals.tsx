import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { FoodMarker, Ripple } from '../hooks/useFoodSystem'

// Food marker material - similar to starfield but optimized for food markers
export function createFoodMarkerMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      opacity: { value: 1.0 },
      vanishProgress: { value: 0 },
      sphereRadius: { value: 64 },
      distanceFalloff: { value: 1.0 },
      coreBrightness: { value: 1.5 }, // Brighter than stars
      minStarSize: { value: 0.25 },
      maxRenderDistance: { value: 100 },
    },
    vertexShader: `
      uniform float time;
      uniform float vanishProgress;
      uniform float sphereRadius;
      uniform float minStarSize;
      uniform float maxRenderDistance;
      varying float vBrightness;
      varying vec3 vWorldPosition;
      varying float vDistance;
      varying float vCameraDistance;
      varying float vDistanceAlpha;

      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Calculate distance for culling (same as starfield)
        float cameraDistance = -mvPosition.z;
        vCameraDistance = cameraDistance / sphereRadius;

        // Distance-based alpha for smooth fade-out
        vDistanceAlpha = smoothstep(maxRenderDistance * 0.8, maxRenderDistance, cameraDistance);
        vDistanceAlpha = 1.0 - vDistanceAlpha;

        // Food marker twinkling (more pronounced than stars)
        float primaryTwinkle = sin(time * 2.5 + position.x * 15.0 + position.y * 12.0) * 0.5 + 0.5;
        float secondaryTwinkle = cos(time * 1.8 + position.x * 8.0 - position.y * 10.0) * 0.5 + 0.5;
        float twinkle = mix(primaryTwinkle, secondaryTwinkle, 0.4);

        // Reduce twinkling for distant markers
        float twinkleReduction = smoothstep(maxRenderDistance * 0.5, maxRenderDistance * 0.8, cameraDistance);
        twinkle = mix(twinkle, 0.6, twinkleReduction);

        vBrightness = twinkle * (1.0 - vanishProgress);
        vDistance = length(position) / sphereRadius;

        gl_Position = projectionMatrix * mvPosition;

        // Size calculation (small but visible, like medium stars)
        float sizeVariation = 1.0 + (twinkle * 2.0 - 1.0) * 0.08;
        float calculatedSize = 0.15 * sizeVariation * (90.0 / cameraDistance);
        gl_PointSize = max(calculatedSize * (1.0 - vanishProgress), 1.0);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform float vanishProgress;
      uniform float distanceFalloff;
      uniform float coreBrightness;
      varying float vBrightness;
      varying vec3 vWorldPosition;
      varying float vDistance;
      varying float vCameraDistance;
      varying float vDistanceAlpha;

      void main() {
        // Early discard for distant markers
        if (vDistanceAlpha <= 0.01) {
          discard;
        }

        vec2 center = vec2(0.5, 0.5);
        float dist = distance(gl_PointCoord, center);

        // Square to circle conversion (same as starfield)
        if (dist > 0.5) {
          discard;
        }

        // Softer edge falloff
        float edgeFalloff = smoothstep(0.5, 0.0, dist);
        if (edgeFalloff <= 0.0001) {
          discard;
        }

        // Smaller core than starfield (food markers should be more subtle)
        float coreRadius = 0.03;
        float coreTransition = 0.15;
        float coreIntensity = coreBrightness * 1.2; // Slightly brighter core

        // Dimmer halo
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

        // Warm white colors (slightly different from starfield)
        vec3 warmCenter = vec3(1.0, 0.98, 0.96);
        vec3 coolEdge = vec3(0.92, 0.94, 0.98);
        vec3 starColor = mix(warmCenter, coolEdge, smoothstep(0.0, 0.7, dist));

        vec3 finalColor = starColor * intensity * distanceDimming;
        float finalAlpha = intensity * opacity * vBrightness * distanceDimming * vDistanceAlpha * edgeFalloff;
        finalAlpha *= (1.0 - vanishProgress * vanishProgress);

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
}

interface FoodMarkerPointProps {
  marker: FoodMarker
  material: THREE.ShaderMaterial
  vanishDuration: number
}

function FoodMarkerPoint({ marker, material, vanishDuration }: FoodMarkerPointProps) {
  const pointRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  // Create material instance for this marker
  useMemo(() => {
    materialRef.current = material.clone()
    // Set static uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.sphereRadius.value = 64
      materialRef.current.uniforms.distanceFalloff.value = 1.0
      materialRef.current.uniforms.coreBrightness.value = 1.5
      materialRef.current.uniforms.minStarSize.value = 3.0
      materialRef.current.uniforms.maxRenderDistance.value = 100
    }
  }, [material])

  useFrame((state) => {
    if (!materialRef.current || !pointRef.current) return

    // Update time for twinkling
    materialRef.current.uniforms.time.value = state.clock.elapsedTime

    // Update vanish progress
    let vanishProgress = 0
    if (marker.state === 'vanishing' && marker.vanishStartTime) {
      const elapsed = performance.now() - marker.vanishStartTime
      vanishProgress = Math.min(elapsed / vanishDuration, 1)
    }
    materialRef.current.uniforms.vanishProgress.value = vanishProgress

    // Ensure all uniforms are set
    materialRef.current.uniforms.opacity.value = 1.0
  })

  // Create positions array for this single marker
  const positions = useMemo(() => new Float32Array([0, 0, 0]), [])

  return (
    <points ref={pointRef} position={[marker.position.x, marker.position.y, marker.position.z]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <primitive object={materialRef.current} attach="material" />
    </points>
  )
}

interface FoodVisualsProps {
  foodMarkers: FoodMarker[]
  ripples: Ripple[]
}

export function FoodVisuals({ foodMarkers, ripples }: FoodVisualsProps) {
  const foodMarkerMaterial = useMemo(() => createFoodMarkerMaterial(), [])
  const VANISH_DURATION = 800

  return (
    <group>
      {/* Food markers with enhanced bloom */}
      {foodMarkers
        .filter(marker => marker.state !== 'gone')
        .map((marker, idx) => (
          <FoodMarkerPoint
            key={`food-${idx}`}
            marker={marker}
            material={foodMarkerMaterial}
            vanishDuration={VANISH_DURATION}
          />
        ))}

      {/* Ripples are managed by the hook and added to scene directly */}
    </group>
  )
}
