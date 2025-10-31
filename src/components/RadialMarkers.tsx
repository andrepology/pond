import * as THREE from 'three'
import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

interface RadialMarkersProps {
  count?: number
  radius?: number
  isVisibleRef?: React.MutableRefObject<boolean>
  animationDuration?: number
  staggerDelay?: number
}

type AnimationState = 'idle' | 'animating'

// Constants
const ROTATION_DAMPING = 0.99
const NOISE_SPEED = 0.3
const NOISE_SCALE = 0.2

// Helper functions
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function calculateProgress(
  elapsed: number,
  startTime: number,
  duration: number,
  isEntering: boolean
): number {
  const animTime = elapsed - startTime
  
  if (animTime < 0) return isEntering ? 0 : 1
  if (animTime >= duration) return isEntering ? 1 : 0
  
  const linearProgress = animTime / duration
  return isEntering ? linearProgress : 1 - linearProgress
}

// Calculate marker progress on-demand (no storage needed)
function getMarkerProgress(
  i: number,
  elapsed: number,
  count: number,
  staggerDelay: number,
  animationDuration: number,
  isEntering: boolean
): number {
  const startTime = isEntering ? i * staggerDelay : (count - 1 - i) * staggerDelay
  return calculateProgress(elapsed, startTime, animationDuration, isEntering)
}

// Calculate elapsed time from progress (for interrupts)
function calculateElapsedFromProgress(
  progress: number,
  markerIndex: number,
  count: number,
  staggerDelay: number,
  animationDuration: number,
  isEntering: boolean
): number {
  const startTime = isEntering ? markerIndex * staggerDelay : (count - 1 - markerIndex) * staggerDelay
  return startTime + progress * animationDuration
}

