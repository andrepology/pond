import * as THREE from 'three'
import React, { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Center, useGLTF } from '@react-three/drei'
import { useControls, folder } from 'leva'
import { useMindBodyWander } from './useMindBodyWander'

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
  wandering?: boolean;
  wanderCenter?: THREE.Vector3;
}

export const MindBody = forwardRef<any, InteractiveProps>(({ color, hovered, active, wandering = false, wanderCenter = new THREE.Vector3(0, 0, 0), ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes } = useGLTF('/models/mindbody.glb')

  const { roughness, metalness } = useControls({
    'MindBody Material': folder({
      roughness: { value: 0.2, min: 0, max: 1, step: 0.01 },
      metalness: { value: 0.0, min: 0, max: 1, step: 0.01 }
    }, { collapsed: true })
  })

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#CFCFCF',
      roughness,
      metalness
    })
  }, [roughness, metalness])

  const geometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    if (nodes) {
      for (const node of Object.values(nodes)) {
        if (node instanceof THREE.Mesh) {
          geo = node.geometry;
          break; 
        }
      }
    }
    return geo;
  }, [nodes]);

  // Enable wandering behavior
  useMindBodyWander(
    wandering ? {
      center: wanderCenter,
      minRadius: 2.5,
      maxRadius: 4.0,
      speed: 0.3,
      rotationSpeed: 2.0
    } : null,
    groupRef
  )

  useFrame(({ clock }) => {
    if (groupRef.current && !wandering) {
      // Only apply idle animation when not wandering
      groupRef.current.position.y = Math.sin(clock.elapsedTime) * 0.03
      if (hovered || active) groupRef.current.rotation.y += 0.01
    }
  })

  return (
    <group ref={groupRef} scale={0.15} {...props}>
      <Center>
        {geometry && (
          <mesh 
            geometry={geometry} 
            material={material} 
            castShadow 
            receiveShadow 
            rotation={[0, Math.PI, 0]} 
          />
        )}
      </Center>
    </group>
  )
})

export default MindBody


