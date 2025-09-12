import * as THREE from 'three'
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRoute } from 'wouter'

interface AdaptiveFogProps {
  /** Default fog color */
  color?: string
  /** Fog settings when not focused (default view) */
  defaultFog?: {
    near: number
    far: number
  }
  /** Fog settings when focused on an object */
  focusedFog?: {
    near: number
    far: number
  }
  /** Animation duration in seconds */
  animationDuration?: number
}

export function AdaptiveFog({
  color = '#f0f0f0',
  defaultFog = { near: 2, far: 4 },
  focusedFog = { near: 0.5, far: 1.5 },
  animationDuration = 1.0
}: AdaptiveFogProps) {
  const { scene } = useThree()
  const [, paramsRaw] = useRoute('/item/:id')
  const params: Record<string, string> = paramsRaw || {}
  
  // Animation state
  const animationRef = useRef({
    startNear: defaultFog.near,
    startFar: defaultFog.far,
    targetNear: defaultFog.near,
    targetFar: defaultFog.far,
    progress: 1, // Start at 1 (animation complete)
  })
  
  // Fog instance
  const fogRef = useRef<THREE.Fog | null>(null)
  
  // Initialize fog
  useEffect(() => {
    if (!fogRef.current) {
      fogRef.current = new THREE.Fog(color, defaultFog.near, defaultFog.far)
      scene.fog = fogRef.current
    }
    
    return () => {
      if (scene.fog) {
        scene.fog = null
      }
    }
  }, [scene, color, defaultFog.near, defaultFog.far])
  
  // Update target values when focus state changes
  useEffect(() => {
    if (!fogRef.current) return
    
    const isFocused = !!params.id
    const animation = animationRef.current

    const newTargetNear = isFocused ? focusedFog.near : defaultFog.near
    const newTargetFar = isFocused ? focusedFog.far : defaultFog.far

    // Start animation if targets have changed
    if (newTargetNear !== animation.targetNear || newTargetFar !== animation.targetFar) {
      animation.startNear = fogRef.current.near
      animation.startFar = fogRef.current.far
      animation.targetNear = newTargetNear
      animation.targetFar = newTargetFar
      animation.progress = 0
    }
  }, [params.id, defaultFog, focusedFog])
  
  // Animate fog parameters
  useFrame((_, delta) => {
    if (!fogRef.current) return
    
    const animation = animationRef.current
    
    // Update animation progress
    if (animation.progress < 1) {
      animation.progress = Math.min(1, animation.progress + delta / animationDuration)
      
      // Smooth easing function (ease-out)
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
      const t = easeOut(animation.progress)
      
      // Interpolate fog values
      fogRef.current.near = THREE.MathUtils.lerp(
        animation.startNear,
        animation.targetNear,
        t
      )
      fogRef.current.far = THREE.MathUtils.lerp(
        animation.startFar,
        animation.targetFar,
        t
      )
    }
  })
  
  return null
} 