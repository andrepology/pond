import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createVectorPool } from '../core/VectorPool'
import { clampSpeed, applyDrag } from '../core/Integrator'
import { createSpine, updateSpineFollow } from '../core/Spine'
import { PHYSICS, SPINE } from '../../config/Constants'

export interface MovementParams {
  maxSpeed: number
  maxSteer: number
  slowingRadius: number
  visionDistance: number
  forwardDistance: number
  wanderRadius: number
  updateInterval: number
  arrivalThreshold: number
  bounds: { min: number; max: number; buffer: number }
}

export interface MovementOutputs {
  headRef: React.MutableRefObject<THREE.Mesh | null>
  spine: ReturnType<typeof createSpine>
  headDirection: React.MutableRefObject<THREE.Vector3>
  velocity: React.MutableRefObject<THREE.Vector3>
  step: (delta: number) => void
  bankRadians: React.MutableRefObject<number>
  setFoodTarget: (p: THREE.Vector3) => void
}

export function useFishMovement(params: MovementParams): MovementOutputs {
  const headRef = useRef<THREE.Mesh>(null)
  const velocity = useRef(new THREE.Vector3())
  const headDirection = useRef(new THREE.Vector3(0, 0, 1))
  const bankRadians = useRef(0)
  const spine = useMemo(() => createSpine(SPINE.segments, SPINE.segmentSpacing), [])
  const vectorPool = useMemo(() => createVectorPool(64, 256), [])
  const wanderTarget = useRef(new THREE.Vector3())
  const nextWanderTarget = useRef(new THREE.Vector3())
  const targetLerp = useRef(0)
  const lastWanderUpdate = useRef(0)
  const lastDir = useRef(new THREE.Vector3(0, 0, 1))
  const swimPhase = useRef<'burst' | 'glide'>('glide')
  const swimTimer = useRef(0)
  const swimDuration = useRef(1)
  const foodTarget = useRef<THREE.Vector3 | null>(null)

  // Minimal per-frame API; caller wires into useFrame externally
  useEffect(() => {
    // cleanup vector pool temps if needed
    return () => {
      // nothing persistent to clean up here
    }
  }, [])

  // Helper to advance one frame; caller should call this in useFrame
  const step = (delta: number) => {
    if (!headRef.current) return

    const pos = headRef.current.position

    // Initialize slight motion if fully stopped
    if (velocity.current.lengthSq() < 1e-6) {
      velocity.current.set(0, 0, params.maxSpeed * 0.5)
    }

    // Determine forward vector
    const forward = velocity.current.lengthSq() > 1e-6 ? velocity.current.clone().normalize() : new THREE.Vector3(0, 0, 1)

    // Vision check for boundary awareness
    const visionPoint = pos.clone().addScaledVector(forward, params.visionDistance)
    const isVisionOut = (
      visionPoint.x < params.bounds.min + params.bounds.buffer ||
      visionPoint.x > params.bounds.max - params.bounds.buffer ||
      visionPoint.y < params.bounds.min + params.bounds.buffer ||
      visionPoint.y > params.bounds.max - params.bounds.buffer ||
      visionPoint.z < params.bounds.min + params.bounds.buffer ||
      visionPoint.z > params.bounds.max - params.bounds.buffer
    )

    // Update wander target if needed
    const timeNow = performance.now() / 1000
    const needNewTarget = (
      timeNow - lastWanderUpdate.current > params.updateInterval ||
      pos.distanceTo(wanderTarget.current) < params.arrivalThreshold ||
      isVisionOut
    ) && nextWanderTarget.current.lengthSq() === 0

    if (needNewTarget) {
      const base = pos.clone()
      if (isVisionOut) {
        const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), pos).normalize()
        base.addScaledVector(toCenter, params.forwardDistance)
      } else {
        base.addScaledVector(forward, params.forwardDistance)
      }
      // Random 3D offset on sphere
      const phi = Math.random() * Math.PI * 2
      const theta = Math.acos(2 * Math.random() - 1)
      const r = params.wanderRadius
      const offset = new THREE.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta)
      )
      const newTarget = base.add(offset)
      newTarget.x = THREE.MathUtils.clamp(newTarget.x, params.bounds.min, params.bounds.max)
      newTarget.y = THREE.MathUtils.clamp(newTarget.y, params.bounds.min, params.bounds.max)
      newTarget.z = THREE.MathUtils.clamp(newTarget.z, params.bounds.min, params.bounds.max)
      if (wanderTarget.current.lengthSq() === 0) {
        wanderTarget.current.copy(newTarget)
      } else {
        nextWanderTarget.current.copy(newTarget)
        targetLerp.current = 0
      }
      lastWanderUpdate.current = timeNow
    }

    // Determine active target (food overrides wander)
    // Interpolate between wander targets when no food target
    const currentTarget = new THREE.Vector3()
    if (foodTarget.current) {
      currentTarget.copy(foodTarget.current)
    } else {
      if (nextWanderTarget.current.lengthSq() === 0) {
        currentTarget.copy(wanderTarget.current)
      } else {
        targetLerp.current = Math.min(1, targetLerp.current + (delta / params.updateInterval) * 0.75)
        const tSmooth = targetLerp.current * targetLerp.current * (3 - 2 * targetLerp.current)
        currentTarget.lerpVectors(wanderTarget.current, nextWanderTarget.current, tSmooth)
        if (targetLerp.current >= 1) {
          wanderTarget.current.copy(nextWanderTarget.current)
          nextWanderTarget.current.set(0, 0, 0)
          targetLerp.current = 0
        }
      }
    }

    // Swim cycle (burst/glide)
    swimTimer.current += delta
    if (swimTimer.current >= swimDuration.current) {
      swimTimer.current = 0
      if (swimPhase.current === 'glide') {
        swimPhase.current = 'burst'
        swimDuration.current = THREE.MathUtils.lerp(0.3, 0.5, Math.random())
      } else {
        swimPhase.current = 'glide'
        swimDuration.current = THREE.MathUtils.lerp(0.5, 1.5, Math.random())
      }
    }
    const speedScale = swimPhase.current === 'burst' ? THREE.MathUtils.lerp(1.0, 1.2, Math.random() * 0.2) : THREE.MathUtils.lerp(0.6, 0.9, Math.random() * 0.2)

    // Steering toward target with arrive behavior
    const desired = currentTarget.clone().sub(pos)
    const dist = desired.length()
    if (dist > 1e-4) desired.divideScalar(dist)
    const targetSpeed = dist < params.slowingRadius ? params.maxSpeed * (dist / params.slowingRadius) : params.maxSpeed
    desired.multiplyScalar(targetSpeed * speedScale)

    const steer = desired.clone().sub(velocity.current)
    const steerLen = steer.length()
    if (steerLen > params.maxSteer) steer.multiplyScalar(params.maxSteer / (steerLen || 1))
    velocity.current.add(steer)

    // Drag + clamp
    applyDrag(velocity.current, delta, PHYSICS)
    clampSpeed(velocity.current, params.maxSpeed * 0.3, params.maxSpeed)

    // Integrate position
    headRef.current.position.add(velocity.current)
    // Bounds clamp
    const p = headRef.current.position
    p.x = THREE.MathUtils.clamp(p.x, params.bounds.min, params.bounds.max)
    p.y = THREE.MathUtils.clamp(p.y, params.bounds.min, params.bounds.max)
    p.z = THREE.MathUtils.clamp(p.z, params.bounds.min, params.bounds.max)
    // Direction smoothing
    const prevDir = lastDir.current.clone()
    if (velocity.current.lengthSq() > 1e-6) headDirection.current.lerp(velocity.current.clone().normalize(), 0.5)
    lastDir.current.copy(headDirection.current)

    // Bank based on turn rate (lateral change)
    const turnAxis = new THREE.Vector3().crossVectors(prevDir, headDirection.current)
    const turnMag = THREE.MathUtils.clamp(turnAxis.length(), 0, 1)
    const bank = THREE.MathUtils.lerp(bankRadians.current, -Math.sign(turnAxis.y) * turnMag * 0.35, 0.2)
    bankRadians.current = bank

    // Spine update with simple wave offset
    const t = performance.now() / 1000
    const wave = (i: number) => Math.sin(t * 3 + i * 0.5) * 0.05 * THREE.MathUtils.clamp(velocity.current.length() * 20, 0.2, 1)
    updateSpineFollow(spine, headRef.current.position, headDirection.current, wave)

    // Arrival check: clear food target when arrived
    if (foodTarget.current) {
      if (pos.distanceTo(foodTarget.current) <= params.arrivalThreshold) {
        foodTarget.current = null
      }
    }
  }

  const setFoodTarget = (p: THREE.Vector3) => {
    const clamped = new THREE.Vector3(
      THREE.MathUtils.clamp(p.x, params.bounds.min, params.bounds.max),
      THREE.MathUtils.clamp(p.y, params.bounds.min, params.bounds.max),
      THREE.MathUtils.clamp(p.z, params.bounds.min, params.bounds.max)
    )
    foodTarget.current = clamped
  }

  return { headRef, spine, headDirection, velocity, step, bankRadians, setFoodTarget }
}


