import { useState, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

export interface FoodMarker {
  position: THREE.Vector3
  state: 'normal' | 'vanishing' | 'gone'
  vanishStartTime?: number
  initialScale: number
}

export interface Ripple {
  mesh: THREE.Mesh
  startTime: number
  duration: number
}

interface MovementOutputs {
  setFoodTarget: (p: THREE.Vector3) => void
  headRef: React.MutableRefObject<THREE.Mesh | null>
}

export function useFoodSystem(
  rootRef: React.RefObject<THREE.Group>,
  movement: MovementOutputs
) {
  const { scene } = useThree()
  const [foodMarkers, setFoodMarkers] = useState<FoodMarker[]>([])
  const foodMarkersRef = useRef<FoodMarker[]>([])
  const activeRipples = useRef<Ripple[]>([])

  const FOOD_VANISH_DURATION = 800 // ms for vanish animation
  const RIPPLE_DURATION = 600 // Very fast
  const RIPPLE_INITIAL_OPACITY = 0.04
  const RIPPLE_EXPANSION_FACTOR = 0.15 // Tiny expansion
  const RIPPLE_INITIAL_SCALE = 0.008

  const handleFeed = useCallback((ptWorld: THREE.Vector3) => {
    const local = rootRef.current ? rootRef.current.worldToLocal(ptWorld.clone()) : ptWorld.clone()
    movement.setFoodTarget(local)

    const newMarker: FoodMarker = {
      position: local.clone(),
      state: 'normal',
      initialScale: 1.0
    }

    foodMarkersRef.current = [...foodMarkersRef.current, newMarker]
    setFoodMarkers(foodMarkersRef.current)

    // Convert marker position back to world space for ripple
    const worldRipplePos = rootRef.current ? rootRef.current.localToWorld(local.clone()) : local.clone()
    createRipple(worldRipplePos)
  }, [movement, rootRef])

  const createRipple = useCallback((position: THREE.Vector3) => {
    // Create expanding circular ripple using ring geometry for clean circular outline
    const geometry = new THREE.RingGeometry(
      RIPPLE_INITIAL_SCALE,
      RIPPLE_INITIAL_SCALE * 1.1,
      16 // segments for smooth circle
    )
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: RIPPLE_INITIAL_OPACITY,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
    const rippleMesh = new THREE.Mesh(geometry, material)
    rippleMesh.position.copy(position)
    rippleMesh.rotation.x = -Math.PI / 2 // Horizontal orientation
    scene.add(rippleMesh)

    activeRipples.current.push({
      mesh: rippleMesh,
      startTime: performance.now(),
      duration: RIPPLE_DURATION
    })
  }, [scene])

  useFrame(() => {
    const now = performance.now()

    // Update ripples - expand and fade quickly
    const toRemove: Ripple[] = []
    activeRipples.current.forEach((ripple) => {
      const progress = Math.min((now - ripple.startTime) / ripple.duration, 1)

      // Expand by scaling the mesh (simpler and works with RingGeometry)
      const scale = RIPPLE_INITIAL_SCALE + progress * (RIPPLE_EXPANSION_FACTOR - RIPPLE_INITIAL_SCALE)
      ripple.mesh.scale.setScalar(scale / RIPPLE_INITIAL_SCALE)

      // Fade out quickly with quadratic falloff
      const opacity = RIPPLE_INITIAL_OPACITY * (1 - progress * progress)
      ;(ripple.mesh.material as THREE.MeshBasicMaterial).opacity = opacity

      if (progress >= 1) toRemove.push(ripple)
    })

    // Clean up finished ripples
    if (toRemove.length) {
      toRemove.forEach((ripple) => {
        scene.remove(ripple.mesh)
        ripple.mesh.geometry.dispose()
        ;(ripple.mesh.material as THREE.MeshBasicMaterial).dispose()
      })
      activeRipples.current = activeRipples.current.filter((r) => !toRemove.includes(r))
    }

    // Update food markers - handle consumption and animation
    if (movement.headRef.current && foodMarkersRef.current.length) {
      const head = movement.headRef.current.position
      const firstMarker = foodMarkersRef.current[0]

      // Drive target to first marker if any (only for normal markers)
      if (firstMarker.state === 'normal') {
        movement.setFoodTarget(firstMarker.position)
      }

      // Check if fish body reaches food (use smaller threshold than head)
      const bodyReachThreshold = 0.05
      if (firstMarker.state === 'normal' && head.distanceTo(firstMarker.position) <= bodyReachThreshold) {
        // Start vanish animation instead of instant removal
        foodMarkersRef.current[0] = {
          ...firstMarker,
          state: 'vanishing',
          vanishStartTime: performance.now()
        }
        setFoodMarkers([...foodMarkersRef.current])
      }
    }

    // Update vanishing animations
    const currentTime = performance.now()
    let hasChanges = false
    foodMarkersRef.current = foodMarkersRef.current.map(marker => {
      if (marker.state === 'vanishing' && marker.vanishStartTime) {
        const elapsed = currentTime - marker.vanishStartTime
        const progress = Math.min(elapsed / FOOD_VANISH_DURATION, 1)

        if (progress >= 1) {
          // Animation complete, mark as gone
          hasChanges = true
          return { ...marker, state: 'gone' }
        }
      }
      return marker
    })

    // Remove completed animations
    const initialLength = foodMarkersRef.current.length
    foodMarkersRef.current = foodMarkersRef.current.filter(marker => marker.state !== 'gone')
    if (foodMarkersRef.current.length !== initialLength) {
      hasChanges = true
    }

    if (hasChanges) {
      setFoodMarkers([...foodMarkersRef.current])
    }
  })

  return {
    foodMarkers,
    ripples: activeRipples.current,
    handleFeed
  }
}