export function RadialMarkers({ 
  count = 12, 
  radius = 1.3,
  isVisibleRef,
  animationDuration = 0.6,
  staggerDelay = 0.08
}: RadialMarkersProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const currentQuaternion = useRef(new THREE.Quaternion())
  const targetQuaternion = useRef(new THREE.Quaternion())
  const targetMatrix = useRef(new THREE.Matrix4())

  // Simplified animation state
  const animationState = useRef<AnimationState>('idle')
  const targetVisible = useRef(false) // Direction: true = entering, false = exiting
  const markerPositions = useRef<THREE.Vector3[]>([])
  const markerRefs = useRef<(THREE.Group | null)[]>([])
  const markerMaterials = useRef<(THREE.MeshPhysicalMaterial | null)[]>([])
  const prevIsVisible = useRef(false)

  // Debounced visibility change
  const visibilityTimeoutRef = useRef<number | null>(null)
  const pendingVisibilityRef = useRef<boolean | null>(null)

  // Create marker positions and angles in XY plane (vertical ring)
  const markers = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      return {
        position: new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ),
        angle
      }
    })
  }, [count, radius])

  // Reusable vectors to avoid allocations
  const centerPos = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  // Initialize marker positions and refs
  useEffect(() => {
    markerPositions.current = markers.map(m => m.position.clone())
    markerRefs.current = new Array(count).fill(null)
    markerMaterials.current = new Array(count).fill(null)

    // Initialize markers to center position and invisible state
    markerRefs.current.forEach((ref) => {
      if (ref) {
        ref.position.set(0, 0, 0)
        ref.visible = false
      }
    })
    markerMaterials.current.forEach((material) => {
      if (material) {
        material.opacity = 1
        material.transmission = 1
        material.depthWrite = false // Start with depth writing disabled
        material.depthTest = false // Start with depth testing disabled
      }
    })
  }, [count, markers])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (visibilityTimeoutRef.current !== null) {
        clearTimeout(visibilityTimeoutRef.current)
      }
    }
  }, [])

  // No useEffect needed - we read the ref directly in useFrame

  const noiseTimeRef = useRef(0)
  const animationElapsedRef = useRef(0)
  
  // Reusable vectors to avoid allocations
  const tempPos = useMemo(() => new THREE.Vector3(), [])
  const groupWorldPos = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])

  // Handle visibility changes (runs in animation loop)
  function handleVisibilityChange(isVisible: boolean) {
    const wasAnimating = animationState.current === 'animating'
    const wasEntering = targetVisible.current === true
    
    if (!wasAnimating) {
      // Start fresh animation
      animationState.current = 'animating'
      animationElapsedRef.current = 0
      targetVisible.current = isVisible
    } else if (wasEntering !== isVisible) {
      // Reverse mid-animation: calculate current progress from elapsed time
      // Find the most advanced marker to determine current progress
      const isEntering = wasEntering
      let maxProgress = 0
      let maxMarkerIndex = 0
      
      for (let i = 0; i < count; i++) {
        const progress = getMarkerProgress(
          i,
          animationElapsedRef.current,
          count,
          staggerDelay,
          animationDuration,
          isEntering
        )
        if (progress > maxProgress) {
          maxProgress = progress
          maxMarkerIndex = i
        }
      }
      
      // Reverse direction
      targetVisible.current = isVisible
      const nowEntering = isVisible
      
      // Adjust elapsed time to match current progress in reverse direction
      if (nowEntering) {
        // Was exiting, now entering: use progress as-is
        animationElapsedRef.current = calculateElapsedFromProgress(
          maxProgress,
          maxMarkerIndex,
          count,
          staggerDelay,
          animationDuration,
          true
        )
      } else {
        // Was entering, now exiting: use remaining progress (1 - maxProgress)
        const reverseIndex = count - 1 - maxMarkerIndex
        animationElapsedRef.current = calculateElapsedFromProgress(
          1 - maxProgress,
          reverseIndex,
          count,
          staggerDelay,
          animationDuration,
          false
        )
      }
    }
  }

  // Update marker animations
  function updateAnimations(delta: number) {
    animationElapsedRef.current += delta
    const isEntering = targetVisible.current
    const maxElapsed = (count - 1) * staggerDelay + animationDuration
    
    if (animationElapsedRef.current >= maxElapsed) {
      // Animation complete: set final values and return to idle
      animationState.current = 'idle'
      animationElapsedRef.current = 0
      
      markerRefs.current.forEach((ref, i) => {
        const material = markerMaterials.current[i]
        const targetPos = markerPositions.current[i]
        
        if (isEntering) {
          // Final visible state
          if (ref && targetPos) {
            ref.position.copy(targetPos)
            ref.visible = true
          }
          if (material) {
            material.opacity = 1
            material.depthWrite = true
            material.depthTest = true
          }
        } else {
          // Final hidden state
          if (ref) {
            ref.position.copy(centerPos)
            ref.visible = false
          }
          if (material) {
            material.opacity = 0
            material.transmission = 0
            material.depthWrite = false
            material.depthTest = false
          }
        }
      })
      return
    }

      // Update each marker (calculate progress on-demand, no storage)
    markerRefs.current.forEach((markerRef, i) => {
      const material = markerMaterials.current[i]
      const targetPos = markerPositions.current[i]
      if (!markerRef || !targetPos) return

      const progress = getMarkerProgress(
        i,
        animationElapsedRef.current,
        count,
        staggerDelay,
        animationDuration,
        isEntering
      )
      const easedProgress = easeOut(progress)

      // Interpolate position
      tempPos.copy(centerPos).lerp(targetPos, easedProgress)
      markerRef.position.copy(tempPos)

      // Update visibility, opacity and transmission
      // Use visible=false when completely invisible, opacity/transmission when fading
      const opacityProgress = Math.max(0, (easedProgress - 0.8) / 0.2)
      const isCompletelyInvisible = opacityProgress === 0

      if (material) {
        if (isCompletelyInvisible) {
          // Completely invisible - set visible=false and disable depth testing/writing
          markerRef.visible = false
          material.depthWrite = false
          material.depthTest = false
        } else {
          // Fading in/out - use opacity and enable depth testing/writing
          markerRef.visible = true
          material.opacity = opacityProgress
          material.transmission = opacityProgress
          material.depthWrite = true
          material.depthTest = true
        }
      }
    })
  }

  // Update camera-facing rotation
  function updateCameraRotation(delta: number) {
    if (!groupRef.current) return

    noiseTimeRef.current += delta * NOISE_SPEED
    groupRef.current.getWorldPosition(groupWorldPos)

    direction.subVectors(camera.position, groupWorldPos).normalize()
    direction.x += Math.sin(noiseTimeRef.current * 0.9) * NOISE_SCALE
    direction.y += Math.cos(noiseTimeRef.current * 0.7) * NOISE_SCALE
    direction.normalize()

    targetMatrix.current.lookAt(direction, centerPos, new THREE.Vector3(0, 1, 0))
    targetQuaternion.current.setFromRotationMatrix(targetMatrix.current)
    currentQuaternion.current.slerp(targetQuaternion.current, 1 - ROTATION_DAMPING)
    groupRef.current.quaternion.copy(currentQuaternion.current)
  }

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Read visibility from ref (bypasses React entirely)
    const isVisible = isVisibleRef?.current ?? false

    // Handle visibility changes with debounce
    if (isVisible !== prevIsVisible.current) {
      // Clear existing timeout
      if (visibilityTimeoutRef.current !== null) {
        clearTimeout(visibilityTimeoutRef.current)
      }

      // Set pending visibility and debounce timer
      pendingVisibilityRef.current = isVisible
      visibilityTimeoutRef.current = window.setTimeout(() => {
        if (pendingVisibilityRef.current !== null) {
          handleVisibilityChange(pendingVisibilityRef.current)
          prevIsVisible.current = pendingVisibilityRef.current
          pendingVisibilityRef.current = null
        }
        visibilityTimeoutRef.current = null
      }, 800) // 800ms debounce delay
    }

    // Update animations if animating
    if (animationState.current === 'animating') {
      updateAnimations(delta)
    }

    // Update camera rotation when visible or animating
    if (animationState.current === 'animating' || targetVisible.current) {
      updateCameraRotation(delta)
    }

    // Disable raycasting when markers are completely invisible (always allow clicks through)
    const markersVisible = isVisibleRef?.current ?? false
    if (groupRef.current) {
      // groupRef.current.raycast = !markersVisible ? () => null : undefined
    }
  })

  return (
    <group ref={groupRef}>
      {markers.map(({ position, angle }, i) => (
        <group
          key={`marker-${i}`}
          ref={(el) => {
            markerRefs.current[i] = el
          }}
          rotation={[0, 0, angle + Math.PI / 2]}
        >
          <mesh>
            <capsuleGeometry args={[0.02, 0.28, 8, 16]} />
            <meshPhysicalMaterial
              ref={(mat) => {
                markerMaterials.current[i] = mat as THREE.MeshPhysicalMaterial
              }}
              transmission={1.0}
              roughness={0.0}
              ior={1.5}
              thickness={0.1}
              metalness={0}
              clearcoat={0.5}
              color="#ffffff"
              transparent
              opacity={0}
              depthTest={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
