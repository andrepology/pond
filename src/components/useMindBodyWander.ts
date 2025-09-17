import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

interface WanderParams {
  center: THREE.Vector3
  minRadius: number
  maxRadius: number
  speed: number
  rotationSpeed: number
}

export function useMindBodyWander(params: WanderParams, groupRef: React.RefObject<THREE.Group>) {
  // Current and target positions in polar coordinates
  const currentPolar = useRef({ radius: params.minRadius, theta: 0, phi: 0 })
  const targetPolar = useRef({ radius: params.minRadius, theta: 0, phi: 0 })
  const lerpProgress = useRef(1) // 1 means we need a new target
  
  // Cached vectors for performance
  const currentPos = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const lookAtMatrix = useRef(new THREE.Matrix4())
  const targetQuaternion = useRef(new THREE.Quaternion())
  
  // Throttling
  const lastUpdate = useRef(0)
  
  // Convert polar to cartesian
  const polarToCartesian = (polar: { radius: number; theta: number; phi: number }, out: THREE.Vector3) => {
    const { radius, theta, phi } = polar
    out.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ).add(params.center)
  }
  
  // Generate new random target
  const generateTarget = () => {
    const radiusRange = params.maxRadius - params.minRadius
    targetPolar.current = {
      radius: params.minRadius + Math.random() * radiusRange,
      theta: Math.random() * Math.PI * 2,
      phi: Math.PI * 0.3 + Math.random() * Math.PI * 0.4 // Keep in upper hemisphere mostly
    }
    lerpProgress.current = 0
  }
  
  useFrame((_, delta) => {
    if (!groupRef.current) return
    
    // Throttle to ~60fps
    const now = performance.now()
    if (now - lastUpdate.current < 16.67) return
    lastUpdate.current = now
    
    // Generate new target if needed
    if (lerpProgress.current >= 1) {
      generateTarget()
    }
    
    // Smooth lerp between current and target polar coordinates
    lerpProgress.current = Math.min(1, lerpProgress.current + delta * params.speed)
    const t = lerpProgress.current * lerpProgress.current * (3 - 2 * lerpProgress.current) // Smoothstep
    
    // Interpolate polar coordinates
    const lerpedPolar = {
      radius: THREE.MathUtils.lerp(currentPolar.current.radius, targetPolar.current.radius, t),
      theta: THREE.MathUtils.lerpAngle(currentPolar.current.theta, targetPolar.current.theta, t),
      phi: THREE.MathUtils.lerp(currentPolar.current.phi, targetPolar.current.phi, t)
    }
    
    // Convert to world position
    polarToCartesian(currentPolar.current, currentPos.current)
    polarToCartesian(lerpedPolar, targetPos.current)
    
    // Calculate movement direction for rotation
    direction.current.subVectors(targetPos.current, currentPos.current).normalize()
    
    // Update position
    groupRef.current.position.copy(targetPos.current)
    
    // Smooth rotation to face movement direction
    if (direction.current.lengthSq() > 0.001) {
      lookAtMatrix.current.lookAt(
        targetPos.current,
        targetPos.current.clone().add(direction.current),
        new THREE.Vector3(0, 1, 0)
      )
      targetQuaternion.current.setFromRotationMatrix(lookAtMatrix.current)
      groupRef.current.quaternion.slerp(targetQuaternion.current, delta * params.rotationSpeed)
    }
    
    // Update current polar for next frame
    currentPolar.current = { ...lerpedPolar }
  })
  
  // Initialize with random position
  if (lerpProgress.current >= 1) {
    generateTarget()
    currentPolar.current = { ...targetPolar.current }
  }
}
