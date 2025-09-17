import React from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MOVEMENT_DEFAULTS } from './config/Constants'
import { useFishMovement } from './movement/useFishMovement'
import { FishBody } from './render/FishBody'
import { usePointerGestures } from './interaction/usePointerGestures'
import { useMemo, useRef, useState } from 'react'

export interface Fish2Props {
  debug?: boolean
}

export function Fish2({ debug = false }: Fish2Props) {
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
  const activeMarkerIndex = useRef<number | null>(null)
  const feedingPhase = useRef<'idle' | 'approach'>('idle')
  const BITE_THRESHOLD = 0.06

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
    // Feeding control: steer toward active target and consume by mouth-distance
    if (movement.headRef.current) {
      const head = movement.headRef.current.position
      if (feedingPhase.current === 'approach') {
        const idx = activeMarkerIndex.current ?? 0
        const target = foodMarkersRef.current[idx]
        if (target) {
          movement.setFoodTarget(target)
          const dist = head.distanceTo(target)
          if (dist <= BITE_THRESHOLD) {
            // Remove consumed and advance
            foodMarkersRef.current.splice(idx, 1)
            setFoodMarkers([...foodMarkersRef.current])
            if (foodMarkersRef.current.length > 0) {
              activeMarkerIndex.current = Math.min(idx, foodMarkersRef.current.length - 1)
            } else {
              activeMarkerIndex.current = null
              feedingPhase.current = 'idle'
            }
          }
        } else {
          // Safety reset
          activeMarkerIndex.current = null
          feedingPhase.current = 'idle'
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

  function handleFeed(ptWorld: THREE.Vector3) {
    const local = rootRef.current ? rootRef.current.worldToLocal(ptWorld.clone()) : ptWorld.clone()
    movement.setFoodTarget(local)
    foodMarkersRef.current = [...foodMarkersRef.current, local.clone()]
    setFoodMarkers(foodMarkersRef.current)
    // Initialize feeding state if idle
    if (feedingPhase.current === 'idle') {
      activeMarkerIndex.current = foodMarkersRef.current.length - 1
      feedingPhase.current = 'approach'
    }
    createRipple(local)
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

      {/* Head sphere moved to FishBody component */}
      <FishBody spine={movement.spine} headRef={movement.headRef} headDirection={movement.headDirection} bankRadians={movement.bankRadians.current} />


      {/* Food markers */}
      {foodMarkers.map((pt, idx) => (
        <mesh key={`food-${idx}`} position={[pt.x, pt.y, pt.z]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshToonMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={3.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// Spherical stars per spec

export default Fish2


