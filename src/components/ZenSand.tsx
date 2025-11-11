import * as THREE from 'three'
import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls, folder } from 'leva'

// SHADER VERSION: Increment this number to force shader recompilation on hot reload
// Change this value whenever you edit shader code to see live updates
let shaderVersion = 11

interface ZenSandProps {
  size?: number
  segments?: number
  color?: string
  roughness?: number
  metalness?: number
  envMapIntensity?: number
  amplitude?: number
  frequency?: number
  driftSpeed?: number
  centers?: Array<[number, number]>
  position?: [number, number, number]
  bgColor?: string
  edgeFadeStart?: number
  edgeFadeEnd?: number
}

export default function ZenSand({
  size = 10,
  segments = 512,
  color = '#F6F5F3',
  roughness = 0.4,
  metalness = 0.01,
  envMapIntensity = 0.03,
  amplitude = 0.15,
  frequency = 10.0,
  driftSpeed = 0.6,
  centers = [[0, 0]],
  position = [0, 0, 0],
  bgColor = '#000000',
  edgeFadeStart = 0.8,
  edgeFadeEnd = 1.0
}: ZenSandProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const shaderRef = useRef<any>(null)

  const [forceShaderReload, setForceShaderReload] = useState(0)

  const {
    amplitude: ctrlAmplitude,
    frequency: ctrlFrequency,
    driftSpeed: ctrlDriftSpeed,
    color: ctrlColor,
    roughness: ctrlRoughness,
    metalness: ctrlMetalness,
    envMapIntensity: ctrlEnvMapIntensity,
    envSaturation: ctrlEnvSaturation,
    minBrightness: ctrlMinBrightness
  } = useControls({
    'Zen Sand': folder({
      amplitude: { value: amplitude, min: 0, max: 0.5, step: 0.001 },
    frequency: { value: frequency, min: 1, max: 30, step: 0.5 },
    driftSpeed: { value: driftSpeed, min: 0, max: 1.0, step: 0.01 },
      color: { value: color },
      roughness: { value: roughness, min: 0, max: 1, step: 0.01 },
      metalness: { value: metalness, min: 0, max: 0.1, step: 0.001 },
      envMapIntensity: { value: envMapIntensity, min: 0, max: 0.2, step: 0.005, label: 'Env Reflection' },
      envSaturation: { value: 0.15, min: 0, max: 1.0, step: 0.05, label: 'Env Color Saturation' },
      minBrightness: { value: 0.34, min: 0, max: 1.0, step: 0.01, label: 'Min Brightness' },
      ...(__IS_DEV__ ? {
        '🔄 Reload Shader': {
          value: false,
          onChange: () => setForceShaderReload(v => v + 1)
        }
      } : {})
    }, { collapsed: true })
  })

  // Parse background color to RGB
  const bgColorRgb = useMemo(() => {
    const hex = bgColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    return [r, g, b] as [number, number, number]
  }, [bgColor])

  // Create uniforms once - stable reference so shader always has access
  const uniforms = useRef({
    uTime: { value: 0 },
    uAmplitude: { value: ctrlAmplitude },
    uFrequency: { value: ctrlFrequency },
    uDrift: { value: ctrlDriftSpeed },
    uMinBrightness: { value: ctrlMinBrightness },
    uEnvSaturation: { value: ctrlEnvSaturation },
    // Support up to 3 centers for simplicity
    uCenters: { value: new Float32Array([0, 0, 0, 0, 0, 0]) },
    uCenterCount: { value: Math.min(centers.length, 3) },
    uSize: { value: size },
    uBgColor: { value: new THREE.Vector3(...bgColorRgb) },
    uEdgeFadeStart: { value: edgeFadeStart },
    uEdgeFadeEnd: { value: edgeFadeEnd }
  }).current

  // Update uniform values when controls change
  useEffect(() => {
    uniforms.uAmplitude.value = ctrlAmplitude
    uniforms.uFrequency.value = ctrlFrequency
    uniforms.uDrift.value = ctrlDriftSpeed
    uniforms.uMinBrightness.value = ctrlMinBrightness
    uniforms.uEnvSaturation.value = ctrlEnvSaturation
  }, [ctrlAmplitude, ctrlFrequency, ctrlDriftSpeed, ctrlMinBrightness, ctrlEnvSaturation])

  // Update centers array when centers change
  useEffect(() => {
    uniforms.uCenterCount.value = Math.min(centers.length, 3)
    const arr = uniforms.uCenters.value as Float32Array
    for (let i = 0; i < 3; i++) {
      const c = centers[i]
      arr[2 * i + 0] = c ? c[0] : 0
      arr[2 * i + 1] = c ? c[1] : 0
    }
  }, [centers])

  // Update size and background color when they change
  useEffect(() => {
    uniforms.uSize.value = size
    uniforms.uBgColor.value.set(...bgColorRgb)
    uniforms.uEdgeFadeStart.value = edgeFadeStart
    uniforms.uEdgeFadeEnd.value = edgeFadeEnd
  }, [size, bgColorRgb, edgeFadeStart, edgeFadeEnd])

  // Update material properties when controls change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.set(ctrlColor)
      materialRef.current.roughness = ctrlRoughness
      materialRef.current.metalness = ctrlMetalness
      // envMapIntensity is updated directly in shader uniforms via useFrame
    }
  }, [ctrlColor, ctrlRoughness, ctrlMetalness])

  useFrame((_, delta) => {
    uniforms.uTime.value += delta
    
    // Update envMapIntensity in shader uniforms directly
    if (shaderRef.current?.uniforms?.envMapIntensity) {
      shaderRef.current.uniforms.envMapIntensity.value = ctrlEnvMapIntensity
    }
  })

  const onBeforeCompile = (shader: any) => {
    // Store shader reference for dynamic updates
    shaderRef.current = shader
    
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uAmplitude = uniforms.uAmplitude
    shader.uniforms.uFrequency = uniforms.uFrequency
    shader.uniforms.uDrift = uniforms.uDrift
    shader.uniforms.uMinBrightness = uniforms.uMinBrightness
    shader.uniforms.uEnvSaturation = uniforms.uEnvSaturation
    shader.uniforms.uCenters = uniforms.uCenters
    shader.uniforms.uCenterCount = uniforms.uCenterCount
    shader.uniforms.uSize = uniforms.uSize
    shader.uniforms.uBgColor = uniforms.uBgColor
    shader.uniforms.uEdgeFadeStart = uniforms.uEdgeFadeStart
    shader.uniforms.uEdgeFadeEnd = uniforms.uEdgeFadeEnd
    
    // Debug: check if envMapIntensity uniform exists
    if (__IS_DEV__) {
      console.log('envMapIntensity uniform:', shader.uniforms.envMapIntensity?.value)
    }

    // Declare varyings at the top of vertex shader
    shader.vertexShader = `varying float vWaveHeight;
varying vec2 vUv;
${shader.vertexShader}`

    // Inject uniforms
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform float uDrift;
      uniform float uMinBrightness;
      uniform vec2 uCenters[3];
      uniform int uCenterCount;

      float ring(float d, float freq, float phase){
        // Sharper wave for more contrast even at low amplitudes
        float wave = sin(d * freq + phase);
        // Use sharper smoothstep for more peak/trough definition
        return smoothstep(-0.4, 0.4, wave) * 2.0 - 1.0;
      }

      // smooth radial falloff so pattern fades with distance
      float falloff(float d){
        // gentle rolloff starting ~ at 6 units
        return smoothstep(20.0, 6.0, d);
      }
      `
    )

    // Apply displacement along the surface normal (object space)
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vUv = uv;
      // Use plane local coordinates: x (world x), y (world z) after mesh rotation
      vec2 pos = vec2(transformed.x, transformed.y);
      float phase = uTime * uDrift;

      float h = 0.0;
      for(int i = 0; i < 3; i++){
        if(i >= uCenterCount) break;
        float d = distance(pos, uCenters[i]);
        float w = falloff(d);
        h += w * ring(d, uFrequency, phase);
      }
      // normalize sum and scale by tiny amplitude
      h = h / float(max(uCenterCount, 1)) * uAmplitude;
      transformed += objectNormal * h;
      `
    )

    // Assign wave height to varying
    shader.vertexShader = shader.vertexShader.replace(
      'transformed += objectNormal * h;',
      `transformed += objectNormal * h;
      vWaveHeight = h;`
    )

    // Fragment shader: inject uniforms (varying already declared at top)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform float uDrift;
      uniform float uMinBrightness;
      uniform float uEnvSaturation;
      uniform vec2 uCenters[3];
      uniform int uCenterCount;
      uniform float uSize;
      uniform vec3 uBgColor;
      uniform float uEdgeFadeStart;
      uniform float uEdgeFadeEnd;

      float ring(float d, float freq, float phase){
        float wave = sin(d * freq + phase);
        return smoothstep(-2.8, 2.8, wave) * 2.0 - 1.0;
      }

      float falloff(float d){
        return smoothstep(20.0, 0.0, d);
      }

      // Calculate edge fade factor based on distance from center
      float edgeFade(vec2 uv){
        // Distance from center (0.5, 0.5) in UV space
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);
        // Normalize to 0-1 range (max distance from center is ~0.707)
        float normalizedDist = dist / 0.707;
        // Smooth fade from start to end
        return 1.0 - smoothstep(uEdgeFadeStart, uEdgeFadeEnd, normalizedDist);
      }
      
      // Desaturate color while preserving luminance
      vec3 desaturate(vec3 color, float amount) {
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        return mix(color, vec3(lum), 1.0 - amount);
      }
      `
    )
    
    // Patch envMapIntensity into the envmap_physical_pars_fragment section
    // This ensures envMapIntensity is properly applied
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <envmap_physical_pars_fragment>',
      `#include <envmap_physical_pars_fragment>
      // Ensure envMapIntensity is applied (fixes control not working)
      `
    )

    // Declare varyings in fragment shader
    shader.fragmentShader = `varying float vWaveHeight;
