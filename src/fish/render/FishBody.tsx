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
  const idxRef = React.useRef<Uint32Array | null>(null)
  const scratchA = React.useRef(new THREE.Vector3())
  const scratchB = React.useRef(new THREE.Vector3())
  const scratchC = React.useRef(new THREE.Vector3())

  // Dispose geometry on unmount
  React.useEffect(() => () => geometryRef.current.dispose(), [])

  // Update geometry whenever attachmentData changes
  React.useEffect(() => {
    const geom = geometryRef.current
    // Parameters per fin type
    let startT = 0, endT = 1, maxHeight = 0.1, membraneSegments = 8
    if (finType === 'dorsal') { startT = 0.15; endT = 0.7; maxHeight = 0.08 }
    else if (finType === 'pectoral') { startT = 0.05; endT = 0.25; maxHeight = 0.06 }
    else if (finType === 'caudal') { startT = 0.75; endT = 1.0; maxHeight = 0.12 }

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
    const idxLen = triCount * 3

    // Ensure buffers sized
    if (!posRef.current || posRef.current.length < posLen) posRef.current = new Float32Array(posLen)
    if (!norRef.current || norRef.current.length < norLen) norRef.current = new Float32Array(norLen)
    if (!idxRef.current || idxRef.current.length < idxLen) idxRef.current = new Uint32Array(idxLen)
    const positions = posRef.current
    const normals = norRef.current
    const indices = idxRef.current

    // Fill vertices
    let v = 0
    for (let i = 0; i < finPoints.length; i++) {
      const point = finPoints[i]
      const localT = (point.spineT - startT) / (endT - startT)
      let profile = 0
      if (finType === 'dorsal') profile = Math.sin(localT * Math.PI) * Math.pow(1 - localT, 0.8)
      else if (finType === 'pectoral') profile = Math.exp(-Math.pow((localT - 0.3) / 0.4, 2))
      else if (finType === 'caudal') profile = Math.pow(1 - localT, 0.3) * (1 + 0.3 * Math.sin(3 * Math.PI * localT))
      const finHeight = maxHeight * profile
      const sideMultiplier = side === 'left' ? -1 : side === 'right' ? 1 : 0
      for (let j = 0; j < membraneSegments; j++) {
        const membraneT = j / (membraneSegments - 1)
        const membraneProfile = Math.sin(membraneT * Math.PI)
        // finOffset
        const finOffset = scratchA.current.set(0, 0, 0)
        const bodyRadius = point.radius
        if (finType === 'dorsal') {
          finOffset.copy(point.normal).multiplyScalar(bodyRadius + finHeight * membraneProfile)
        } else if (finType === 'pectoral') {
          finOffset.copy(point.binormal).multiplyScalar(sideMultiplier * (bodyRadius + finHeight * membraneProfile))
          finOffset.add(scratchB.current.copy(point.normal).multiplyScalar(finHeight * membraneProfile * 0.2))
        } else if (finType === 'caudal') {
          finOffset.copy(point.binormal).multiplyScalar(sideMultiplier * (bodyRadius + finHeight * membraneProfile * 0.8))
          finOffset.add(scratchB.current.copy(point.tangent).multiplyScalar(finHeight * membraneProfile * 0.3))
        }
        const px = point.position.x + finOffset.x
        const py = point.position.y + finOffset.y
        const pz = point.position.z + finOffset.z
        positions[v] = px; positions[v + 1] = py; positions[v + 2] = pz
        const nrm = scratchC.current.copy(finOffset).normalize()
        normals[v] = nrm.x; normals[v + 1] = nrm.y; normals[v + 2] = nrm.z
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
    if (!posAttr || (posAttr.array as Float32Array).length < posLen) geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    else { (posAttr.array as Float32Array).set(positions); posAttr.needsUpdate = true }
    if (!norAttr || (norAttr.array as Float32Array).length < norLen) geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    else { (norAttr.array as Float32Array).set(normals); norAttr.needsUpdate = true }
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
        opacity={0.08}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

interface FishBodyProps {
  spine: SpineState
  headRef: React.MutableRefObject<THREE.Mesh | null>
  headDirection: React.MutableRefObject<THREE.Vector3>
  bankRadians?: number
}

export function FishBody({ spine, headRef, headDirection, bankRadians = 0 }: FishBodyProps) {
  const spineSphereRefs = useRef<(THREE.Mesh | null)[]>([])
  const [finData, setFinData] = useState<FinAttachmentData[]>([])

  useFrame(() => {
    const pts = spine.points
    for (let i = 0; i < Math.min(spineSphereRefs.current.length, pts.length); i++) {
      const m = spineSphereRefs.current[i]
      if (m) m.position.copy(pts[i])
    }
    // Head sphere position is already managed by movement system via headRef
  })

  const handleFinData = (data: FinAttachmentData[]) => {
    setFinData(data)
  }

  return (
    <group rotation={[0, 0, bankRadians]}>
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
      <TubeBody spine={spine} headRef={headRef} headDirection={headDirection} onFinData={handleFinData} />
      
      {/* Organic fins */}
      <Fin attachmentData={finData} finType="dorsal" side="center" />
      <Fin attachmentData={finData} finType="pectoral" side="left" />
      <Fin attachmentData={finData} finType="pectoral" side="right" />
      <Fin attachmentData={finData} finType="caudal" side="left" />
      <Fin attachmentData={finData} finType="caudal" side="right" />
    </group>
  )
}


