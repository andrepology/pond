import React, { useRef, useMemo, useState } from 'react'
import type { SpineState } from '../core/Spine'
import { TubeBody } from './TubeBody'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createFoodMarkerMaterial } from '../../../fish/components/FoodVisuals'
import { useControls, folder } from 'leva'

interface FinAttachmentData {
  position: THREE.Vector3
  normal: THREE.Vector3
  binormal: THREE.Vector3
  tangent: THREE.Vector3
  radius: number
  spineT: number
}

interface FinProps {
  attachmentData: FinAttachmentData[]
  finType: 'dorsal' | 'pectoral' | 'caudal'
  side: 'left' | 'right' | 'center'
}

function Fin({ attachmentData, finType, side }: FinProps) {
  const geometryRef = React.useRef<THREE.BufferGeometry>(new THREE.BufferGeometry())
  const posRef = React.useRef<Float32Array | null>(null)
  const norRef = React.useRef<Float32Array | null>(null)
  const colorRef = React.useRef<Float32Array | null>(null)
  const idxRef = React.useRef<Uint32Array | null>(null)
  const scratchA = React.useRef(new THREE.Vector3())
  const scratchB = React.useRef(new THREE.Vector3())
  const scratchC = React.useRef(new THREE.Vector3())
  const timeRef = React.useRef(0)

  // Dispose geometry on unmount
  React.useEffect(() => () => geometryRef.current.dispose(), [])

  // Update time for animation
  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime
  })

  // Organic noise-like function for natural variation
  const organicNoise = (x: number, y: number, time: number) => {
    // Multi-octave sine approximation of noise
    const n1 = Math.sin(x * 3.14 + time * 0.5) * Math.cos(y * 2.72 + time * 0.3)
    const n2 = Math.sin(x * 7.85 - time * 0.7) * Math.cos(y * 5.43 - time * 0.4) * 0.5
    const n3 = Math.sin(x * 15.7 + time * 1.1) * Math.cos(y * 10.86 + time * 0.8) * 0.25
    return (n1 + n2 + n3) / 1.75
  }

  // Update geometry each frame for dynamic animation
  React.useEffect(() => {
    const geom = geometryRef.current
    // Parameters per fin type
    let startT = 0, endT = 1, maxHeight = 0.1, membraneSegments = 8
    if (finType === 'dorsal') { startT = 0.15; endT = 0.7; maxHeight = 0.09 }
    else if (finType === 'pectoral') { startT = 0.05; endT = 0.25; maxHeight = 0.07 }
    else if (finType === 'caudal') { startT = 0.75; endT = 1.0; maxHeight = 0.14 }

    const finPoints = attachmentData.filter(d => d.spineT >= startT && d.spineT <= endT)
    if (finPoints.length < 2) {
      geom.setIndex(null)
      geom.deleteAttribute('position')
      geom.deleteAttribute('normal')
      geom.computeBoundingSphere()
      return
    }

    const vertCount = finPoints.length * membraneSegments
    const triCount = Math.max(0, (finPoints.length - 1) * (membraneSegments - 1) * 2)
    const posLen = vertCount * 3
    const norLen = vertCount * 3
    const colorLen = vertCount * 3
    const idxLen = triCount * 3

    // Ensure buffers sized
    if (!posRef.current || posRef.current.length < posLen) posRef.current = new Float32Array(posLen)
    if (!norRef.current || norRef.current.length < norLen) norRef.current = new Float32Array(norLen)
    if (!colorRef.current || colorRef.current.length < colorLen) colorRef.current = new Float32Array(colorLen)
    if (!idxRef.current || idxRef.current.length < idxLen) idxRef.current = new Uint32Array(idxLen)
    const positions = posRef.current
    const normals = norRef.current
    const colors = colorRef.current
    const indices = idxRef.current

    const time = timeRef.current
    
    // Fill vertices
    let v = 0
    for (let i = 0; i < finPoints.length; i++) {
      const point = finPoints[i]
      const localT = (point.spineT - startT) / (endT - startT)
      
      // Organic profile that morphs over time
      let profile = 0
      if (finType === 'dorsal') {
        // Dorsal: flowing ridge with organic bumps
        const base = Math.sin(localT * Math.PI) * Math.pow(1 - localT, 0.6)
        const bumps = 0.15 * Math.sin(localT * Math.PI * 3 + time * 0.8)
        const morph = 0.1 * organicNoise(localT * 5, time * 0.3, time * 0.5)
        profile = base * (1 + bumps + morph)
      } else if (finType === 'pectoral') {
        // Pectoral: rounded paddle that flexes
        const base = Math.exp(-Math.pow((localT - 0.35) / 0.45, 2))
        const flex = 0.2 * Math.sin(time * 1.2 + localT * Math.PI)
        const organicVariation = 0.15 * organicNoise(localT * 4, time * 0.4, time * 0.6)
        profile = base * (1 + flex + organicVariation)
      } else if (finType === 'caudal') {
        // Caudal: multi-lobed tail with organic asymmetry
        const base = Math.pow(1 - localT, 0.25)
        const lobes = 0.25 * Math.sin(3.5 * Math.PI * localT + time * 0.9)
        const asymmetry = 0.12 * Math.sin(2 * Math.PI * localT + time * 1.5)
        const morph = 0.18 * organicNoise(localT * 6, time * 0.35, time * 0.7)
        profile = base * (1 + lobes + asymmetry + morph)
      }
      
      const finHeight = maxHeight * Math.max(0, profile)
      const sideMultiplier = side === 'left' ? -1 : side === 'right' ? 1 : 0
      
      for (let j = 0; j < membraneSegments; j++) {
        const membraneT = j / (membraneSegments - 1)
        const membraneProfile = Math.sin(membraneT * Math.PI)
        
        // Autonomous wave motion
        const wavePhase = time * 2.5 + localT * Math.PI * 2 + (side === 'left' ? 0 : Math.PI)
        const waveValue = Math.sin(wavePhase) * 0.02 * membraneProfile
        
        // Organic membrane flutter
        const flutterNoise = organicNoise(localT * 8, membraneT * 6, time * 1.8)
        const flutterValue = flutterNoise * 0.015 * profile
        
        // Edge rippling effect
        const ripplePhase = time * 3.5 + localT * 10 + membraneT * 8
        const rippleValue = Math.sin(ripplePhase) * 0.008 * membraneT * membraneProfile
        
        // Fin offset with organic deformation
        const finOffset = scratchA.current.set(0, 0, 0)
        const bodyRadius = point.radius
        
        if (finType === 'dorsal') {
          // Dorsal stands up from top
          const extension = bodyRadius + finHeight * membraneProfile
          finOffset.copy(point.normal).multiplyScalar(extension + waveValue)
          finOffset.add(scratchB.current.copy(point.tangent).multiplyScalar(flutterValue))
          finOffset.add(scratchC.current.copy(point.binormal).multiplyScalar(rippleValue))
        } else if (finType === 'pectoral') {
          // Pectoral extends laterally with slight forward angle
          const lateralExtension = bodyRadius + finHeight * membraneProfile
          finOffset.copy(point.binormal).multiplyScalar(sideMultiplier * lateralExtension + waveValue * sideMultiplier)
          finOffset.add(scratchB.current.copy(point.normal).multiplyScalar(finHeight * membraneProfile * 0.25 + flutterValue))
          finOffset.add(scratchC.current.copy(point.tangent).multiplyScalar(finHeight * membraneProfile * 0.15 + rippleValue))
        } else if (finType === 'caudal') {
          // Caudal fans out with forward sweep
          const lateralSpread = bodyRadius + finHeight * membraneProfile * 0.9
          finOffset.copy(point.binormal).multiplyScalar(sideMultiplier * lateralSpread + waveValue * sideMultiplier)
          finOffset.add(scratchB.current.copy(point.tangent).multiplyScalar(finHeight * membraneProfile * 0.4 + flutterValue * 1.8))
          finOffset.add(scratchC.current.copy(point.normal).multiplyScalar(rippleValue * 0.5))
        }
        const px = point.position.x + finOffset.x
        const py = point.position.y + finOffset.y
        const pz = point.position.z + finOffset.z
        positions[v] = px; positions[v + 1] = py; positions[v + 2] = pz
        const nrm = scratchC.current.copy(finOffset).normalize()
        normals[v] = nrm.x; normals[v + 1] = nrm.y; normals[v + 2] = nrm.z
        
        // Fade out toward edges: encode opacity in color.r
        // membraneT = 0 (body) → full opacity, membraneT = 1 (edge) → transparent
        const fadeOut = 1.0 - membraneT // Linear fade
        // Apply smoothstep for smoother transition
        const smoothFade = fadeOut * fadeOut * (3 - 2 * fadeOut)
        colors[v] = smoothFade; colors[v + 1] = smoothFade; colors[v + 2] = smoothFade
        
        v += 3
      }
    }

    // Fill indices
    let k = 0
    for (let i = 0; i < finPoints.length - 1; i++) {
      for (let j = 0; j < membraneSegments - 1; j++) {
        const a = i * membraneSegments + j
        const b = a + membraneSegments
        indices[k++] = a; indices[k++] = b; indices[k++] = a + 1
        indices[k++] = b; indices[k++] = b + 1; indices[k++] = a + 1
      }
    }

    // Apply to geometry
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute | undefined
    const norAttr = geom.getAttribute('normal') as THREE.BufferAttribute | undefined
    const colorAttr = geom.getAttribute('color') as THREE.BufferAttribute | undefined
    if (!posAttr || (posAttr.array as Float32Array).length < posLen) geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    else { (posAttr.array as Float32Array).set(positions); posAttr.needsUpdate = true }
    if (!norAttr || (norAttr.array as Float32Array).length < norLen) geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    else { (norAttr.array as Float32Array).set(normals); norAttr.needsUpdate = true }
    if (!colorAttr || (colorAttr.array as Float32Array).length < colorLen) geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    else { (colorAttr.array as Float32Array).set(colors); colorAttr.needsUpdate = true }
    const indexAttr = geom.getIndex() as THREE.BufferAttribute | null
    if (!indexAttr || (indexAttr.array as Uint32Array).length < idxLen) geom.setIndex(new THREE.BufferAttribute(indices, 1))
    else { (indexAttr.array as Uint32Array).set(indices); indexAttr.needsUpdate = true }
    // Limit draw range to current index count to avoid drawing stale tail
    geom.setDrawRange(0, idxLen)
  }, [attachmentData, finType, side])

  return (
    <mesh geometry={geometryRef.current}>
      <meshToonMaterial
        color="#FFFFFF"
        transparent
        opacity={0.12}
        side={THREE.DoubleSide}
        blending={THREE.NormalBlending}
        depthWrite={true}
        toneMapped={false}
        vertexColors
      />
    </mesh>
  )
}

