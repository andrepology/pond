import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createVectorPool } from '../core/VectorPool'
import { clampSpeed, applyDrag } from '../core/Integrator'
import { createSpine, updateSpineFollow } from '../core/Spine'
import { PHYSICS, SPINE, REST_DEFAULTS } from '../config/Constants'

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
  undulation: {
    headAmplitude: number
    tailAmplitude: number
    bodyWavelength: number
    propulsionRatio: number
    idleFrequency: number
    spineResponsiveness: number
    spineStiffness: number
  }
}

export interface MovementOutputs {
  headRef: React.MutableRefObject<THREE.Mesh | null>
  spine: ReturnType<typeof createSpine>
  headDirection: React.MutableRefObject<THREE.Vector3>
  velocity: React.MutableRefObject<THREE.Vector3>
  step: (delta: number) => void
  bankRadians: React.MutableRefObject<number>
  setFoodTarget: (p: THREE.Vector3) => void
  clearFoodTarget: () => void
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
  // Swim cycle removed for smoother movement
  const foodTarget = useRef<THREE.Vector3 | null>(null)
  const approachSwayTime = useRef(0)
  const distanceTraveled = useRef(0)
  
  // Rest state management
  const restState = useRef<'active' | 'resting'>('active')
  const restFactor = useRef(0) // 0 = fully active, 1 = fully resting
  const restTimer = useRef(0)
  const restDuration = useRef(0)
  const restCheckTimer = useRef(0)

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

    // Rest state management: probabilistic trigger every N seconds
    restCheckTimer.current += delta
    if (restState.current === 'active') {
      if (restCheckTimer.current >= REST_DEFAULTS.restCheckInterval) {
        restCheckTimer.current = 0
        // Only rest when wandering (not feeding)
        if (Math.random() < 0.3 && !foodTarget.current) {
          restState.current = 'resting'
          restTimer.current = 0
          restDuration.current = THREE.MathUtils.lerp(5.0, 10.0, Math.random())
        }
      }
    } else {
      // Resting - check if duration expired
      restTimer.current += delta
      if (restTimer.current >= restDuration.current) {
        restState.current = 'active'
        restTimer.current = 0
        restCheckTimer.current = 0
      }
    }

    // Smoothly transition restFactor based on state (frame-rate independent)
    const targetRestFactor = restState.current === 'resting' ? 1.0 : 0.0
    const restSmoothFactor = 1 - Math.exp(-1.5 * delta)
    restFactor.current = THREE.MathUtils.lerp(restFactor.current, targetRestFactor, restSmoothFactor)

    // Determine forward vector
    const forward = velocity.current.lengthSq() > 1e-6 ? velocity.current.clone().normalize() : new THREE.Vector3(0, 0, 1)

    // Vision check for boundary awareness (Spherical)
    // We check if the projected point is beyond our spherical radius
    const visionPoint = pos.clone().addScaledVector(forward, params.visionDistance)
    const visionDistSq = visionPoint.lengthSq()
    // Use squared comparison for performance. Radius is params.bounds.max (3.8). 
    // We treat 'max' as the sphere radius.
    const maxRadius = params.bounds.max
    const isVisionOut = visionDistSq > (maxRadius - params.bounds.buffer) ** 2

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
      // Cone-based wandering with rare "flips" for more natural swimming
      // 10% chance to pick a completely random direction (turn around/explore)
      // 90% chance to pick a direction roughly forward (maintain flow)
      
      let targetDir: THREE.Vector3
      
