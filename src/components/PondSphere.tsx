import * as THREE from 'three'
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Icosahedron, Center, useTexture } from '@react-three/drei'
import SphericalSky from './SphericalSky'
import Starfield, { type StarfieldHandle } from './Starfield'
import Fish2 from '../fish/Fish2'
import { useControls } from 'leva'
import { computeFade, classifyRegion, type CrossfadeRegion } from '../helpers/Fade'
import { RadialMarkers } from './RadialMarkers'
import { Input, Container, Text } from '@react-three/uikit'
import type { Signal } from '@preact/signals-core'

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
  markersVisibleRef?: React.MutableRefObject<boolean>;
  hasInputSignal?: Signal<boolean>;
}

export const PondSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  const waterControls = useControls('Water Material', {
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
  useMemo(() => {
    if (waterNormals) {
      waterNormals.wrapS = THREE.RepeatWrapping
      waterNormals.wrapT = THREE.RepeatWrapping
      waterNormals.anisotropy = 4
      waterNormals.needsUpdate = true
    }
  }, [waterNormals])

  useEffect(() => {
    if (waterNormals) {
      waterNormals.repeat.set(waterControls.normalTiling, waterControls.normalTiling)
    }
  }, [waterNormals, waterControls.normalTiling])

  useFrame((_, delta) => {
    if (waterNormals) {
      waterNormals.offset.x += delta * waterControls.flowU
      waterNormals.offset.y += delta * waterControls.flowV
    }
  })

  const waterMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null)
  const starfieldRef = useRef<StarfieldHandle>(null)
  const shaderUniformsRef = useRef<any>(null)
  const { controls } = useThree()
  const fishWorldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

  // UIKit input state
  const [inputText, setInputText] = useState('')

  // Update signal when input changes
  useEffect(() => {
    if (props.hasInputSignal) {
      const hasInput = inputText.trim().length > 0
      props.hasInputSignal.value = hasInput
    }
  }, [inputText, props.hasInputSignal])

  // Setup vertex displacement shader (once)
  useEffect(() => {
    const material = waterMaterialRef.current
    if (!material || !waterNormals) return

    material.onBeforeCompile = (shader) => {
      // Add custom uniform for displacement strength
      shader.uniforms.uDisplacementStrength = { value: waterControls.displacementStrength }

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
  }, [waterNormals])

  // Crossfade thresholds
  const start = 1.4
  const end = 1.5
  const hysteresis = 0.02

  // Region flag ref for optional UI use
  const regionRef = useRef<CrossfadeRegion>('outside')

  // Throttle to ~60fps
  const lastTsRef = useRef(0)

  useFrame(() => {
    const now = performance.now()
    if (now - lastTsRef.current < 1000 / 60) return
    lastTsRef.current = now

    const cameraControls = controls as unknown as { distance?: number } | null
    const d = cameraControls?.distance ?? 0
    const fade = computeFade(d, { start, end })
    regionRef.current = classifyRegion(d, { start, end, hysteresis })

    // Stars use fade directly
    if (starfieldRef.current) {
      starfieldRef.current.setOpacity(fade)
    }

    // Water uses inverse
    if (waterMaterialRef.current) {
      waterMaterialRef.current.opacity = 1 - fade
    }

    // Update displacement strength uniform
    if (shaderUniformsRef.current?.uDisplacementStrength) {
      shaderUniformsRef.current.uDisplacementStrength.value = waterControls.displacementStrength
    }
  })

  return (
    <group  {...props} ref={ref}>
      {/* Background elements - render first */}
      <group renderOrder={-3}>
        <SphericalSky
          radius={1.01}
          displayRadius={1000}
          segments={48}
          lowQuality={true}
          opacity={1.05}
        />
      </group>

      <group position={[0, 0, 0]} scale={1.1} renderOrder={1}>
        <Starfield
          ref={starfieldRef}
          radius={1.00}
          count={80}
          minStarSize={1.2}
          twinkleSpeed={1.3}
          twinkleAmount={0.3}
          bloomSize={0.3}
          bloomStrength={0.1}
          distanceFalloff={1.8}
          coreBrightness={1.0}
          fishPositionRef={fishWorldPositionRef}
        />
      </group>

      {/* Fish inside sphere - render before water */}
      <group name="innio-container" scale={0.15} renderOrder={-1}>
        <Fish2 onHeadPositionUpdate={(worldPos) => { fishWorldPositionRef.current.copy(worldPos) }} />
      </group>

      {/* Radial markers */}
      <RadialMarkers count={12} radius={1.5} isVisibleRef={props.markersVisibleRef} />

      {/* UIKit 3D Input at sphere center */}
      <group renderOrder={2}>
        <Input
          value={inputText}
          onValueChange={setInputText}
          placeholder="what is your intention?"
          width={200}
          sizeX={20}
          sizeY={2}
          fontSize={12}
          fontWeight="bold"
          opacity={0.4}
          letterSpacing={-0.01}
          borderRadius={12}
          padding={12}
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          textAlign="center"
          zIndex={1000}
        />
      </group>

      {/* Water sphere using icosahedron - render last for proper transparency */}
      <Icosahedron castShadow args={[1.01, 18]} renderOrder={0} raycast={() => null}>
        <meshPhysicalMaterial
          ref={(mat) => { waterMaterialRef.current = mat as unknown as THREE.MeshPhysicalMaterial }}
          transmission={waterControls.transmission}
          roughness={waterControls.roughness}
          ior={waterControls.ior}
          thickness={waterControls.thickness}
          attenuationColor={waterControls.attenuationColor as unknown as THREE.ColorRepresentation}
          attenuationDistance={waterControls.attenuationDistance}
          specularIntensity={waterControls.specularIntensity}
          metalness={0}
          clearcoat={0.0}
          normalMap={waterNormals as unknown as THREE.Texture}
          normalScale={new THREE.Vector2(waterControls.normalScale, waterControls.normalScale)}
          transparent
          opacity={1.0}
          depthWrite={false}
        />
      </Icosahedron>

    </group>
  )
})

export default PondSphere






