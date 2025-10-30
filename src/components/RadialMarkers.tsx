import * as THREE from 'three'
import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

interface RadialMarkersProps {
  count?: number
  radius?: number
}

export function RadialMarkers({ count = 12, radius = 1.3 }: RadialMarkersProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const currentQuaternion = useRef(new THREE.Quaternion())
  const targetQuaternion = useRef(new THREE.Quaternion())
  const targetMatrix = useRef(new THREE.Matrix4())

  // Create marker positions and angles in XY plane (vertical ring)
  const markers = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      return {
        position: new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ),
        angle
      }
    })
  }, [count, radius])

  const rotationDamping = 0.99
  const noiseTimeRef = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    noiseTimeRef.current += delta * 0.3

    // Get world position of the group (center of ring)
    const groupWorldPos = new THREE.Vector3()
    groupRef.current.getWorldPosition(groupWorldPos)

    // Compute direction from ring center to camera
    const direction = new THREE.Vector3()
      .subVectors(camera.position, groupWorldPos)
      .normalize()

    // Add subtle noise to direction for organic feel
    const noiseX = Math.sin(noiseTimeRef.current * 0.5) * 0.02
    const noiseY = Math.cos(noiseTimeRef.current * 0.7) * 0.02
    direction.x += noiseX
    direction.y += noiseY
    direction.normalize()

    // Create a lookAt matrix that orients Z-axis toward camera
    targetMatrix.current.lookAt(direction, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
    
    // Extract quaternion from matrix
    targetQuaternion.current.setFromRotationMatrix(targetMatrix.current)

    // Slerp current rotation toward target with damping
    currentQuaternion.current.slerp(targetQuaternion.current, 1 - rotationDamping)

    // Apply to group
    groupRef.current.quaternion.copy(currentQuaternion.current)
  })

  return (
    <group ref={groupRef}>
      {markers.map(({ position, angle }, i) => (
        <group
          key={`marker-${i}`}
          position={position}
          rotation={[0, 0, angle + Math.PI / 2]}
        >
          <mesh>
            <boxGeometry args={[0.03, 0.3, 0.08]} />
            <meshPhysicalMaterial
              transmission={1.0}
              roughness={0.3}
              ior={1.5}
              thickness={0.5}
              metalness={0}
              clearcoat={1.2}
              color="#FFFFFF"
              transparent
              opacity={1.0}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

