import * as THREE from 'three'
import React, { forwardRef, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import SphericalSky from './SphericalSky'
import Starfield, { type StarfieldHandle } from './Starfield'
import Fish from './fish/Fish'
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
  const { materialRef: waterMaterialRef, controls: waterControls, waterNormals, createRipple } = useWaterMaterial()
  const { fade } = usePondCrossfade({ start: 1.4, end: 1.5 })

  const starfieldRef = useRef<StarfieldHandle>(null)
  const fishWorldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const groupRef = useRef<THREE.Group>(null)

  // Update starfield and water opacity based on fade
  React.useEffect(() => {
    if (starfieldRef.current) {
      starfieldRef.current.setOpacity(fade)
    }

    if (waterMaterialRef.current) {
      waterMaterialRef.current.opacity = 1 - fade
    }
  }, [fade])

  // Subtle mouse following for the entire pond group
  useFrame((state) => {
    if (!groupRef.current) return

    const { pointer } = state
    const group = groupRef.current

    // Reduce following intensity during crossfade transitions
    const followingIntensity = 1 - fade * 0.8 // Reduce following when fading

    // Responsive horizontal following
    group.position.x = THREE.MathUtils.lerp(
      group.position.x,
      pointer.x * 0.1 * followingIntensity, // Horizontal movement
      0.005
    )

    // Responsive vertical following
    group.position.y = THREE.MathUtils.lerp(
      group.position.y,
      pointer.y * 0.1 * followingIntensity, // Vertical movement
      0.005
    )
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
      <group name="innio-container" scale={0.40} renderOrder={-1}>
        <Fish onHeadPositionUpdate={(worldPos) => { fishWorldPositionRef.current.copy(worldPos) }} />
      </group>

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
        <sphereGeometry args={[1.01, 50, 50]} />
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
          normalMap={waterNormals as unknown as THREE.Texture}
          normalScale={new THREE.Vector2(waterControls.normalStrength, waterControls.normalStrength)}
          transparent={true}
          opacity={1.0}
          depthWrite={false}
        />
      </mesh>

    </group>
  )
})

export default PondSphere






