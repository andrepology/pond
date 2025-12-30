import * as THREE from 'three'
import React, { forwardRef, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls, folder } from 'leva'
import SphericalSky from './SphericalSky'
import Starfield, { type StarfieldHandle } from './Starfield'
import Fish from './fish/Fish'
import { RadialMarkers } from './RadialMarkers'
import IntentionInput from './IntentionInput'
import MindBody from './MindBody'
import type { Signal } from '@preact/signals-core'
import { usePondCrossfade } from '../hooks/usePondCrossfade'
import { useWaterMaterial } from '../hooks/useWaterMaterial'

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
  markersVisibleRef?: React.MutableRefObject<boolean>;
  hasInputSignal?: Signal<boolean>;
}

export const PondSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  const { materialRef: waterMaterialRef, controls: waterControls, waterNormals, createRipple, setClipCenter } = useWaterMaterial()
  const { fade } = usePondCrossfade({ start: 1.4, end: 1.5 })

  const starfieldRef = useRef<StarfieldHandle>(null)
  const fishWorldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const groupRef = useRef<THREE.Group>(null)
  const clipCenterRef = useRef(new THREE.Vector3(0, 2.0, -3))

  const {
    skyTurbidityMin,
    skyTurbidityMax,
    skyRayleighMin,
    skyRayleighMax,
    skyMieCoefficientMin,
    skyMieCoefficientMax,
    skyMieDirectionalGMin,
    skyMieDirectionalGMax,
    skyOpacity,
    skyDisplayRadius,
    skyAnimate,
  } = useControls({
    Sky: folder(
      {
        skyTurbidityMin: { label: 'Turbidity Min', value: 3.0, min: 0, max: 20, step: 0.1 },
        skyTurbidityMax: { label: 'Turbidity Max', value: 9.0, min: 0, max: 30, step: 0.1 },
        skyRayleighMin: { label: 'Rayleigh Min', value: 2.07, min: 0, max: 4, step: 0.01 },
        skyRayleighMax: { label: 'Rayleigh Max', value: 5.24, min: 0, max: 6, step: 0.01 },
        skyMieCoefficientMin: { label: 'Mie Coeff Min', value: 0.02, min: 0, max: 0.5, step: 0.001 },
        skyMieCoefficientMax: { label: 'Mie Coeff Max', value: 0.10, min: 0, max: 0.5, step: 0.001 },
        skyMieDirectionalGMin: { label: 'Mie g Min', value: 0.12, min: 0, max: 1, step: 0.01 },
        skyMieDirectionalGMax: { label: 'Mie g Max', value: 0.28, min: 0, max: 1, step: 0.01 },
        skyDisplayRadius: { label: 'Display Radius', value: 1000, min: 100, max: 3000, step: 10 },
        skyOpacity: { label: 'Opacity', value: 1.00, min: 0, max: 2, step: 0.01 },
        skyAnimate: { label: 'Animate Day/Night', value: true },
      },
      { collapsed: true }
    ),
  })

  // Update starfield and water opacity based on fade
  React.useEffect(() => {
    if (starfieldRef.current) {
      starfieldRef.current.setOpacity(fade)
    }

    if (waterMaterialRef.current) {
      waterMaterialRef.current.opacity = 1 - fade
    }
  }, [fade])

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.getWorldPosition(clipCenterRef.current)
    setClipCenter(clipCenterRef.current)
  })

  

  return (
    <group  {...props} ref={(node) => {
      // Handle both the forwarded ref and our internal groupRef
      if (ref) {
        if (typeof ref === 'function') {
          ref(node)
        } else {
          ref.current = node
        }
      }
      groupRef.current = node
    }}>
      {/* Background elements - render first */}
      <group renderOrder={-3}>
        <SphericalSky
          radius={1.01}
          displayRadius={skyDisplayRadius}
          segments={48}
          lowQuality={true}
          turbidityMin={skyTurbidityMin}
          turbidityMax={skyTurbidityMax}
          rayleighMin={skyRayleighMin}
          rayleighMax={skyRayleighMax}
          mieCoefficientMin={skyMieCoefficientMin}
          mieCoefficientMax={skyMieCoefficientMax}
          mieDirectionalGMin={skyMieDirectionalGMin}
          mieDirectionalGMax={skyMieDirectionalGMax}
          initialEnableTimeAnimation={skyAnimate}
          opacity={skyOpacity}
        />
      </group>

      <group position={[0, 0, 0]} scale={1.1} renderOrder={1}>
        <Starfield
          ref={starfieldRef}
          radius={1.00}
          count={50}
          minStarSize={1.1}
          twinkleSpeed={1.3}
          twinkleAmount={0.3}
          bloomSize={0.25}
          bloomStrength={0.1}
          distanceFalloff={1.8}
          coreBrightness={1.0}
          fishPositionRef={fishWorldPositionRef}
        />
      </group>

      {/* Fish inside sphere - render before water */}
      <group name="innio-container" scale={0.30} renderOrder={-1}>
        <Fish onHeadPositionUpdate={(worldPos) => { fishWorldPositionRef.current.copy(worldPos) }} />
      </group>

      {/* MindBody inside sphere - glass material */}
      {/* <MindBody 
        isGlass 
        scale={0.08} 
        renderOrder={-1} 
      /> */}

      {/* Radial markers */}
      {/* <RadialMarkers count={12} radius={1.5} isVisibleRef={props.markersVisibleRef} /> */}

      {/* Intention Input */}
      {/* <IntentionInput hasInputSignal={props.hasInputSignal} /> */}

      {/* Water sphere - render last for proper transparency */}
      <mesh
        castShadow
        renderOrder={0}
        onClick={(event) => {
          if (waterControls.ripplesEnabled && event.point) {
            createRipple(event.point)
          }
        }}
      >
        <sphereGeometry args={[1.2, 50, 50]} />
        <meshPhysicalMaterial
          ref={(mat) => { waterMaterialRef.current = mat as unknown as THREE.MeshPhysicalMaterial }}
          transmission={waterControls.transmission}
          roughness={waterControls.roughness}
          ior={waterControls.ior}
          thickness={waterControls.thickness}
          attenuationColor={waterControls.attenuationColor as unknown as THREE.ColorRepresentation}
          attenuationDistance={waterControls.attenuationDistance}
          specularIntensity={waterControls.specularIntensity}
          metalness={waterControls.metalness}
          clearcoat={waterControls.clearcoat}
          transparent={true}
          opacity={1.0}
          depthWrite={false}
          fog={true}
          
        />
      </mesh>

    </group>
  )
})

export default PondSphere
