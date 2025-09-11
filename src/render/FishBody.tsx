import React, { useRef } from 'react'
import type { SpineState } from '../core/spine'
import { TubeBody } from './TubeBody'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface FishBodyProps {
  spine: SpineState
  headRef: React.MutableRefObject<THREE.Mesh | null>
  headDirection: React.MutableRefObject<THREE.Vector3>
  bankRadians?: number
}

export function FishBody({ spine, headRef, headDirection, bankRadians = 0 }: FishBodyProps) {
  const spineSphereRefs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    const pts = spine.points
    for (let i = 0; i < Math.min(spineSphereRefs.current.length, pts.length); i++) {
      const m = spineSphereRefs.current[i]
      if (m) m.position.copy(pts[i])
    }
    // Head sphere position is already managed by movement system via headRef
  })

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
            <meshToonMaterial blending={THREE.AdditiveBlending} color="#9FA8DA" emissive="#FFFFFF" emissiveIntensity={0.6} toneMapped={false} transparent opacity={opacity} depthWrite={false} />
          </mesh>
        )
      })}
      <TubeBody spine={spine} headRef={headRef} headDirection={headDirection} />
    </group>
  )
}


