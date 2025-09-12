import * as THREE from 'three'
import React, { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Icosahedron, Center, useTexture } from '@react-three/drei'
import SphericalSky from './SphericalSky'
import Starfield, { type StarfieldHandle } from './Starfield'
import Fish2 from '../fish/Fish2'
import { useControls } from 'leva'
import { computeFade, classifyRegion, type CrossfadeRegion } from '../helpers/Fade'

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
}

export const PondSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  const waterControls = useControls('Water Material', {
    roughness: { value: 0.00, min: 0, max: 1, step: 0.005 },
    ior: { value: 1.76, min: 1, max: 2.333, step: 0.001 },
    transmission: { value: 1.00, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.05, min: 0, max: 2, step: 0.01 },
    attenuationDistance: { value: 0.8, min: 0.1, max: 10, step: 0.1 },
    attenuationColor: '#ffffff',
    specularIntensity: { value: 0.92, min: 0, max: 1, step: 0.01 },
    normalScale: { value: 0.44, min: 0, max: 2, step: 0.01 },
    normalTiling: { value: 0.3, min: 0.1, max: 10, step: 0.1 },
    flowU: { value: 0.00, min: -0.3, max: 0.3, step: 0.001 },
    flowV: { value: -0.01, min: -0.3, max: 0.3, step: 0.001 }
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
  const { controls } = useThree()

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
          count={50}
          minStarSize={1.2}

          twinkleSpeed={1.3}
          twinkleAmount={0.3}

          bloomSize={0.3}
          bloomStrength={0.1}
          distanceFalloff={1.8}
          coreBrightness={1.0}
        />
      </group>

      {/* Fish inside sphere - render before water */}
      <group name="innio-container" scale={0.15} renderOrder={-1}>
        <Fish2 />
      </group>

      {/* Water sphere using icosahedron - render last for proper transparency */}
      <Icosahedron castShadow args={[1.01, 18]} renderOrder={0}>
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


