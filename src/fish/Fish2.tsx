import React from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MOVEMENT_DEFAULTS } from '../config/constants'
import { useFishMovement } from './movement/useFishMovement'
import { FishBody } from './render/FishBody'
import { usePointerGestures } from './interaction/usePointerGestures'
import { useFoodSystem } from './hooks/useFoodSystem'
import { FoodVisuals } from './components/FoodVisuals'
import { useMemo, useRef, useState } from 'react'


export interface Fish2Props {
  debug?: boolean
  onHeadPositionUpdate?: (worldPos: THREE.Vector3) => void
}

export function Fish2({ debug = false, onHeadPositionUpdate }: Fish2Props) {
  const { scene, camera } = useThree()
  const rootRef = useRef<THREE.Group>(null)
  const GROUND_Y = 0
  // Interaction sphere radius should match movement bounds
  const INTERACTION_RADIUS = 6
  const movement = useFishMovement({
    maxSpeed: MOVEMENT_DEFAULTS.maxSpeed,
    maxSteer: MOVEMENT_DEFAULTS.maxSteer,
    slowingRadius: MOVEMENT_DEFAULTS.slowingRadius,
    visionDistance: MOVEMENT_DEFAULTS.visionDistance,
    forwardDistance: MOVEMENT_DEFAULTS.forwardDistance,
    wanderRadius: MOVEMENT_DEFAULTS.wanderRadius,
    updateInterval: MOVEMENT_DEFAULTS.updateInterval,
    arrivalThreshold: MOVEMENT_DEFAULTS.arrivalThreshold,
    // Bound fish within PondSphere via innio-container scale (≈0.15). World radius ~1.01 → local bounds ~±6.5. Use conservative ±6.
    bounds: { min: -6, max: 6, buffer: 0.8 },
  })

  const planeRef = useRef<THREE.Mesh>(null)

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
    </group>
  )
}

// Spherical stars per spec

export default Fish2


