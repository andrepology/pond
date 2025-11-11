import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useControls } from 'leva'

interface WaterMaterialControls {
  roughness: number
  ior: number
  transmission: number
  thickness: number
  attenuationDistance: number
  attenuationColor: string
  specularIntensity: number
  normalScale: number
  normalTiling: number
  flowSpeed: number
}

interface UseWaterMaterialReturn {
  materialRef: React.MutableRefObject<THREE.MeshPhysicalMaterial | null>
  controls: WaterMaterialControls
  waterNormals: THREE.Texture | null
}

export function useWaterMaterial(): UseWaterMaterialReturn {
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null)

  const controls = useControls('Water Material', {
    roughness: { value: 0.00, min: 0, max: 1, step: 0.005 },
    ior: { value: 2.26, min: 1, max: 2.333, step: 0.001 },
    transmission: { value: 1.00, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.05, min: 0, max: 2, step: 0.01 },
    attenuationDistance: { value: 0.8, min: 0.1, max: 10, step: 0.1 },
    attenuationColor: '#ffffff',
    specularIntensity: { value: 0.92, min: 0, max: 1, step: 0.01 },
    normalScale: { value: 0.44, min: 0, max: 2, step: 0.01 },
    normalTiling: { value: 0.3, min: 0.1, max: 10, step: 0.1 },
    flowSpeed: { value: 0.01, min: 0, max: 0.1, step: 0.001 }
  })

  const waterNormals = useTexture('/waternormals.jpg')

  // Setup texture properties - minimize seam visibility
  useMemo(() => {
    if (waterNormals) {
      // Use RepeatWrapping for seamless tiling
      waterNormals.wrapS = THREE.RepeatWrapping
      waterNormals.wrapT = THREE.RepeatWrapping
      // Higher anisotropy for better texture quality at angles
      waterNormals.anisotropy = 16
      waterNormals.needsUpdate = true
    }
  }, [waterNormals])

  // Update texture tiling
  useEffect(() => {
    if (waterNormals) {
      waterNormals.repeat.set(controls.normalTiling, controls.normalTiling)
    }
  }, [waterNormals, controls.normalTiling])

  // Animate normal map for flowing water effect
  useFrame((_, delta) => {
    if (waterNormals) {
      // Diagonal flow for more natural movement
      waterNormals.offset.y -= delta * controls.flowSpeed
      // Slight rotation effect
      waterNormals.offset.x += delta * controls.flowSpeed * 0.3
    }
  })

  return {
    materialRef,
    controls,
    waterNormals
  }
}
