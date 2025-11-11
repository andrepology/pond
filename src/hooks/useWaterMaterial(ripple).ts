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
  normalScale: number
  normalTiling: number
  flowU: number
  flowV: number
  displacementStrength: number
  rippleIntensity: number
  rippleSpeed: number
  rippleDecay: number
  rippleMaxRadius: number
}

interface Ripple {
  centerU: number
  centerV: number
  startTime: number
  intensity: number
}

interface UseWaterMaterialReturn {
  materialRef: React.MutableRefObject<THREE.MeshPhysicalMaterial | null>
  controls: WaterMaterialControls
  waterNormals: THREE.Texture | null
  createRipple: (u: number, v: number) => void
}

const MAX_RIPPLES = 16

export function useWaterMaterial(): UseWaterMaterialReturn {
  // All hooks must be called unconditionally and in the same order
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null)
  const shaderUniformsRef = useRef<any>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const ripplesRef = useRef<Ripple[]>([])
  const timeRef = useRef(0)
  const waterNormals = useTexture('/waternormals.jpg')

  const controls = useControls({
    'Water Material': folder({
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
    displacementStrength: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
    ripplesEnabled: false,
    rippleIntensity: { value: 0.3, min: 0, max: 2, step: 0.1 },
    rippleSpeed: { value: 0.5, min: 0.1, max: 5, step: 0.1 },
    rippleDecay: { value: 0.4, min: 0.1, max: 3, step: 0.1 },
    rippleMaxRadius: { value: 1.5, min: 0.1, max: 3, step: 0.1 }
  }, { collapsed: true })
})

  const createRipple = useCallback((u: number, v: number) => {
    setRipples(prev => {
      const newRipples = [...prev, {
        centerU: u,
        centerV: v,
        startTime: timeRef.current,
        intensity: controls.rippleIntensity
      }]
      // Keep only the most recent ripples
      const updated = newRipples.slice(-MAX_RIPPLES)
      ripplesRef.current = updated
      return updated
    })
  }, [controls.rippleIntensity])

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

  // Animate texture offset and update time/ripples
  useFrame((_, delta) => {
    timeRef.current += delta
    
    if (waterNormals) {
      waterNormals.offset.x += delta * controls.flowU
      waterNormals.offset.y += delta * controls.flowV
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
        
        // Update time
        if (uniforms.uTime) {
          uniforms.uTime.value = timeRef.current
        }

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
            // vec4: x=centerU, y=centerV, z=startTime, w=intensity
            rippleArray[i].set(ripple.centerU, ripple.centerV, ripple.startTime, ripple.intensity)
          } else {
            // Empty slot
            rippleArray[i].set(0, 0, -1, 0)
          }
        }
      }

      // Update ripple count
      if (uniforms.uRippleCount) {
        uniforms.uRippleCount.value = Math.min(currentRipples.length, MAX_RIPPLES)
      }
    }
  })

  // Setup vertex displacement and fragment ripple shaders
  useEffect(() => {
    const material = materialRef.current
    if (!material || !waterNormals) return

    material.onBeforeCompile = (shader) => {
      // Add custom uniforms
      shader.uniforms.uDisplacementStrength = { value: controls.displacementStrength }
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uRipplesEnabled = { value: controls.ripplesEnabled }
      shader.uniforms.uRippleSpeed = { value: controls.rippleSpeed }
      shader.uniforms.uRippleDecay = { value: controls.rippleDecay }
      shader.uniforms.uRippleMaxRadius = { value: controls.rippleMaxRadius }
      shader.uniforms.uRippleIntensity = { value: controls.rippleIntensity }
      shader.uniforms.uRippleCount = { value: 0 }
      
      // Array of ripples (vec4: centerU, centerV, startTime, intensity)
      const rippleArray = new Array(MAX_RIPPLES).fill(null).map(() => new THREE.Vector4(0, 0, -1, 0))
      shader.uniforms.uRipples = { value: rippleArray }

      // Store reference to shader uniforms for live updates
      shaderUniformsRef.current = shader.uniforms

      // Declare vUv varying in vertex shader (must match fragment shader declaration)
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec2 vUv;`
      )
      
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `uniform float uDisplacementStrength;
        #ifdef USE_NORMALMAP
          uniform sampler2D normalMap;
        #endif
        
        void main() {
          vUv = uv;`
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

      // Modify fragment shader to add ripple normal perturbation
      // Declare vUv varying explicitly (must match vertex shader)
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec2 vUv;`
      )
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <uv_pars_fragment>',
        `#include <uv_pars_fragment>
        uniform float uTime;
        uniform bool uRipplesEnabled;
        uniform float uRippleSpeed;
        uniform float uRippleDecay;
        uniform float uRippleMaxRadius;
        uniform float uRippleIntensity;
        uniform int uRippleCount;
        uniform vec4 uRipples[${MAX_RIPPLES}];

        // Calculate ripple effect and return normal perturbation
        vec2 calculateRippleNormal(vec2 uv, float time) {
          vec2 rippleNormal = vec2(0.0);

          if (!uRipplesEnabled) return rippleNormal;

          for (int i = 0; i < ${MAX_RIPPLES}; i++) {
            if (i >= uRippleCount) break;
            
            vec4 ripple = uRipples[i];
            vec2 center = ripple.xy;
            float startTime = ripple.z;
            float intensity = ripple.w;
            
            if (startTime < 0.0) continue; // Skip empty slots
            
            float age = time - startTime;
            if (age < 0.0) continue;
            
            // Distance from fragment to ripple center (handling UV wrap)
            vec2 delta = uv - center;
            delta = vec2(
              delta.x - floor(delta.x + 0.5),
              delta.y - floor(delta.y + 0.5)
            );
            float dist = length(delta);
            
            // Skip if beyond max radius
            if (dist > uRippleMaxRadius) continue;
            
            // Normalized distance [0-1]
            float normDist = dist / uRippleMaxRadius;
            
            // Create expanding ring pattern
            // Ripple propagates outward from center at constant speed
            float rippleRadius = age * uRippleSpeed;
            
            // Create a ring (sharp peak at ripple front)
            float ringWidth = 0.15;
            float distFromRing = abs(dist - rippleRadius);
            float ring = smoothstep(ringWidth, 0.0, distFromRing);
            
            // Add multiple frequency components for realistic ripple
            float wave1 = sin((dist - rippleRadius) * 30.0) * 0.5;
            float wave2 = sin((dist - rippleRadius) * 60.0) * 0.3;
            float wave = (wave1 + wave2) * ring;
            
            // Exponential decay over time only (not distance)
            float timeDecay = exp(-age * uRippleDecay);
            
            // Fade at edges of max radius
            float edgeFade = 1.0 - smoothstep(uRippleMaxRadius * 0.8, uRippleMaxRadius, dist);
            
            float totalDecay = timeDecay * edgeFade;
            
            // Calculate normal perturbation from gradient
            if (length(delta) > 0.001 && totalDecay > 0.01) {
              vec2 gradient = normalize(delta);
              // Smoother amplitude with ring effect
              float amplitude = wave * totalDecay * intensity * 0.5;
              
              rippleNormal += gradient * amplitude;
            }
          }
          
          return rippleNormal;
        }`
      )

      // Inject ripple normal perturbation after normal map sampling
      // We need to modify the normal before it's used in lighting calculations
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        
        // Apply ripple normal perturbation to the normal
        // vUv should be available from uv_pars_fragment chunk
        vec2 ripplePerturbation = calculateRippleNormal(vUv, uTime);
        float rippleStrength = length(ripplePerturbation);
        
        // Apply perturbation to normal xy components (z will be recalculated)
        normal.xy += ripplePerturbation;
        // Renormalize to maintain unit length
        normal = normalize(normal);
        
        // Debug visualization: tint fragments with ripples (comment out when done)
        // if (rippleStrength > 0.001) {
        //   gl_FragColor.rgb += vec3(rippleStrength * 2.0, 0.0, 0.0);
        // }`
      )
    }

    // Force material recompilation
    material.needsUpdate = true
  }, [waterNormals, controls.displacementStrength, controls.ripplesEnabled, controls.rippleSpeed, controls.rippleDecay, controls.rippleMaxRadius, controls.rippleIntensity])

  // Update shader uniform when displacement strength changes
  useEffect(() => {
    if (shaderUniformsRef.current?.uDisplacementStrength) {
      shaderUniformsRef.current.uDisplacementStrength.value = controls.displacementStrength
    }
  }, [controls.displacementStrength])

  return {
    materialRef,
    controls,
    waterNormals,
    createRipple
  }
}
