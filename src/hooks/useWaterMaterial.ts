import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useControls, folder } from 'leva'

// Simplex noise GLSL (3D), adapted from the implementation used in MeshDistortMaterial
// Public domain / Stefan Gustavson; compacted for embedding
const DISTORT_NOISE_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1),
                          dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
`

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
  ripplesEnabled: boolean
  rippleIntensity: number
  rippleSpeed: number
  rippleDecay: number
  rippleMaxRadius: number
  distortAmount: number
  distortRadius: number
  distortSpeed: number
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
    normalStrength: { value: 0.20, min: 0, max: 2, step: 0.01 },
    triplanarScale: { value: 0.07, min: 0, max: 0.3, step: 0.01 },
    flowSpeed: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    blendSharpness: { value: 1.5, min: 1, max: 10, step: 0.5 },
  Distortion: folder({
    distortAmount: { value: 0.12, min: 0, max: 1, step: 0.01 },
    distortRadius: { value: 1.02, min: 0.5, max: 1.5, step: 0.01 },
    distortSpeed: { value: 0.06, min: 0.0, max: 0.14, step: 0.01 }
  }),
    Ripples: folder({
      ripplesEnabled: true,
      rippleIntensity: { value: 1.0, min: 0, max: 1, step: 0.05 },
      rippleSpeed: { value: 0.4, min: 0.1, max: 3, step: 0.1 },
      rippleDecay: { value: 1.5, min: 0.1, max: 5, step: 0.1 },
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

  const waterNormals = useTexture('/waternormals/waternormals_3.jpg')

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
      shader.uniforms.uDistortAmount = { value: controls.distortAmount }
      shader.uniforms.uDistortRadius = { value: controls.distortRadius }
      shader.uniforms.uDistortSpeed = { value: controls.distortSpeed }

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

      // Add vertex displacement uniforms, noise, and shared variables
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `        uniform float uTime;
        uniform sampler2D uWaterNormalMap;
        uniform float uFlowSpeed;
        uniform float uDistortAmount;
        uniform float uDistortRadius;
        uniform float uDistortSpeed;

        ${DISTORT_NOISE_GLSL}

        void main() {`
      )

      // Override begin_vertex to apply simplex-noise-based radial distortion
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3(position);

        float updateTime = uTime * uDistortSpeed;
        float noise = snoise(vec3(position * 0.5 + updateTime * 5.0));
        transformed = position * (noise * pow(uDistortAmount, 2.0) + uDistortRadius);
        `
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

        // Triplanar normal mapping function (world-space), following the
        // BGolus-style approach for UV flipping and per-plane bases.
        vec3 triplanarNormal(vec3 worldPos, vec3 worldGeomNormal) {
          // Calculate blend weights from geometric world normal
          vec3 blendWeights = abs(worldGeomNormal);
          blendWeights = pow(blendWeights, vec3(uBlendSharpness));
          blendWeights /= max(dot(blendWeights, vec3(1.0)), 0.0001);

          // Animated offset for flow
          vec2 flowOffset = vec2(uTime * uFlowSpeed * 0.3, -uTime * uFlowSpeed);

          // Sign for each axis so +X/-X, +Y/-Y, +Z/-Z are consistent.
          // Use explicit comparison to avoid 0.0 from sign() and keep values strictly +/-1.
          vec3 axisSign = vec3(
            worldGeomNormal.x >= 0.0 ? 1.0 : -1.0,
            worldGeomNormal.y >= 0.0 ? 1.0 : -1.0,
            worldGeomNormal.z >= 0.0 ? 1.0 : -1.0
          );

          // Projected UVs for each axis (world-space triplanar)
          // X-facing plane uses YZ, Y-facing uses XZ, Z-facing uses XY.
          // Add small per-plane phase offsets (BGolus-style) to decorrelate samples and hide seams.
          vec2 uvX = worldPos.zy * uTriplanarScale + flowOffset;
          vec2 uvY = worldPos.xz * uTriplanarScale + flowOffset + vec2(0.33, 0.33);
          vec2 uvZ = worldPos.xy * uTriplanarScale + flowOffset + vec2(0.67, 0.67);

          // Flip UVs to correct for mirroring based on axis sign
          uvX.x *= axisSign.x;
          uvY.x *= axisSign.y;
          uvZ.x *= -axisSign.z;

          // Sample and unpack normals (0-1 to -1 to 1) in tangent space
          vec3 tnormalX = texture2D(uWaterNormalMap, uvX).xyz * 2.0 - 1.0;
          vec3 tnormalY = texture2D(uWaterNormalMap, uvY).xyz * 2.0 - 1.0;
          vec3 tnormalZ = texture2D(uWaterNormalMap, uvZ).xyz * 2.0 - 1.0;

          // Flip tangent-space normals to match the flipped UVs
          tnormalX.x *= axisSign.x;
          tnormalY.x *= axisSign.y;
          tnormalZ.x *= -axisSign.z;

          // Build per-axis world-space normals from tangent-space samples.
          // For each plane, define tangent (u), bitangent (v), and normal (n) in world space:
          //  - X plane:   u = +Z, v = +Y, n = +/-X
          //  - Y plane:   u = +X, v = +Z, n = +/-Y
          //  - Z plane:   u = +X, v = +Y, n = +/-Z
          vec3 normalX = normalize(
            tnormalX.x * vec3(0.0, 0.0, 1.0) +  // u: +Z
            tnormalX.y * vec3(0.0, 1.0, 0.0) +  // v: +Y
            tnormalX.z * vec3(axisSign.x, 0.0, 0.0) // n: +/-X
          );

          vec3 normalY = normalize(
            tnormalY.x * vec3(1.0, 0.0, 0.0) +  // u: +X
            tnormalY.y * vec3(0.0, 0.0, 1.0) +  // v: +Z
            tnormalY.z * vec3(0.0, axisSign.y, 0.0) // n: +/-Y
          );

          vec3 normalZ = normalize(
            tnormalZ.x * vec3(1.0, 0.0, 0.0) +  // u: +X
            tnormalZ.y * vec3(0.0, 1.0, 0.0) +  // v: +Y
            tnormalZ.z * vec3(0.0, 0.0, axisSign.z) // n: +/-Z
          );

          // Whiteout-style blend between the three axis normals
          vec3 blendedNormal = normalize(
            normalX * blendWeights.x +
            normalY * blendWeights.y +
            normalZ * blendWeights.z
          );

          // Mix between geometric normal and blended map normal for stability
          float strength = clamp(uNormalStrength, 0.0, 1.0);
          return normalize(mix(worldGeomNormal, blendedNormal, strength));
        }
        
        ${shader.fragmentShader}
      `

      // Replace normal map calculation with triplanar version working in world space
      // MeshPhysicalMaterial with transmission provides vWorldPosition
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        // Derive geometric world-space normal from view-space normal
        // "normal" is in view space at this point; convert it back to world space
        vec3 worldGeomNormal = inverseTransformDirection( normal, viewMatrix );
        worldGeomNormal = normalize( worldGeomNormal );

        // Triplanar normal in world space
        vec3 worldNormal = triplanarNormal(vWorldPosition, worldGeomNormal);

        // Apply ripple normal perturbation in world space
        vec3 ripplePerturbation = calculateRippleNormal(vWorldPosition, uTime);
        worldNormal = normalize(worldNormal + ripplePerturbation);

        // Transform back to view space for lighting
        normal = transformDirection( worldNormal, viewMatrix );
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
      if (shaderUniformsRef.current.uDistortAmount) {
        shaderUniformsRef.current.uDistortAmount.value = controls.distortAmount
      }
      if (shaderUniformsRef.current.uDistortRadius) {
        shaderUniformsRef.current.uDistortRadius.value = controls.distortRadius
      }
      if (shaderUniformsRef.current.uDistortSpeed) {
        shaderUniformsRef.current.uDistortSpeed.value = controls.distortSpeed
      }
    }
  }, [
    controls.triplanarScale,
    controls.normalStrength,
    controls.flowSpeed,
    controls.blendSharpness,
    controls.distortAmount,
    controls.distortRadius,
    controls.distortSpeed
  ])

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
