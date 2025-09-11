import React from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MOVEMENT_DEFAULTS } from '../config/constants'
import { useFishMovement } from '../movement/useFishMovement'
import { FishBody } from '../render/FishBody'
import { usePointerGestures } from '../interaction/usePointerGestures'
import { useMemo, useRef } from 'react'

export interface Fish2Props {
  debug?: boolean
}

export function Fish2({ debug = false }: Fish2Props) {
  const { scene } = useThree()
  const GROUND_Y = 0
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
      if (foodMarkers.current.length) {
        // Drive target to first marker if any
        movement.setFoodTarget(foodMarkers.current[0])
        // Remove consumed
        if (head.distanceTo(foodMarkers.current[0]) <= MOVEMENT_DEFAULTS.arrivalThreshold) {
          foodMarkers.current.shift()
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
  const foodMarkers = useRef<THREE.Vector3[]>([])
  const activeRipples = useRef<ActiveRipple[]>([])
  const RIPPLE_DURATION = 1800
  const RIPPLE_INITIAL_OPACITY = 0.05
  const RIPPLE_EXPANSION_FACTOR = 5
  const RIPPLE_INITIAL_SCALE = 0.1

  interface ActiveRipple { mesh: THREE.Mesh; startTime: number; duration: number }

  function handleFeed(pt: THREE.Vector3) {
    const p = new THREE.Vector3(pt.x, GROUND_Y, pt.z)
    movement.setFoodTarget(p)
    foodMarkers.current.push(p.clone())
    createRipple(p)
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
      {/* Remove dependency on ground plane; capture on the group */}
      <group
        onPointerDown={gestures.onPointerDown}
        onPointerUp={gestures.onPointerUp}
        onPointerMove={gestures.onPointerMove}
        onPointerLeave={gestures.onPointerLeave}
      />

      <mesh ref={movement.headRef}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#8888ff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <FishBody spine={movement.spine} headRef={movement.headRef} headDirection={movement.headDirection} bankRadians={movement.bankRadians.current} />


      {/* Food markers */}
      {foodMarkers.current.map((pt, idx) => (
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


