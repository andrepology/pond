import React from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MOVEMENT_DEFAULTS } from './config/Constants'
import { useFishMovement } from './movement/useFishMovement'
import { FishBody } from './render/FishBody'
import { usePointerGestures } from './interaction/usePointerGestures'
import { useFoodSystem } from '../../fish/hooks/useFoodSystem'
import { FoodVisuals } from '../../fish/components/FoodVisuals'
import { FishDebugVisuals } from './components/FishDebugVisuals'
import { useMemo, useRef, useState } from 'react'
import { useControls, folder } from 'leva'


export interface FishProps {
  debug?: boolean
  onHeadPositionUpdate?: (worldPos: THREE.Vector3) => void
}

export function Fish({ debug = false, onHeadPositionUpdate }: FishProps) {
  const { scene, camera } = useThree()
  const rootRef = useRef<THREE.Group>(null)
  const GROUND_Y = 0
  // Interaction sphere radius should match movement bounds
  const INTERACTION_RADIUS = 6

  // Spine undulation controls
  const undulationControls = useControls('Fish Undulation', {
    wave: folder({
      headAmplitude: { value: 0.02, min: 0.01, max: 0.2, step: 0.01, label: 'Head Amplitude' },
      tailAmplitude: { value: 0.03, min: 0.00, max: 0.2, step: 0.01, label: 'Tail Amplitude' },
      bodyWavelength: { value: 1.15, min: 0.3, max: 2.0, step: 0.05, label: 'Body Wavelength' },
      propulsionRatio: { value: 1.45, min: 0.8, max: 1.5, step: 0.05, label: 'Propulsion Ratio' },
      idleFrequency: { value: 1.0, min: 0.0, max: 3.0, step: 0.1, label: 'Idle Frequency' },
    }),
    spine: folder({
      responsiveness: { value: 0.06, min: 0.05, max: 0.5, step: 0.01, label: 'Responsiveness' },
      stiffness: { value: 2.4, min: 0.5, max: 4.0, step: 0.1, label: 'Stiffness' },
    }),
  }, { collapsed: true })
  const movement = useFishMovement({
    maxSpeed: MOVEMENT_DEFAULTS.maxSpeed,
    maxSteer: MOVEMENT_DEFAULTS.maxSteer,
    slowingRadius: MOVEMENT_DEFAULTS.slowingRadius,
    visionDistance: MOVEMENT_DEFAULTS.visionDistance,
    forwardDistance: MOVEMENT_DEFAULTS.forwardDistance,
    wanderRadius: MOVEMENT_DEFAULTS.wanderRadius,
    updateInterval: MOVEMENT_DEFAULTS.updateInterval,
    arrivalThreshold: MOVEMENT_DEFAULTS.arrivalThreshold,
    // Bound fish within PondSphere via innio-container scale (0.30). World radius 1.2 → local bounds = 1.2 / 0.30 = 4.0.
    // Use 3.8 to keep body safely inside.
    bounds: { min: -3.8, max: 3.8, buffer: 0.5 },
    undulation: {
      headAmplitude: undulationControls.headAmplitude,
      tailAmplitude: undulationControls.tailAmplitude,
      bodyWavelength: undulationControls.bodyWavelength,
      propulsionRatio: undulationControls.propulsionRatio,
      idleFrequency: undulationControls.idleFrequency,
      spineResponsiveness: undulationControls.responsiveness,
      spineStiffness: undulationControls.stiffness,
    },
  })

  const planeRef = useRef<THREE.Mesh>(null)
  const activeMarkerIndex = useRef<number | null>(null)
  const feedingPhase = useRef<'idle' | 'approach'>('idle')
  const BITE_THRESHOLD = 0.06

  // Food system manages markers and ripples
  const { foodMarkers, ripples, handleFeed } = useFoodSystem(rootRef, movement)

  useFrame((_, dt) => {
    // Face the invisible plane toward the camera and keep it through the sphere center
    if (planeRef.current) {
      const camDir = new THREE.Vector3()
      camera.getWorldDirection(camDir)
      camDir.normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), camDir)
      planeRef.current.setRotationFromQuaternion(q)
      planeRef.current.position.set(0, 0, 0)
    }
    movement.step(dt)

    // Report head world position for star repulsion
    if (onHeadPositionUpdate && rootRef.current) {
      const worldPos = new THREE.Vector3()
      movement.headRef.current.getWorldPosition(worldPos)
      onHeadPositionUpdate(worldPos)
    }
  })

  // Invisible ground for feeding
  const gestures = usePointerGestures({
    isMobile: false,
    onDoubleTap: (pt) => handleFeed(pt),
    onLongPress: (pt) => handleFeed(pt),
  })
  return (
    <group ref={rootRef}>
      {/* Invisible interaction plane through the center, always facing the camera */}
      <mesh
        ref={planeRef}
        onPointerDown={gestures.onPointerDown}
        onPointerUp={gestures.onPointerUp}
        onPointerMove={gestures.onPointerMove}
        onPointerLeave={gestures.onPointerLeave}
      >
        <planeGeometry args={[INTERACTION_RADIUS * 2 + 2, INTERACTION_RADIUS * 2 + 2, 1, 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Fish body */}
      <FishBody spine={movement.spine} headRef={movement.headRef} headDirection={movement.headDirection} velocity={movement.velocity} bankRadians={movement.bankRadians.current} />

      {/* Food system visuals */}
      <FoodVisuals foodMarkers={foodMarkers} ripples={ripples} />
      
      {/* Debug Visuals */}
      {debug && <FishDebugVisuals movement={movement} bounds={{ max: 3.8 }} />}
    </group>
  )
}

// Spherical stars per spec

export default Fish


