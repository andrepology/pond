import React from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MOVEMENT_DEFAULTS } from '../config/Constants'
import { useFishMovement } from './movement/useFishMovement'
import { FishBody } from './render/FishBody'
import { usePointerGestures } from './interaction/usePointerGestures'
import { useMemo, useRef, useState } from 'react'

export interface Fish2Props {
  debug?: boolean
}

export function Fish2({ debug = false }: Fish2Props) {
  const { scene } = useThree()
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

  useFrame((_, dt) => {
    movement.step(dt)
    // Update ripples
    const now = performance.now()
    const toRemove: ActiveRipple[] = []
    activeRipples.current.forEach((r) => {
      const progress = Math.min((now - r.startTime) / r.duration, 1)
      const currentScale = RIPPLE_INITIAL_SCALE + progress * RIPPLE_EXPANSION_FACTOR
      r.mesh.scale.set(currentScale, currentScale, 1)
      ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = RIPPLE_INITIAL_OPACITY * (1 - progress)
      if (progress >= 1) toRemove.push(r)
    })
    if (toRemove.length) {
      toRemove.forEach((r) => {
        scene.remove(r.mesh)
        r.mesh.geometry.dispose()
        ;(r.mesh.material as THREE.MeshBasicMaterial).dispose()
      })
      activeRipples.current = activeRipples.current.filter((r) => !toRemove.includes(r))
    }
    // Remove food markers when fish reaches them
    if (movement.headRef.current) {
      const head = movement.headRef.current.position
      if (foodMarkersRef.current.length) {
        // Drive target to first marker if any
        movement.setFoodTarget(foodMarkersRef.current[0])
        // Remove consumed
        if (head.distanceTo(foodMarkersRef.current[0]) <= MOVEMENT_DEFAULTS.arrivalThreshold) {
          foodMarkersRef.current.shift()
          setFoodMarkers([...foodMarkersRef.current])
        }
      }
    }

  })

  // Invisible ground for feeding
  const gestures = usePointerGestures({
    isMobile: false,
    onDoubleTap: (pt) => handleFeed(pt),
    onLongPress: (pt) => handleFeed(pt),
  })

  // --- Food marker and ripple feedback ---
  const [foodMarkers, setFoodMarkers] = useState<THREE.Vector3[]>([])
  const foodMarkersRef = useRef<THREE.Vector3[]>([])
  const activeRipples = useRef<ActiveRipple[]>([])
  const RIPPLE_DURATION = 1800
  const RIPPLE_INITIAL_OPACITY = 0.05
  const RIPPLE_EXPANSION_FACTOR = 5
  const RIPPLE_INITIAL_SCALE = 0.1

  interface ActiveRipple { mesh: THREE.Mesh; startTime: number; duration: number }

  function handleFeed(pt: THREE.Vector3) {
    // Place within the pond volume along the clicked surface direction.
    // Incoming pt is on the interaction sphere surface; push slightly inward.
    const radial = pt.clone()
    const len = radial.length() || 1
    const inside = radial.multiplyScalar((INTERACTION_RADIUS - 0.05) / len)
    movement.setFoodTarget(inside)
    foodMarkersRef.current = [...foodMarkersRef.current, inside.clone()]
    setFoodMarkers(foodMarkersRef.current)
    createRipple(inside)
  }

  function createRipple(position: THREE.Vector3) {
    const geometry = new THREE.CircleGeometry(RIPPLE_INITIAL_SCALE, 32)
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: RIPPLE_INITIAL_OPACITY, side: THREE.DoubleSide })
    const rippleMesh = new THREE.Mesh(geometry, material)
    rippleMesh.position.copy(position)
    rippleMesh.position.y = GROUND_Y + 0.01
    rippleMesh.rotation.x = -Math.PI / 2
    scene.add(rippleMesh)
    activeRipples.current.push({ mesh: rippleMesh, startTime: performance.now(), duration: RIPPLE_DURATION })
  }


  return (
    <group>
      {/* Invisible interaction sphere covering the pond volume for pointer capture */}
      <mesh
        onPointerDown={gestures.onPointerDown}
        onPointerUp={gestures.onPointerUp}
        onPointerMove={gestures.onPointerMove}
        onPointerLeave={gestures.onPointerLeave}
      >
        <sphereGeometry args={[INTERACTION_RADIUS, 32, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Head sphere moved to FishBody component */}
      <FishBody spine={movement.spine} headRef={movement.headRef} headDirection={movement.headDirection} bankRadians={movement.bankRadians.current} />


      {/* Food markers */}
      {foodMarkers.map((pt, idx) => (
        <mesh key={`food-${idx}`} position={[pt.x, GROUND_Y + 0.02, pt.z]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshToonMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={3.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// Spherical stars per spec

export default Fish2


