import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useControls, folder } from 'leva'

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
  displacementStrength: number
  ripplesEnabled: boolean
  rippleIntensity: number
  rippleSpeed: number
  rippleDecay: number
  rippleMaxRadius: number
}

interface Ripple {
  centerX: number
  centerY: number
  centerZ: number
  startTime: number
  intensity: number
}

interface UseWaterMaterialReturn {
  materialRef: React.MutableRefObject<THREE.MeshPhysicalMaterial | null>
  controls: WaterMaterialControls
  waterNormals: THREE.Texture | null
  createRipple: (worldPos: THREE.Vector3) => void
}

const MAX_RIPPLES = 16

export function useWaterMaterial(): UseWaterMaterialReturn {
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null)
  const shaderUniformsRef = useRef<any>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const ripplesRef = useRef<Ripple[]>([])
  const timeRef = useRef(0)

  const controls = useControls({
    'Water Material': folder({
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
    blendSharpness: { value: 4.0, min: 1, max: 10, step: 0.5 },
    displacementStrength: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
    Ripples: folder({
      ripplesEnabled: true,
      rippleIntensity: { value: 1.0, min: 0, max: 1, step: 0.05 },
      rippleSpeed: { value: 0.4, min: 0.1, max: 3, step: 0.1 },
      rippleDecay: { value: 2.4, min: 0.1, max: 5, step: 0.1 },
      rippleMaxRadius: { value: 1.0, min: 0.1, max: 1.0, step: 0.05 }
    })
  }, { collapsed: true })
})

  const createRipple = useCallback((worldPos: THREE.Vector3) => {
    setRipples(prev => {
      const newRipples = [...prev, {
        centerX: worldPos.x,
        centerY: worldPos.y,
        centerZ: worldPos.z,
        startTime: timeRef.current,
        intensity: controls.rippleIntensity
      }]
      const updated = newRipples.slice(-MAX_RIPPLES)
      ripplesRef.current = updated
      return updated
    })
  }, [controls.rippleIntensity])

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

  // Setup triplanar mapping shader with vertex displacement
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
      shader.uniforms.uDisplacementStrength = { value: controls.displacementStrength }

      // Ripple uniforms
      shader.uniforms.uRipplesEnabled = { value: true }
      shader.uniforms.uRippleSpeed = { value: 0.4 }
      shader.uniforms.uRippleDecay = { value: 2.4 }
      shader.uniforms.uRippleMaxRadius = { value: 1.0 }
      shader.uniforms.uRippleIntensity = { value: 1.0 }
      shader.uniforms.uRippleCount = { value: 0 }

      // Array of ripples (vec4: xyz=center, w=startTime)
      const rippleArray = new Array(MAX_RIPPLES).fill(null).map(() => new THREE.Vector4(0, 0, 0, -1))
      shader.uniforms.uRipples = { value: rippleArray }

      // Store reference for live updates
      shaderUniformsRef.current = shader.uniforms

      // Add vertex displacement uniforms and shared variables
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `uniform float uTime;
        uniform sampler2D uWaterNormalMap;
        uniform float uFlowSpeed;
        uniform float uDisplacementStrength;
        
        // Shared variables for displacement calculation
        vec2 flowOffset;
        vec2 displacementUv;
        vec2 texelSize;
        float dispCenter;
        float dispRight;
        float dispTop;
        
        void main() {`
      )

      // Compute displacement values and perturb normals in beginnormal_vertex
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        
        // Calculate displacement values (computed once, used for both normal and vertex)
        flowOffset = vec2(uTime * uFlowSpeed * 0.3, -uTime * uFlowSpeed);
        displacementUv = uv + flowOffset;
        texelSize = vec2(1.0 / 512.0); // Assuming 512x512 texture
        
        // Sample center and neighboring texels
        dispCenter = (texture2D(uWaterNormalMap, displacementUv).r + 
                      texture2D(uWaterNormalMap, displacementUv).g + 
                      texture2D(uWaterNormalMap, displacementUv).b) / 3.0;
        dispRight = (texture2D(uWaterNormalMap, displacementUv + vec2(texelSize.x, 0.0)).r +
                     texture2D(uWaterNormalMap, displacementUv + vec2(texelSize.x, 0.0)).g +
                     texture2D(uWaterNormalMap, displacementUv + vec2(texelSize.x, 0.0)).b) / 3.0;
        dispTop = (texture2D(uWaterNormalMap, displacementUv + vec2(0.0, texelSize.y)).r +
                   texture2D(uWaterNormalMap, displacementUv + vec2(0.0, texelSize.y)).g +
                   texture2D(uWaterNormalMap, displacementUv + vec2(0.0, texelSize.y)).b) / 3.0;
        
        // Compute gradients for normal perturbation (reduced multiplier to prevent normal flipping)
        vec2 gradient = vec2(dispRight - dispCenter, dispTop - dispCenter) * uDisplacementStrength * 3.5;
        
        // Perturb object normal based on displacement gradients
        vec3 displacedNormal = normalize(objectNormal - vec3(gradient.x, gradient.y, 0.0));
        objectNormal = displacedNormal;`
      )

      // Apply smooth displacement using precomputed values
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        
        // Apply smooth displacement with gentler smoothstep to prevent folding
        float displacement = smoothstep(0.2, 0.8, dispCenter);
        transformed += objectNormal * displacement * uDisplacementStrength;`
      )

      // Add uniforms and triplanar function to fragment shader
      shader.fragmentShader = `
        uniform float uTime;
        uniform sampler2D uWaterNormalMap;
        uniform float uTriplanarScale;
        uniform float uNormalStrength;
        uniform float uFlowSpeed;
        uniform float uBlendSharpness;
        uniform bool uRipplesEnabled;
        uniform float uRippleSpeed;
        uniform float uRippleDecay;
        uniform float uRippleMaxRadius;
        uniform float uRippleIntensity;
        uniform int uRippleCount;
        uniform vec4 uRipples[${MAX_RIPPLES}];

        // Calculate world-space ripple perturbation
        vec3 calculateRippleNormal(vec3 worldPos, float time) {
          vec3 rippleNormal = vec3(0.0);

          if (!uRipplesEnabled) return rippleNormal;

          for (int i = 0; i < ${MAX_RIPPLES}; i++) {
            if (i >= uRippleCount) break;

            vec4 ripple = uRipples[i];
            vec3 center = ripple.xyz;
            float startTime = ripple.w;

            if (startTime < 0.0) continue; // Skip empty slots

            float age = time - startTime;
            if (age < 0.0) continue;

            // 3D distance from fragment to ripple center
            vec3 delta = worldPos - center;
            float dist = length(delta);

            // Skip if beyond max radius
            if (dist > uRippleMaxRadius) continue;

            // Normalized distance [0-1]
            float normDist = dist / uRippleMaxRadius;

            // Create expanding ring pattern
            float rippleRadius = age * uRippleSpeed;

            // Create a ring (sharp peak at ripple front)
            float ringWidth = 0.08;
            float distFromRing = abs(dist - rippleRadius);
            float ring = smoothstep(ringWidth, 0.0, distFromRing);

            // Add multiple frequency components for realistic ripple
            float wave1 = sin((dist - rippleRadius) * 40.0) * 0.5;
            float wave2 = sin((dist - rippleRadius) * 80.0) * 0.3;
            float wave = (wave1 + wave2) * ring;

            // Exponential decay over time only (not distance)
            float timeDecay = exp(-age * uRippleDecay);

            // Fade at edges of max radius
            float edgeFade = 1.0 - smoothstep(uRippleMaxRadius * 0.7, uRippleMaxRadius, dist);

            float totalDecay = timeDecay * edgeFade;

            // Calculate normal perturbation from gradient
            if (length(delta) > 0.001 && totalDecay > 0.01) {
              vec3 gradient = normalize(delta);
              // Smoother amplitude with ring effect
              float amplitude = wave * totalDecay * uRippleIntensity * 0.5;

              rippleNormal += gradient * amplitude;
            }
          }

          return rippleNormal;
        }

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

        // Apply ripple normal perturbation to the final normal
        vec3 ripplePerturbation = calculateRippleNormal(vWorldPosition, uTime);
        normal += ripplePerturbation;
        normal = normalize(normal);
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
      if (shaderUniformsRef.current.uDisplacementStrength) {
        shaderUniformsRef.current.uDisplacementStrength.value = controls.displacementStrength
      }
    }
  }, [controls.triplanarScale, controls.normalStrength, controls.flowSpeed, controls.blendSharpness, controls.displacementStrength])

  // Animate time uniform and manage ripples
  useFrame((_, delta) => {
    timeRef.current += delta

    if (shaderUniformsRef.current?.uTime) {
      shaderUniformsRef.current.uTime.value = timeRef.current
    }

    // Remove expired ripples (older than ripple lifetime)
    const maxAge = controls.rippleMaxRadius / controls.rippleSpeed
    const currentRipples = ripplesRef.current.filter(r => (timeRef.current - r.startTime) < maxAge)

    // Update ref and state
    if (currentRipples.length !== ripplesRef.current.length) {
      ripplesRef.current = currentRipples
      setRipples(currentRipples)
    }

    // Update shader uniforms with current ripple data
    if (shaderUniformsRef.current) {
      const uniforms = shaderUniformsRef.current

      // Update ripple enable state
      if (uniforms.uRipplesEnabled) {
        uniforms.uRipplesEnabled.value = controls.ripplesEnabled
      }

      // Update ripple parameters
      if (uniforms.uRippleSpeed) {
        uniforms.uRippleSpeed.value = controls.rippleSpeed
      }
      if (uniforms.uRippleDecay) {
        uniforms.uRippleDecay.value = controls.rippleDecay
      }
      if (uniforms.uRippleMaxRadius) {
        uniforms.uRippleMaxRadius.value = controls.rippleMaxRadius
      }
      if (uniforms.uRippleIntensity) {
        uniforms.uRippleIntensity.value = controls.rippleIntensity
      }

      // Pack ripple data into uniform array
      if (uniforms.uRipples) {
        const rippleArray = uniforms.uRipples.value
        for (let i = 0; i < MAX_RIPPLES; i++) {
          if (i < currentRipples.length) {
            const ripple = currentRipples[i]
            // vec4: x=centerX, y=centerY, z=centerZ, w=startTime
            rippleArray[i].set(ripple.centerX, ripple.centerY, ripple.centerZ, ripple.startTime)
          } else {
            // Empty slot
            rippleArray[i].set(0, 0, 0, -1)
          }
        }
      }

      // Update ripple count
      if (uniforms.uRippleCount) {
        uniforms.uRippleCount.value = Math.min(currentRipples.length, MAX_RIPPLES)
      }
    }
  })

  return {
    materialRef,
    controls,
    waterNormals,
    createRipple
  }
}