// Custom shader material for spine spheres with size variation and traveling wave
function createSpineSphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      opacity: { value: 1.0 },
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
  const [finData, setFinData] = useState<FinAttachmentData[]>([])
  const groupRef = useRef<THREE.Group>(null)

  // Leva controls for spine spheres
  const controls = useControls('Spine Spheres', {
    enabled: { value: true, label: 'Enabled' },
    wave: folder({
      waveSpeed: { value: 0.4, min: 0.1, max: 2.0, step: 0.1, label: 'Wave Speed' },
      waveStrength: { value: 1.0, min: 0.0, max: 2.0, step: 0.1, label: 'Wave Strength' },
      wavelength: { value: 2.5, min: 0.5, max: 5.0, step: 0.1, label: 'Wavelengths' },
    }),
    brightness: folder({
      coreBrightness: { value: 0.8, min: 0.1, max: 2.0, step: 0.1, label: 'Core Brightness' },
      headBoost: { value: 0.3, min: 0.0, max: 1.0, step: 0.1, label: 'Head Boost' },
    }),
    size: folder({
      baseSize: { value: 0.4, min: 0.1, max: 1.0, step: 0.05, label: 'Base Size' },
      sizeVariation: { value: 0.15, min: 0.0, max: 0.5, step: 0.01, label: 'Size Variation' },
      minSize: { value: 2.0, min: 0.5, max: 5.0, step: 0.1, label: 'Min Size' },
    }),
    animation: folder({
      phaseStrength: { value: 0.3, min: 0.0, max: 1.0, step: 0.05, label: 'Phase Strength' },
      phaseSpeed: { value: 1.5, min: 0.5, max: 3.0, step: 0.1, label: 'Phase Speed' },
    }),
    visual: folder({
      opacity: { value: 1.0, min: 0.0, max: 1.0, step: 0.05, label: 'Opacity' },
      maxRenderDistance: { value: 100, min: 50, max: 200, step: 5, label: 'Max Distance' },
    }),
  })

  // Create custom spine sphere material with size variation and traveling wave
  const spineSphereMaterial = useMemo(() => createSpineSphereMaterial(), [])

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

  const handleFinData = (data: FinAttachmentData[]) => {
    setFinData(data)
  }

  return (
    <group ref={groupRef}>
      {/* Head sphere with matching material */}
      <mesh ref={headRef}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshToonMaterial blending={THREE.AdditiveBlending} color="#9FA8DA" emissive="#FFFFFF" emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      
      {/* Render spine spheres first, then tube body for proper transparency layering */}
      {/* Skip the last 4 spine segments to avoid overlap with tail */}
      {controls.enabled && spine.points.slice(0, -4).map((_, idx) => {
        const totalPoints = spine.points.length
        const spinePosition = idx / Math.max(1, totalPoints - 1) // 0.0 (head) to 1.0 (tail)
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
      <TubeBody spine={spine} headRef={headRef} headDirection={headDirection} velocity={velocity} onFinData={handleFinData} />
      
      {/* Organic fins with autonomous morphing - DISABLED */}
      {/* <Fin attachmentData={finData} finType="dorsal" side="center" />
      <Fin attachmentData={finData} finType="pectoral" side="left" />
      <Fin attachmentData={finData} finType="pectoral" side="right" />
      <Fin attachmentData={finData} finType="caudal" side="left" />
      <Fin attachmentData={finData} finType="caudal" side="right" /> */}
    </group>
  )
}


