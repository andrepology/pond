import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'

interface ZenSandProps {
  size?: number
  segments?: number
  color?: string
  roughness?: number
  metalness?: number
  amplitude?: number
  frequency?: number
  driftSpeed?: number
  centers?: Array<[number, number]>
  position?: [number, number, number]
}

export default function ZenSand({
  size = 40,
  segments = 512,
  color = '#f3f3f3',
  roughness = 0.5,
  metalness = 1.9,
  amplitude = 0.008,
  frequency = 8.0,
  driftSpeed = 0.1,
  centers = [[0, 0]],
  position = [0, 0, 0]
}: ZenSandProps) {
  const materialRef = useRef<THREE.MeshLambertMaterial>(null)

  const {
    amplitude: ctrlAmplitude,
    frequency: ctrlFrequency,
    driftSpeed: ctrlDriftSpeed,
    color: ctrlColor
  } = useControls('Zen Sand', {
    amplitude: { value: amplitude, min: 0, max: 0.2, step: 0.001 },
    frequency: { value: frequency, min: 1, max: 30, step: 0.5 },
    driftSpeed: { value: driftSpeed, min: 0, max: 1.0, step: 0.01 },
    color: { value: color }
  })

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAmplitude: { value: ctrlAmplitude },
    uFrequency: { value: ctrlFrequency },
    uDrift: { value: ctrlDriftSpeed },
    // Support up to 3 centers for simplicity
    uCenters: { value: new Float32Array([0, 0, 0, 0, 0, 0]) },
    uCenterCount: { value: Math.min(centers.length, 3) }
  }), [ctrlAmplitude, ctrlFrequency, ctrlDriftSpeed, centers.length])

  // Update uniforms when controls change
  useMemo(() => {
    uniforms.uAmplitude.value = ctrlAmplitude
    uniforms.uFrequency.value = ctrlFrequency
    uniforms.uDrift.value = ctrlDriftSpeed
  }, [ctrlAmplitude, ctrlFrequency, ctrlDriftSpeed, uniforms])

  // Initialize centers array
  useMemo(() => {
    const arr = uniforms.uCenters.value as Float32Array
    for (let i = 0; i < 3; i++) {
      const c = centers[i]
      arr[2 * i + 0] = c ? c[0] : 0
      arr[2 * i + 1] = c ? c[1] : 0
    }
  }, [centers, uniforms])

  useFrame((_, delta) => {
    uniforms.uTime.value += delta
  })

  const onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uAmplitude = uniforms.uAmplitude
    shader.uniforms.uFrequency = uniforms.uFrequency
    shader.uniforms.uDrift = uniforms.uDrift
    shader.uniforms.uCenters = uniforms.uCenters
    shader.uniforms.uCenterCount = uniforms.uCenterCount

    // Inject uniforms
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform float uDrift;
      uniform vec2 uCenters[3];
      uniform int uCenterCount;

      float ring(float d, float freq, float phase){
        // Smoother wave using smoothstep for gentler transitions
        float wave = sin(d * freq + phase);
        return smoothstep(-0.8, 0.8, wave) * 2.0 - 1.0;
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

    // Keep fog and lighting intact
  }

  const geoArgs = useMemo<[number, number, number, number]>(() => [size, size, segments, segments], [size, segments])

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={geoArgs} />
      <meshLambertMaterial
        ref={materialRef}
        color={ctrlColor}
        onBeforeCompile={onBeforeCompile}
        fog
      />
    </mesh>
  )
}


