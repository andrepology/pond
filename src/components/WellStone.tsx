import * as THREE from 'three'
import React, { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Center, useGLTF, useTexture } from '@react-three/drei'
import { useControls } from 'leva'

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
}

const generateSphericalUVs = (geometry: THREE.BufferGeometry) => {
  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox!
  const center = bbox.getCenter(new THREE.Vector3())
  const positions = geometry.attributes.position
  const uvs = new Float32Array(positions.count * 2)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) - center.x
    const y = positions.getY(i) - center.y
    const z = positions.getZ(i) - center.z
    const radius = Math.sqrt(x * x + y * y + z * z)
    const theta = Math.atan2(z, x)
    const phi = Math.acos(y / radius)
    uvs[i * 2] = (theta + Math.PI) / (2 * Math.PI)
    uvs[i * 2 + 1] = phi / Math.PI
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}

export const WellStone = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/wellstone.glb')

  const { roughness, metalness, textureRepeat, normalScale } = useControls('WellStone Material', {
    roughness: { value: 0.3, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.39, min: 0, max: 1, step: 0.01 },
    textureRepeat: { value: 5.0, min: 0.1, max: 10, step: 0.1 },
    normalScale: { value: 1.2, min: 0, max: 1, step: 0.05 }
  })

  const rockTextures = useTexture({
    map: '/textures/rock_diffuse.jpg',
    normalMap: '/textures/rock_normal.jpg',
    roughnessMap: '/textures/rock_roughness.jpg',
    aoMap: '/textures/rock_ao.jpg'
  })

  const rockMaterial = useMemo(() => {
    Object.values(rockTextures).forEach(texture => {
      if (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(textureRepeat, textureRepeat)
        texture.anisotropy = 2
      }
    })

    return new THREE.MeshStandardMaterial({
      color: '#CFCFCF',
      normalMap: rockTextures.normalMap,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      roughness,
      metalness
    })
  }, [rockTextures, textureRepeat, normalScale, roughness, metalness])

  useEffect(() => {
    const mesh = scene.children[1] as THREE.Mesh
    if (mesh?.geometry) {
      if (!mesh.geometry.attributes.uv) generateSphericalUVs(mesh.geometry)
      mesh.material = rockMaterial
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  }, [scene, rockMaterial])

  useFrame(() => {
    if (groupRef.current && (hovered || active)) groupRef.current.rotation.y += 0.01
  })

  return (
    <group ref={groupRef} scale={6.5} rotation={[0, Math.PI, 0]} {...props}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  )
})

export default WellStone


