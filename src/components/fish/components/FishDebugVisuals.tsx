import React, { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface FishDebugVisualsProps {
  movement: any // Typing 'any' for simplicity here, ideally matches MovementOutputs
  bounds: { max: number }
}

export function FishDebugVisuals({ movement, bounds }: FishDebugVisualsProps) {
  const velocityArrowRef = useRef<THREE.ArrowHelper>(null)
  const visionLineRef = useRef<THREE.Line>(null)
  
  // Create geometry for vision line once
  const visionGeo = React.useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)])
    return geo
  }, [])

  useFrame(() => {
    if (!movement.headRef.current) return

    const headPos = movement.headRef.current.position
    const velocity = movement.velocity.current
    
    // Update Velocity Arrow
    if (velocityArrowRef.current) {
      const dir = velocity.clone().normalize()
      const len = velocity.length()
      velocityArrowRef.current.position.copy(headPos)
      velocityArrowRef.current.setDirection(dir)
      velocityArrowRef.current.setLength(Math.max(len * 2, 0.5)) // Scale up for visibility
    }

    // Update Vision Line (assumes visionDistance is roughly known or we can visualize current heading)
    // We'll just visualize the forward direction * vision distance
    // Ideally we pass visionDistance in props, but hardcoding visual length is fine for debug
    if (visionLineRef.current) {
        const forward = velocity.lengthSq() > 0.0001 ? velocity.clone().normalize() : new THREE.Vector3(0,0,1)
        const end = headPos.clone().addScaledVector(forward, 2.5) // 2.5 is typical vision dist
        
        const positions = new Float32Array([
            headPos.x, headPos.y, headPos.z,
            end.x, end.y, end.z
        ])
        visionLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    }
  })

  return (
    <group>
      {/* 1. Boundary Sphere */}
      <mesh>
        <sphereGeometry args={[bounds.max, 32, 32]} />
        <meshBasicMaterial color="red" wireframe transparent opacity={0.2} />
      </mesh>

      {/* 2. Velocity Arrow */}
      <arrowHelper ref={velocityArrowRef} args={[new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), 1, 0xffff00]} />

      {/* 3. Wander Target (if exposed, or we can just show head for now) */}
      {/* Note: movement.wanderTarget is inside the hook, not exposed yet unless we return it. 
          If you want to see the target, we need to return it from useFishMovement. 
          For now, let's stick to external observables. */}
          
      {/* 4. Vision Ray */}
      <line ref={visionLineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="cyan" />
      </line>
    </group>
  )
}

