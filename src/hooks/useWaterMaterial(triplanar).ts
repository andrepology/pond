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

  // Animate texture offset via shader uniform
  useFrame((_, delta) => {
    if (shaderUniformsRef.current?.uTextureOffset) {
      shaderUniformsRef.current.uTextureOffset.value.x += delta * controls.flowU
      shaderUniformsRef.current.uTextureOffset.value.y += delta * controls.flowV
    }
  })

  // Setup triplanar mapping shader
  useEffect(() => {
    const material = materialRef.current
    if (!material || !waterNormals) return

    material.onBeforeCompile = (shader) => {
      // Add custom uniforms
      shader.uniforms.uDisplacementStrength = { value: controls.displacementStrength }
      shader.uniforms.uTriplanarScale = { value: controls.normalTiling }
      shader.uniforms.uWaterNormalMap = { value: waterNormals }
      shader.uniforms.uNormalScale = { value: controls.normalScale }
      shader.uniforms.uTextureOffset = { value: new THREE.Vector2(0, 0) }

      // Store reference to shader uniforms for live updates
      shaderUniformsRef.current = shader.uniforms

      // Add custom varying and uniforms to vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `uniform float uDisplacementStrength;
        uniform float uTriplanarScale;
        uniform sampler2D uWaterNormalMap;
        uniform vec2 uTextureOffset;
        varying vec3 vTriplanarPos;
        
        vec3 triplanarSample(sampler2D tex, vec3 pos, vec3 normal, float scale) {
          vec3 blendWeights = abs(normal);
          blendWeights = pow(blendWeights, vec3(8.0));
          blendWeights /= (blendWeights.x + blendWeights.y + blendWeights.z);
          
          vec3 xSample = texture2D(tex, pos.zy * scale + uTextureOffset).rgb;
          vec3 ySample = texture2D(tex, pos.xz * scale + uTextureOffset).rgb;
          vec3 zSample = texture2D(tex, pos.xy * scale + uTextureOffset).rgb;
          
          return xSample * blendWeights.x + ySample * blendWeights.y + zSample * blendWeights.z;
        }
        
        void main() {`
      )

      // Inject vertex displacement and pass position to fragment
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        
        vTriplanarPos = position;
        vec3 triplanarColor = triplanarSample(uWaterNormalMap, position, normal, uTriplanarScale);
        float displacement = (triplanarColor.r + triplanarColor.g + triplanarColor.b) / 3.0;
        transformed += objectNormal * displacement * uDisplacementStrength;`
      )

      // Add triplanar normal mapping to fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `varying vec3 vTriplanarPos;
        uniform sampler2D uWaterNormalMap;
        uniform float uTriplanarScale;
        uniform float uNormalScale;
        uniform vec2 uTextureOffset;
        
        vec3 triplanarNormal(sampler2D tex, vec3 pos, vec3 normal, float scale, float strength) {
          vec3 blendWeights = abs(normal);
          blendWeights = pow(blendWeights, vec3(8.0));
          blendWeights /= (blendWeights.x + blendWeights.y + blendWeights.z);
          
          vec3 xNormal = texture2D(tex, pos.zy * scale + uTextureOffset).rgb * 2.0 - 1.0;
          vec3 yNormal = texture2D(tex, pos.xz * scale + uTextureOffset).rgb * 2.0 - 1.0;
          vec3 zNormal = texture2D(tex, pos.xy * scale + uTextureOffset).rgb * 2.0 - 1.0;
          
          xNormal = vec3(0.0, xNormal.y, xNormal.x);
          yNormal = vec3(yNormal.x, 0.0, yNormal.y);
          zNormal = vec3(zNormal.x, zNormal.y, 0.0);
          
          vec3 blendedNormal = xNormal * blendWeights.x + yNormal * blendWeights.y + zNormal * blendWeights.z;
          blendedNormal.xy *= strength;
          return normalize(blendedNormal);
        }
        
        void main() {`
      )

      // Replace the normal map calculation
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#ifdef USE_NORMALMAP_OBJECTSPACE
          normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
          #ifdef FLIP_SIDED
            normal = - normal;
          #endif
          #ifdef DOUBLE_SIDED
            normal = normal * faceDirection;
          #endif
          normal = normalize( normalMatrix * normal );
        #elif defined( USE_NORMALMAP_TANGENTSPACE )
          // Use triplanar mapping instead of UV-based normal map
          vec3 mapN = triplanarNormal(uWaterNormalMap, vTriplanarPos, vNormal, uTriplanarScale, uNormalScale);
          mapN.xy *= normalScale;
          normal = normalize( tbn * mapN );
        #endif`
      )
    }

    // Force material recompilation
    material.needsUpdate = true
  }, [waterNormals, controls.displacementStrength, controls.normalTiling, controls.normalScale])

  // Update shader uniforms when controls change
  useEffect(() => {
    if (shaderUniformsRef.current) {
      if (shaderUniformsRef.current.uDisplacementStrength) {
        shaderUniformsRef.current.uDisplacementStrength.value = controls.displacementStrength
      }
      if (shaderUniformsRef.current.uTriplanarScale) {
        shaderUniformsRef.current.uTriplanarScale.value = controls.normalTiling
      }
      if (shaderUniformsRef.current.uNormalScale) {
        shaderUniformsRef.current.uNormalScale.value = controls.normalScale
      }
    }
  }, [controls.displacementStrength, controls.normalTiling, controls.normalScale])

  return {
    materialRef,
    controls,
    waterNormals
  }
}
