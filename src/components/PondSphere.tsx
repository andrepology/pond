import * as THREE from 'three'
import React, { forwardRef, useRef } from 'react'
import { Icosahedron } from '@react-three/drei'
import SphericalSky from './SphericalSky'
import Starfield, { type StarfieldHandle } from './Starfield'
import Fish2 from '../fish/Fish2'
import { RadialMarkers } from './RadialMarkers'
import IntentionInput from './IntentionInput'
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
  const { materialRef: waterMaterialRef, controls: waterControls, waterNormals } = useWaterMaterial()
  const { fade } = usePondCrossfade({ start: 1.4, end: 1.5 })

  const starfieldRef = useRef<StarfieldHandle>(null)
  const fishWorldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

  // Update starfield and water opacity based on fade
  React.useEffect(() => {
    if (starfieldRef.current) {
      starfieldRef.current.setOpacity(fade)
    }

    if (waterMaterialRef.current) {
      waterMaterialRef.current.opacity = 1 - fade
    }
  }, [fade])

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

      {/* Intention Input */}
      <IntentionInput hasInputSignal={props.hasInputSignal} />

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






