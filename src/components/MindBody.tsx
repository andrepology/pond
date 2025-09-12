import * as THREE from 'three'
import React, { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Center, useGLTF } from '@react-three/drei'
import { useControls } from 'leva'

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
}

export const MindBody = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes } = useGLTF('/models/mindbody.glb')

  const { roughness, metalness } = useControls('MindBody Material', {
    roughness: { value: 0.3, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.0, min: 0, max: 1, step: 0.01 }
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

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.elapsedTime) * 0.03
      if (hovered || active) groupRef.current.rotation.y += 0.01
    }
  })

  return (
    <group ref={groupRef} scale={0.45} {...props}>
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