      if (Math.random() < 0.10) {
        // "Flip": Completely random direction
        const phi = Math.random() * Math.PI * 2
        const theta = Math.acos(2 * Math.random() - 1)
        targetDir = new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi),
          Math.sin(theta) * Math.sin(phi),
          Math.cos(theta)
        )
      } else {
        // "Flow": Cone-biased forward direction
        // Start with current forward direction
        const currentForward = velocity.current.lengthSq() > 1e-6 
          ? velocity.current.clone().normalize() 
          : new THREE.Vector3(0, 0, 1)
          
        // Add random jitter to create a cone
        // spread=0.5 gives roughly a 45-degree cone
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5
        )
        
        targetDir = currentForward.add(jitter).normalize()
      }

      // Pick a random distance to travel (between 50% and 90% of max radius)
      // This keeps it moving within the volume but not always hugging the center
      const r = params.bounds.max * (0.5 + Math.random() * 0.4)
      
      const newTarget = targetDir.multiplyScalar(r)
      
      // Ensure target is inside bounds (it naturally is due to r calc, but good for safety)
      if (newTarget.length() > params.bounds.max) {
        newTarget.setLength(params.bounds.max * 0.95)
      }
      
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

    // Speed calculation with rest override
    // Smooth blending between active cruising and resting drift
    const activeSpeedScale = THREE.MathUtils.lerp(0.8, 1.0, Math.random() * 0.2)
    const restSpeedScale = THREE.MathUtils.lerp(0.01, 0.03, Math.random() * 0.2)
    const speedScale = THREE.MathUtils.lerp(activeSpeedScale, restSpeedScale, restFactor.current)

    // Steering toward target with arrive behavior
    const desired = currentTarget.clone().sub(pos)
    const dist = desired.length()
    if (dist > 1e-4) desired.divideScalar(dist)
    const targetSpeed = dist < params.slowingRadius ? params.maxSpeed * (dist / params.slowingRadius) : params.maxSpeed
    desired.multiplyScalar(targetSpeed * speedScale)

    // Gentle lateral sway during approach for more lifelike motion
    if (foodTarget.current && dist > params.arrivalThreshold) {
      approachSwayTime.current += delta
      const worldUp = new THREE.Vector3(0, 1, 0)
      const forwardDir = headDirection.current.lengthSq() > 1e-6 ? headDirection.current.clone().normalize() : new THREE.Vector3(0, 0, 1)
      const lateral = new THREE.Vector3().crossVectors(worldUp, forwardDir).normalize()
      const swayAmp = THREE.MathUtils.clamp(dist / (params.slowingRadius * 2), 0.02, 0.2)
      const sway = Math.sin(approachSwayTime.current * 2.5) * swayAmp
      desired.addScaledVector(lateral, sway * targetSpeed)
    } else {
      approachSwayTime.current = 0
    }

    const steer = desired.clone().sub(velocity.current)
    const steerLen = steer.length()
    
    // Blend between sharp active turns and lazy resting turns
    const maxSteerAdjusted = THREE.MathUtils.lerp(
      params.maxSteer, 
      params.maxSteer * 0.25, 
      restFactor.current
    )
    
    if (steerLen > maxSteerAdjusted) steer.multiplyScalar(maxSteerAdjusted / (steerLen || 1))
    velocity.current.add(steer)

    // Turning Drag: Bleed speed when turning sharply
    // The sharper the turn (higher steerLen), the more speed we lose.
    // Factor 0.02 is a tunable constant for how much energy turning consumes.
    if (steerLen > 0.1) {
      const turningFactor = Math.min(steerLen, 1.0)
      velocity.current.multiplyScalar(1.0 - turningFactor * 0.02)
    }

    // Drag + clamp
    applyDrag(velocity.current, delta, PHYSICS)
    
    // Clamp speed: allow very slow drift during rest
    // Smoothly lower the floor so we don't snap to stop or snap to start
    const minSpeed = THREE.MathUtils.lerp(params.maxSpeed * 0.3, 0.0, restFactor.current)
    clampSpeed(velocity.current, minSpeed, params.maxSpeed)

    // Integrate position (delta-scaled for framerate independence)
    headRef.current.position.addScaledVector(velocity.current, delta)
    
    // Spherical Bounds clamp
    const currentDist = headRef.current.position.length()
    if (currentDist > params.bounds.max) {
      headRef.current.position.setLength(params.bounds.max)
      // Optional: Reflect velocity to bounce off glass? 
      // For now, just slide along it by removing the outward component
      const normal = headRef.current.position.clone().normalize()
      const outward = velocity.current.dot(normal)
      if (outward > 0) {
        velocity.current.addScaledVector(normal, -outward)
      }
    }
    // Direction smoothing (frame-rate independent)
    // 0.15 at 60fps → speed ≈ 9.7
    const dirSmoothFactor = 1 - Math.exp(-9.7 * delta)
    const prevDir = lastDir.current.clone()
    // Only update direction if velocity is significant (prevents noise amplification)
    const directionThreshold = 0.01
    if (velocity.current.lengthSq() > directionThreshold * directionThreshold) {
      headDirection.current.lerp(velocity.current.clone().normalize(), dirSmoothFactor)
    }
    lastDir.current.copy(headDirection.current)

    // Bank based on turn rate (lateral change, frame-rate independent)
    // 0.2 at 60fps → speed ≈ 13.4
    const bankSmoothFactor = 1 - Math.exp(-13.4 * delta)
    const turnAxis = new THREE.Vector3().crossVectors(prevDir, headDirection.current)
    const turnMag = THREE.MathUtils.clamp(turnAxis.length(), 0, 1)
    const bank = THREE.MathUtils.lerp(bankRadians.current, -Math.sign(turnAxis.y) * turnMag * 0.35, bankSmoothFactor)
    bankRadians.current = bank

    // Spine update with distance-based propulsive undulation
    const time = performance.now() / 1000
    const speed = velocity.current.length()
    
    // Only accumulate distance when meaningfully moving (prevents drift noise)
    const movementThreshold = params.maxSpeed * 0.05
    if (speed > movementThreshold) {
      distanceTraveled.current += speed * delta
    }
    
    // Body length estimate for calculating propulsion
    const bodyLength = spine.points.length * spine.spacing
    
    const wave = (i: number) => {
      if (spine.points.length <= 1) return 0
      const spinePos = i / (spine.points.length - 1) // 0 at head, 1 at tail
      
      // Smooth amplitude growth from head to tail using smoothstep
      const smoothGrowth = spinePos * spinePos * (3 - 2 * spinePos)
      const amplitude = THREE.MathUtils.lerp(
        params.undulation.headAmplitude,
        params.undulation.tailAmplitude,
        smoothGrowth
      )
      
      // Calculate both phases
      const waveTravel = distanceTraveled.current * params.undulation.propulsionRatio
      const distancePhase = (waveTravel / (bodyLength * params.undulation.bodyWavelength)) * Math.PI * 2
      const spinePhase = spinePos * Math.PI * 2 / params.undulation.bodyWavelength
      const propulsivePhase = distancePhase - spinePhase
      
      // Idle phase: Use a synchronized approach - derive from propulsive phase when transitioning
      // This prevents phase discontinuity by keeping idle "in sync" with last propulsive state
      const idleBasePhase = time * params.undulation.idleFrequency - spinePhase * 0.5
      
      // Blend weight based on speed (smoothstep for smoother transition)
      const speedRatio = THREE.MathUtils.clamp(speed / (params.maxSpeed * 0.15), 0, 1)
      const propulsiveWeight = speedRatio * speedRatio * (3 - 2 * speedRatio) // smoothstep
      
      // During rest, favor idle more strongly
      let finalPropulsiveWeight = propulsiveWeight
      if (restFactor.current > 0.1) {
        finalPropulsiveWeight *= (1 - restFactor.current * 0.9)
      }
      
      // Use angular interpolation to avoid phase jumps
      // Convert phases to unit circle positions, lerp, then back to angle
      const propX = Math.cos(propulsivePhase)
      const propY = Math.sin(propulsivePhase)
      const idleX = Math.cos(idleBasePhase)
      const idleY = Math.sin(idleBasePhase)
      
      const blendedX = THREE.MathUtils.lerp(idleX, propX, finalPropulsiveWeight)
      const blendedY = THREE.MathUtils.lerp(idleY, propY, finalPropulsiveWeight)
      
      // The sine of the blended angle is simply the Y component (normalized)
      const blendedMag = Math.sqrt(blendedX * blendedX + blendedY * blendedY)
      const waveValue = blendedMag > 0.001 ? blendedY / blendedMag : 0
      
      return waveValue * amplitude
    }
    
    // Stiffer spine = more constraint enforcement
    const constraintIterations = Math.floor(params.undulation.spineStiffness)
    updateSpineFollow(spine, headRef.current.position, headDirection.current, wave, params.undulation.spineResponsiveness, constraintIterations, delta)

    // Do not auto-clear food target here; consumption is managed externally
  }

  const setFoodTarget = (p: THREE.Vector3) => {
    // Clamp food target to sphere
    const clamped = p.clone()
    if (clamped.length() > params.bounds.max) {
      clamped.setLength(params.bounds.max)
    }
    foodTarget.current = clamped
  }

  const clearFoodTarget = () => {
    foodTarget.current = null
  }

  return { headRef, spine, headDirection, velocity, step, bankRadians, setFoodTarget, clearFoodTarget }
}


