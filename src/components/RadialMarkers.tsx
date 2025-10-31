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
    
    // Initialize markers to center position
    markerRefs.current.forEach((ref) => {
      if (ref) {
        ref.position.set(0, 0, 0)
      }
    })
    markerMaterials.current.forEach((material) => {
      if (material) {
        material.opacity = 0
      }
    })
  }, [count, markers])

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
          }
          if (material) {
            material.opacity = 1
          }
        } else {
          // Final hidden state
          if (ref) {
            ref.position.copy(centerPos)
          }
          if (material) {
            material.opacity = 0
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

      // Update opacity
      if (material) material.opacity = easedProgress
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
    
    // Handle visibility changes in animation loop
    if (isVisible !== prevIsVisible.current) {
      handleVisibilityChange(isVisible)
      prevIsVisible.current = isVisible
    }

    // Update animations if animating
    if (animationState.current === 'animating') {
      updateAnimations(delta)
    }

    // Update camera rotation when visible or animating
    if (animationState.current === 'animating' || targetVisible.current) {
      updateCameraRotation(delta)
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
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
