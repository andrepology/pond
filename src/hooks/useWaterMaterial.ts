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
  flowU: number
  flowV: number
  displacementStrength: number
}

interface UseWaterMaterialReturn {
  materialRef: React.MutableRefObject<THREE.MeshPhysicalMaterial | null>
  controls: WaterMaterialControls
  waterNormals: THREE.Texture | null
}

export function useWaterMaterial(): UseWaterMaterialReturn {
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null)
  const shaderUniformsRef = useRef<any>(null)

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
    flowU: { value: 0.00, min: -0.3, max: 0.3, step: 0.001 },
    flowV: { value: -0.01, min: -0.3, max: 0.3, step: 0.001 },
    displacementStrength: { value: 0.02, min: 0, max: 0.1, step: 0.001 }
  })

  const waterNormals = useTexture('/waternormals.jpg')

  // Setup texture properties
  useMemo(() => {
    if (waterNormals) {
      waterNormals.wrapS = THREE.RepeatWrapping
      waterNormals.wrapT = THREE.RepeatWrapping
      waterNormals.anisotropy = 4
      waterNormals.needsUpdate = true
    }
  }, [waterNormals])

  // Update texture repeat based on tiling control
  useEffect(() => {
    if (waterNormals) {
      waterNormals.repeat.set(controls.normalTiling, controls.normalTiling)
    }
  }, [waterNormals, controls.normalTiling])

  // Animate texture offset
  useFrame((_, delta) => {
    if (waterNormals) {
      waterNormals.offset.x += delta * controls.flowU
      waterNormals.offset.y += delta * controls.flowV
    }
  })

  // Setup vertex displacement shader
  useEffect(() => {
    const material = materialRef.current
    if (!material || !waterNormals) return

    material.onBeforeCompile = (shader) => {
      // Add custom uniform for displacement strength
      shader.uniforms.uDisplacementStrength = { value: controls.displacementStrength }

      // Store reference to shader uniforms for live updates
      shaderUniformsRef.current = shader.uniforms

      // Declare custom uniforms in vertex shader
      // normalMap needs to be declared for vertex shader access
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `uniform float uDisplacementStrength;
        #ifdef USE_NORMALMAP
          uniform sampler2D normalMap;
        #endif
        
        void main() {`
      )

      // Inject vertex displacement code after begin_vertex
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        
        // Sample normal map for displacement
        #ifdef USE_NORMALMAP
          vec2 normalUv = (normalMapTransform * vec3(uv, 1.0)).xy;
          vec4 normalSample = texture2D(normalMap, normalUv);
          float displacement = (normalSample.r + normalSample.g + normalSample.b) / 3.0;
          transformed += objectNormal * displacement * uDisplacementStrength;
        #endif`
      )
    }

    // Force material recompilation
    material.needsUpdate = true
  }, [waterNormals, controls.displacementStrength])

  // Update shader uniform when displacement strength changes
  useEffect(() => {
    if (shaderUniformsRef.current?.uDisplacementStrength) {
      shaderUniformsRef.current.uDisplacementStrength.value = controls.displacementStrength
    }
  }, [controls.displacementStrength])

  return {
    materialRef,
    controls,
    waterNormals
  }
}