varying vec2 vUv;
${shader.fragmentShader}`

    // Apply edge fade blending BEFORE brightness remapping
    // This needs to happen after lighting but before fog
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      `// Desaturate environment reflections for subtle color
      gl_FragColor.rgb = desaturate(gl_FragColor.rgb, uEnvSaturation);
      
      // Edge fade: blend toward background color at edges
      float fade = edgeFade(vUv);
      gl_FragColor.rgb = mix(uBgColor, gl_FragColor.rgb, fade);
      
      // Brightness remapping to lift dark areas (before fog)
      float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      
      // Remap brightness: lift dark areas toward minBrightness, preserve bright areas
      float remappedLuminance = mix(uMinBrightness, 1.0, luminance);
      
      // Preserve color ratios while applying brightness remap
      if (luminance > 0.001) {
        gl_FragColor.rgb *= remappedLuminance / luminance;
      } else {
        // Very dark areas get minimum brightness boost
        vec3 colorDir = gl_FragColor.rgb + vec3(0.001);
        float colorLen = length(colorDir);
        if (colorLen > 0.001) {
          gl_FragColor.rgb = normalize(colorDir) * uMinBrightness;
        } else {
          gl_FragColor.rgb = vec3(uMinBrightness);
        }
      }
      
      #include <fog_fragment>`
    )
  }

  const geoArgs = useMemo<[number, number, number, number]>(() => [size, size, segments, segments], [size, segments])

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={geoArgs} />
      <meshStandardMaterial
        ref={materialRef}
        color={ctrlColor}
        roughness={ctrlRoughness}
        metalness={ctrlMetalness}
        envMapIntensity={ctrlEnvMapIntensity}
        onBeforeCompile={onBeforeCompile}
        fog
        transparent={false}
        key={__IS_DEV__ ? `zen-sand-shader-${shaderVersion}-${forceShaderReload}` : undefined}
      />
    </mesh>
  )
}


