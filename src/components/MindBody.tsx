import * as THREE from 'three'
import React, { forwardRef, useMemo, useRef } from 'react'
import { useFrame, ThreeElements } from '@react-three/fiber'
import { Center, useGLTF, Billboard } from '@react-three/drei'
import { useControls, folder } from 'leva'

interface InteractiveProps extends Partial<ThreeElements['group']> {
  hovered?: boolean;
  active?: boolean;
  color?: string;
  isGlass?: boolean;
}

export const MindBody = forwardRef<any, InteractiveProps>(({ color, hovered, active, isGlass = false, ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const innerOrbRef = useRef<THREE.Mesh>(null)
  const innerLightRef = useRef<THREE.PointLight>(null)
  const { nodes } = useGLTF('/models/mindbody.glb')

  const { roughness, metalness, glassRoughness, transmission, thickness, ior, orbColor, orbIntensity } = useControls({
    'MindBody Material': folder({
      roughness: { value: 0.2, min: 0, max: 1, step: 0.01, render: (get) => !get('MindBody Material.isGlass') },
      metalness: { value: 0.0, min: 0, max: 1, step: 0.01, render: (get) => !get('MindBody Material.isGlass') },
      glassRoughness: { label: 'Glass Roughness', value: 0.3, min: 0, max: 1, step: 0.01 },
      transmission: { value: 1.0, min: 0, max: 1, step: 0.01 },
      thickness: { value: 0.5, min: 0, max: 5, step: 0.1 },
      ior: { value: 1.5, min: 1, max: 2.3, step: 0.01 },
      orbColor: { value: '#ffead6' },
      orbIntensity: { value: 1.5, min: 0, max: 5, step: 0.1 }
    }, { collapsed: true })
  })

  const material = useMemo(() => {
    if (isGlass) {
      return new THREE.MeshPhysicalMaterial({
        color: '#FFFFFF',
        metalness: 0,
        roughness: glassRoughness,
        transmission,
        ior,
        thickness,
        transparent: true,
        opacity: 1,
        envMapIntensity: 1
      })
    }
    return new THREE.MeshStandardMaterial({
      color: '#CFCFCF',
      roughness,
      metalness
    })
  }, [roughness, metalness, glassRoughness, transmission, thickness, ior, isGlass])

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
    // Gentle heartbeat pulse
    const t = clock.elapsedTime
    // Smoother sine wave for organic pulse
    const pulse = (Math.sin(t * 2.5) + 1) * 0.5 // 0 to 1 range
    
    if (innerOrbRef.current) {
      // Subtle scale breathing
      innerOrbRef.current.scale.setScalar(1 + pulse * 0.1)
      
      const mat = innerOrbRef.current.material as THREE.MeshStandardMaterial
      if (mat) {
        // Pulse light intensity instead of just opacity
        mat.emissiveIntensity = 1 + pulse * 1.5
        mat.opacity = 0.3 + pulse * 0.2
      }
    }

    if (innerLightRef.current) {
      innerLightRef.current.intensity = orbIntensity * (0.8 + pulse * 0.5)
    }
  })

  return (
    <group ref={groupRef} scale={0.15} {...props}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
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
          {/* Glowing Heart/Soul Orb - Inner Illumination */}
          <group position={[0, 0.5, 0]}>
            <mesh ref={innerOrbRef}>
               <sphereGeometry args={[0.35, 32, 32]} />
               <meshStandardMaterial 
                  color={orbColor}
                  emissive={orbColor}
                  emissiveIntensity={2}
                  roughness={0.9}
                  transparent 
                  opacity={0.5} 
                  toneMapped={false}
                  depthWrite={false}
               />
            </mesh>
            <pointLight 
               ref={innerLightRef}
               color={orbColor} 
               intensity={orbIntensity * 2} 
               distance={4} 
               decay={2} 
            />
          </group>
        </Center>
      </Billboard>
    </group>
  )
})

export default MindBody


