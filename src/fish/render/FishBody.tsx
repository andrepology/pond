import React, { useRef, useMemo, useState } from 'react'
import type { SpineState } from '../core/Spine'
import { TubeBody } from './TubeBody'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

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

interface FishBodyProps {
  spine: SpineState
  headRef: React.MutableRefObject<THREE.Mesh | null>
  headDirection: React.MutableRefObject<THREE.Vector3>
  velocity?: React.MutableRefObject<THREE.Vector3>
  bankRadians?: number
}

export function FishBody({ spine, headRef, headDirection, velocity, bankRadians = 0 }: FishBodyProps) {
  const spineSphereRefs = useRef<(THREE.Mesh | null)[]>([])
  const [finData, setFinData] = useState<FinAttachmentData[]>([])
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
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
      {spine.points.map((_, idx) => {
        const segProgress = idx / Math.max(1, spine.points.length - 1)
        const base = 0.045
        const radius = Math.max(0.012, base * (1 - Math.pow(segProgress, 0.9)) * 0.6)
        const opacity = 0.1 * (1 - segProgress)
        return (
          <mesh key={`spine-sphere-${idx}`} ref={(el) => (spineSphereRefs.current[idx] = el)}>
            <sphereGeometry args={[radius, 12, 12]} />
            <meshToonMaterial blending={THREE.AdditiveBlending} color="#9FA8DA" emissive="#FFFFFF" emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.1} depthWrite={false} />
          </mesh>
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


