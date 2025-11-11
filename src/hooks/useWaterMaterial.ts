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
  normalStrength: number
  triplanarScale: number
  flowSpeed: number
  blendSharpness: number
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
    thickness: { value: 0.89, min: 0, max: 2, step: 0.01 },
    attenuationDistance: { value: 0.8, min: 0.1, max: 10, step: 0.1 },
    attenuationColor: '#ffffff',
    specularIntensity: { value: 0.92, min: 0, max: 1, step: 0.01 },
    normalStrength: { value: 0.16, min: 0, max: 2, step: 0.01 },
    triplanarScale: { value: 0.15, min: 0, max: 0.3, step: 0.01 },
    flowSpeed: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    blendSharpness: { value: 4.0, min: 1, max: 10, step: 0.5 }
  })

  const waterNormals = useTexture('/waternormals.jpg')

  // Setup texture properties
  useMemo(() => {
    if (waterNormals) {
      waterNormals.wrapS = THREE.RepeatWrapping
      waterNormals.wrapT = THREE.RepeatWrapping
      waterNormals.anisotropy = 16
      waterNormals.needsUpdate = true
    }
  }, [waterNormals])

  // Setup triplanar mapping shader
  useEffect(() => {
    const material = materialRef.current
    if (!material || !waterNormals) return

    material.onBeforeCompile = (shader) => {
      // Add custom uniforms
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uWaterNormalMap = { value: waterNormals }
      shader.uniforms.uTriplanarScale = { value: controls.triplanarScale }
      shader.uniforms.uNormalStrength = { value: controls.normalStrength }
      shader.uniforms.uFlowSpeed = { value: controls.flowSpeed }
      shader.uniforms.uBlendSharpness = { value: controls.blendSharpness }

      // Store reference for live updates
      shaderUniformsRef.current = shader.uniforms

      // Add uniforms and triplanar function to fragment shader
      shader.fragmentShader = `
        uniform float uTime;
        uniform sampler2D uWaterNormalMap;
        uniform float uTriplanarScale;
        uniform float uNormalStrength;
        uniform float uFlowSpeed;
        uniform float uBlendSharpness;
        
        // Triplanar normal mapping function
        vec3 triplanarNormal(vec3 worldPos, vec3 worldNormal) {
          // Calculate blend weights based on surface normal
          vec3 blendWeights = abs(worldNormal);
          blendWeights = pow(blendWeights, vec3(uBlendSharpness));
          blendWeights /= dot(blendWeights, vec3(1.0));
          
          // Animated offset for flow
          vec2 flowOffset = vec2(uTime * uFlowSpeed * 0.3, -uTime * uFlowSpeed);
          
          // Sample normal map from 3 planes
          vec2 uvX = worldPos.yz * uTriplanarScale + flowOffset;
          vec2 uvY = worldPos.xz * uTriplanarScale + flowOffset;
          vec2 uvZ = worldPos.xy * uTriplanarScale + flowOffset;
          
          // Sample and unpack normals (0-1 to -1 to 1)
          vec3 tnormalX = texture2D(uWaterNormalMap, uvX).xyz * 2.0 - 1.0;
          vec3 tnormalY = texture2D(uWaterNormalMap, uvY).xyz * 2.0 - 1.0;
          vec3 tnormalZ = texture2D(uWaterNormalMap, uvZ).xyz * 2.0 - 1.0;
          
          // Swizzle to correct axes for each projection plane
          // X projection (YZ plane): map texture XY to world YZ
          vec3 normalX = vec3(0.0, tnormalX.x, tnormalX.y);
          // Y projection (XZ plane): map texture XY to world XZ
          vec3 normalY = vec3(tnormalY.x, 0.0, tnormalY.y);
          // Z projection (XY plane): map texture XY to world XY
          vec3 normalZ = vec3(tnormalZ.x, tnormalZ.y, 0.0);
          
          // Blend the three projections
          vec3 blendedNormal = normalX * blendWeights.x + 
                               normalY * blendWeights.y + 
                               normalZ * blendWeights.z;
          
          // Apply strength and normalize
          blendedNormal.xy *= uNormalStrength;
          blendedNormal.z = sqrt(1.0 - dot(blendedNormal.xy, blendedNormal.xy));
          
          return normalize(blendedNormal);
        }
        
        ${shader.fragmentShader}
      `

      // Replace normal map calculation with triplanar version
      // MeshPhysicalMaterial with transmission provides vWorldPosition
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        #ifdef USE_NORMALMAP_OBJECTSPACE
          normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
          #ifdef FLIP_SIDED
            normal = - normal;
          #endif
          #ifdef DOUBLE_SIDED
            normal = normal * faceDirection;
          #endif
          normal = normalize( normalMatrix * normal );
        #elif defined( USE_NORMALMAP_TANGENTSPACE )
          // Use triplanar mapping - no UV seams possible
          vec3 mapN = triplanarNormal(vWorldPosition, normalize(vNormal));
          
          #ifdef USE_TANGENT
            normal = normalize( vTBN * mapN );
          #else
            // Manual TBN construction when tangents not available
            vec3 pos_dx = dFdx( vViewPosition );
            vec3 pos_dy = dFdy( vViewPosition );
            vec3 surfaceNormal = normalize( vNormal );
            
            // Construct tangent space basis
            vec3 tangent = normalize( pos_dx );
            vec3 bitangent = normalize( cross( surfaceNormal, tangent ) );
            mat3 vTBN = mat3( tangent, bitangent, surfaceNormal );
            
            normal = normalize( vTBN * mapN );
          #endif
        #endif
        `
      )
    }

    // Force material recompilation
    material.needsUpdate = true
  }, [waterNormals])

  // Update shader uniforms when controls change
  useEffect(() => {
    if (shaderUniformsRef.current) {
      if (shaderUniformsRef.current.uTriplanarScale) {
        shaderUniformsRef.current.uTriplanarScale.value = controls.triplanarScale
      }
      if (shaderUniformsRef.current.uNormalStrength) {
        shaderUniformsRef.current.uNormalStrength.value = controls.normalStrength
      }
      if (shaderUniformsRef.current.uFlowSpeed) {
        shaderUniformsRef.current.uFlowSpeed.value = controls.flowSpeed
      }
      if (shaderUniformsRef.current.uBlendSharpness) {
        shaderUniformsRef.current.uBlendSharpness.value = controls.blendSharpness
      }
    }
  }, [controls.triplanarScale, controls.normalStrength, controls.flowSpeed, controls.blendSharpness])

  // Animate time uniform
  useFrame((_, delta) => {
    if (shaderUniformsRef.current?.uTime) {
      shaderUniformsRef.current.uTime.value += delta
    }
  })

  return {
    materialRef,
    controls,
    waterNormals
  }
}
