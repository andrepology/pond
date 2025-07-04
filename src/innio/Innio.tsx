import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { RootState, ThreeEvent } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useControls } from 'leva'
import { useSpring, a } from '@react-spring/three'
import { InnioBehavior, InnioState } from './InnioBehavior'

// Mock implementations for removed dependencies
const useAccount = () => ({ me: { root: { draftEntry: "Hello, I'm a mock journal entry for testing!" } } })
const useDevice = () => ({ isMobileDevice: false })
const invokeInnio = () => ({ 
  generateResponse: async (entry: string) => `Mock response to: "${entry.substring(0, 20)}..."`,
  resetForNewEntry: () => console.log('Mock: resetForNewEntry called')
})

// Mock InnioMessageContext
const InnioMessageContext = React.createContext<{ setInnioMessage: (msg: string) => void }>({
  setInnioMessage: () => {}
})

// Mock AmbientAudio component
const AmbientAudio: React.FC<any> = () => null

// Mock EffectComposer and Bloom
const EffectComposer: React.FC<any> = ({ children }) => <>{children}</>
const Bloom: React.FC<any> = () => null

const SCALE_FACTOR = 1 / 24;

interface InnioProps {
  onPositionUpdate?: (position: THREE.Vector3) => void
}

// Define ripple properties
const RIPPLE_DURATION = 1800; // ms
const RIPPLE_INITIAL_OPACITY = 0.05;
const RIPPLE_EXPANSION_FACTOR = 5 * SCALE_FACTOR;
const RIPPLE_INITIAL_SCALE = 0.1 * SCALE_FACTOR;

interface ActiveRipple {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

const Innio: React.FC<InnioProps> = ({ onPositionUpdate }) => {
  // Get scene reference
  const { scene } = useThree();
  
  // Ref to store active ripple animations
  const activeRipples = useRef<ActiveRipple[]>([]);

  // --- Basic configuration --
  const [tailCount, setTailCount] = useState(7)
  const headRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.ArrowHelper>(null)

  // Add ref for the hitbox
  const hitboxRef = useRef<THREE.Mesh>(null);

  // Create gradient texture for toon material
  const gradientMap = useMemo(() => {
    // Create a gradient with 4 distinct steps for visible toon shading
    const colors = new Uint8Array([0, 80, 160, 255])  // dark, dark-mid, light-mid, light
    const texture = new THREE.DataTexture(
      colors,
      colors.length,
      1,
      THREE.RedFormat
    )
    texture.needsUpdate = true
    return texture
  }, [])

  // --- Single velocity vector instance (we removed the unused maxSpeed ref and velocityRef) ---
  const currentVelocity = useRef(new THREE.Vector3())
  const prevHeadPos = useRef(new THREE.Vector3())

  // --- For a smooth, consistent heading ---
  const lastHeadDir = useRef(new THREE.Vector3(0, 1, 0))

  // --- Time reference used for animations ---
  const timeRef = useRef(0)

  // --- State for wander target (also used to display marker) ---
  const wanderTargetRef = useRef(new THREE.Vector3())
  const nextWanderTargetRef = useRef(new THREE.Vector3())
  const targetTransitionRef = useRef(0) // 0 to 1 transition progress
  const lastWanderUpdateRef = useRef(0)
  const [wanderTargetState, setWanderTargetState] = useState(new THREE.Vector3(0, 0, 0))

  // --- Debug state for current behavior (used in overlay) ---
  const [currentBehavior, setCurrentBehavior] = useState<InnioState>(InnioState.WANDER)

  // --- GUI controls for steering and tail behavior ---
  const movementControls = useControls('Movement', {
    maxSpeed: { value: 0.01 * SCALE_FACTOR, min: 0.01 * SCALE_FACTOR, max: 0.1 * SCALE_FACTOR, step: 0.001 * SCALE_FACTOR },
    steeringForce: { value: 0.001 * SCALE_FACTOR, min: 0.0001 * SCALE_FACTOR, max: 0.01 * SCALE_FACTOR, step: 0.0001 * SCALE_FACTOR },
    slowingRadius: { value: 2.0 * SCALE_FACTOR, min: 0.5 * SCALE_FACTOR, max: 5 * SCALE_FACTOR, step: 0.1 * SCALE_FACTOR },
  }, { collapsed: true })

  const wanderControls = useControls('Wander', {
    visionRange: { value: 5 * SCALE_FACTOR, min: 1 * SCALE_FACTOR, max: 10 * SCALE_FACTOR, step: 0.5 * SCALE_FACTOR },
    forwardDistance: { value: 2.5 * SCALE_FACTOR, min: 1 * SCALE_FACTOR, max: 5 * SCALE_FACTOR, step: 0.1 * SCALE_FACTOR },
    radius: { value: 0.4, min: 0.1, max: 1.0, step: 0.1 },
    updateInterval: { value: 0.8, min: 0.1, max: 2, step: 0.1 },
    arrivalDistance: { value: 0.3 * SCALE_FACTOR, min: 0.1 * SCALE_FACTOR, max: 1 * SCALE_FACTOR, step: 0.1 * SCALE_FACTOR },
  }, { collapsed: true })

  const boundaryControls = useControls('Boundaries', {
    min: { value: -1, min: -2, max: 0, step: 0.1 },
    max: { value: 1, min: 0, max: 2, step: 0.1 },
    buffer: { value: 0.2, min: 0.05, max: 1, step: 0.05 },
  }, { collapsed: true })

  const animationControls = useControls('Animation', {
    swayFrequency: { value: 1.0, min: 0.1, max: 5, step: 0.1 },
    swayAmount: { value: 0.1 * SCALE_FACTOR, min: 0, max: 0.5 * SCALE_FACTOR, step: 0.01 * SCALE_FACTOR },
    waveSpeed: { value: 3, min: 0.1, max: 10, step: 0.1 },
    waveBase: { value: 0.2 * SCALE_FACTOR, min: 0, max: 1 * SCALE_FACTOR, step: 0.01 * SCALE_FACTOR },
    tailResponsiveness: { value: 0.1, min: 0.01, max: 0.3, step: 0.01 },
  }, { collapsed: true })

  const probabilisticRestControls = useControls('Probabilistic Rest', {
    restCheckInterval: { value: 10, min: 1, max: 60, step: 1, label: 'Rest Check Interval (s)' },
    minWanderRestDuration: { value: 2.5, min: 0.5, max: 10, step: 0.5, label: 'Min Rest (s)' },
    maxWanderRestDuration: { value: 8, min: 0.5, max: 10, step: 0.5, label: 'Max Rest (s)' },
  }, { collapsed: true });

  // --- Consolidate wander parameters (used for movement and steering) ---
  const wanderParams = useRef({
    maxSpeed: movementControls.maxSpeed,
    maxSteerForce: movementControls.steeringForce,
    slowingRadius: movementControls.slowingRadius,
    visionDistance: wanderControls.visionRange,
    forwardDistance: wanderControls.forwardDistance,
    radius: wanderControls.radius,
    updateInterval: wanderControls.updateInterval,
    arrivalThreshold: wanderControls.arrivalDistance,
    bounds: { min: boundaryControls.min, max: boundaryControls.max },
    boundaryBuffer: boundaryControls.buffer,
  })

  // Update parameters when controls change
  useEffect(() => {
    wanderParams.current = {
      ...wanderParams.current,
      maxSpeed: movementControls.maxSpeed,
      maxSteerForce: movementControls.steeringForce,
      slowingRadius: movementControls.slowingRadius,
    }
  }, [movementControls])

  useEffect(() => {
    wanderParams.current = {
      ...wanderParams.current,
      visionDistance: wanderControls.visionRange,
      forwardDistance: wanderControls.forwardDistance,
      radius: wanderControls.radius,
      updateInterval: wanderControls.updateInterval,
      arrivalThreshold: wanderControls.arrivalDistance,
    }
  }, [wanderControls])

  useEffect(() => {
    wanderParams.current = {
      ...wanderParams.current,
      bounds: { min: boundaryControls.min, max: boundaryControls.max },
      boundaryBuffer: boundaryControls.buffer,
    }
  }, [boundaryControls])

  const MAX_LENGTH = 8

  // --- Food target state (for placing food and marker rendering) ---
  const [foodTarget, setFoodTarget] = useState<THREE.Vector3 | null>(null)
  const [foodQueue, setFoodQueue] = useState<THREE.Vector3[]>([])

  // --- Create InnioBehavior instance (state machine) ---
  const innioBehavior = useMemo(() => new InnioBehavior({
    approachThreshold: wanderControls.arrivalDistance,
    restDuration: 0.5, 
    eatDuration: 0.3,
    bounds: { min: boundaryControls.min, max: boundaryControls.max },
    onEat: () => {
      setFoodTarget(null) // Clear the food target state when eaten
      setFoodQueue(prev => prev.slice(1)) // Remove first item from queue
      setTailCount((prev) => {
        if (prev == MAX_LENGTH) {
          return prev
        }
        return prev + 1
      })
    },
    restCheckInterval: probabilisticRestControls.restCheckInterval,
    minWanderRestDuration: probabilisticRestControls.minWanderRestDuration,
    maxWanderRestDuration: probabilisticRestControls.maxWanderRestDuration,
  }), [wanderControls.arrivalDistance, boundaryControls.min, boundaryControls.max, probabilisticRestControls])

  // --- Tail segments positions and refs ---
  const tailPositions = useRef<THREE.Vector3[]>([])
  const tailRefs = useRef<(THREE.Mesh | null)[]>([])
  
  useEffect(() => {
    if (tailPositions.current.length === 0) {
      const initialPositions: THREE.Vector3[] = []
      for (let i = 0; i < tailCount; i++) {
        initialPositions.push(new THREE.Vector3(0, -(i + 1) * 0.5 * SCALE_FACTOR, 0))  // Tail extends in negative Y direction
      }
      tailPositions.current = initialPositions
    }
  }, [])

  useEffect(() => {
    if (tailPositions.current.length < tailCount && tailCount < MAX_LENGTH) {
      // Use the last segment's position (or a default value if none exist)
      const lastPos = tailPositions.current.length > 0 
        ? tailPositions.current[tailPositions.current.length - 1].clone()
        : new THREE.Vector3(0, -0.5 * SCALE_FACTOR, 0)  // Default position in negative Y
      const numToAdd = tailCount - tailPositions.current.length
      for (let i = 0; i < numToAdd; i++) {
        tailPositions.current.push(lastPos.clone())
      }
    }
  }, [tailCount])

  // --- Set up arrow helper for debugging the head's intended direction ---
  useEffect(() => {
    if (!headRef.current || !arrowRef.current) {
      return;
    }
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), headRef.current.position, 1.5 * SCALE_FACTOR, 0x00ffff)
    arrowRef.current = arrow
    headRef.current.parent?.add(arrow)
    return () => {
      if (arrowRef.current && headRef.current?.parent) {
        headRef.current.parent.remove(arrowRef.current)
        if (arrowRef.current.line) arrowRef.current.line.geometry.dispose()
        if (arrowRef.current.cone) arrowRef.current.cone.geometry.dispose()
        arrowRef.current.dispose()
        arrowRef.current = null
      }
    }
  }, [])

  // --- Helper: Clamp a position to the allowed bounds ---
  const applyBounds = (position: THREE.Vector3) => {
    position.x = THREE.MathUtils.clamp(position.x, wanderParams.current.bounds.min, wanderParams.current.bounds.max)
    position.y = THREE.MathUtils.clamp(position.y, wanderParams.current.bounds.min, wanderParams.current.bounds.max)
    position.z = THREE.MathUtils.clamp(position.z, wanderParams.current.bounds.min, wanderParams.current.bounds.max)
  }

  // Add this near the top of your Innio component, with other hooks/refs
  const vectorPool = useMemo(() => {
    // Create a larger pool since Innio component uses many vectors
    const pool: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
      pool.push(new THREE.Vector3());
    }
    
    // Debug counter for monitoring usage
    const created = { count: 0 };
    
    return {
      get: () => {
        if (pool.length === 0) {
          created.count++;
          if (created.count % 100 === 0) {
            console.warn(`Vector pool depleted ${created.count} times, creating new Vector3`);
          }
          return new THREE.Vector3();
        }
        return pool.pop()!;
      },
      release: (v: THREE.Vector3) => {
        if (pool.length < 100) { // Cap pool size
          v.set(0, 0, 0); // Reset vector
          pool.push(v);
        }
      },
      size: () => pool.length,
      createdCount: () => created.count
    };
  }, []);

  // Add these reusable vectors for common operations
  const tempVec1 = useMemo(() => new THREE.Vector3(), []);
  const tempVec2 = useMemo(() => new THREE.Vector3(), []);
  const tempVec3 = useMemo(() => new THREE.Vector3(), []);
  const candidateTmp = useMemo(() => new THREE.Vector3(), []);
  const prevPosTmp = useMemo(() => new THREE.Vector3(), []);
  const basePosTmp = useMemo(() => new THREE.Vector3(), []);
  const perpTmp = useMemo(() => new THREE.Vector3(), []);

  // --- Boundary Detection System ---
  const boundaryZones = {
    danger: 0.1,      // Emergency zone
    caution: 0.3,     // Strong avoidance
    awareness: 0.5    // Gentle steering
  };

  const getDistanceToBoundary = (pos: THREE.Vector3, bounds: { min: number, max: number }) => {
    const distances = [
      pos.x - bounds.min,
      bounds.max - pos.x,
      pos.y - bounds.min,
      bounds.max - pos.y,
      pos.z - bounds.min,
      bounds.max - pos.z
    ];
    return Math.min(...distances);
  };

  const getNearestBoundaryNormal = (pos: THREE.Vector3, bounds: { min: number, max: number }) => {
    const normal = vectorPool.get();
    normal.set(0, 0, 0);
    
    // Check each axis and find the closest boundary
    const distXMin = pos.x - bounds.min;
    const distXMax = bounds.max - pos.x;
    const distYMin = pos.y - bounds.min;
    const distYMax = bounds.max - pos.y;
    const distZMin = pos.z - bounds.min;
    const distZMax = bounds.max - pos.z;
    
    const minDist = Math.min(distXMin, distXMax, distYMin, distYMax, distZMin, distZMax);
    
    if (minDist === distXMin) {
      normal.x = 1;
    } else if (minDist === distXMax) {
      normal.x = -1;
    } else if (minDist === distYMin) {
      normal.y = 1;
    } else if (minDist === distYMax) {
      normal.y = -1;
    } else if (minDist === distZMin) {
      normal.z = 1;
    } else {
      normal.z = -1;
    }
    
    return normal.normalize();
  };

  const getBoundaryAvoidanceForce = (
    pos: THREE.Vector3, 
    velocity: THREE.Vector3,
    params: any
  ) => {
    const dist = getDistanceToBoundary(pos, params.bounds);
    const force = vectorPool.get();
    
    if (dist >= boundaryZones.awareness) {
      force.set(0, 0, 0);
      return force;
    }
    
    const normal = getNearestBoundaryNormal(pos, params.bounds);
    
    if (dist < boundaryZones.danger) {
      // Emergency: Very strong repulsion
      force.copy(normal).multiplyScalar(params.maxSteerForce * 4);
      
      // Also reduce forward velocity to help turning
      const velocityDotNormal = velocity.dot(normal);
      if (velocityDotNormal < 0) {
        // Moving toward boundary - dampen that component
        const dampening = normal.clone().multiplyScalar(velocityDotNormal * -0.8);
        velocity.add(dampening);
      }
    } else if (dist < boundaryZones.caution) {
      // Strong steering away
      const strength = 1 - (dist - boundaryZones.danger) / (boundaryZones.caution - boundaryZones.danger);
      force.copy(normal).multiplyScalar(params.maxSteerForce * 2 * strength);
    } else {
      // Gentle guidance
      const strength = 1 - (dist - boundaryZones.caution) / (boundaryZones.awareness - boundaryZones.caution);
      force.copy(normal).multiplyScalar(params.maxSteerForce * 0.5 * strength);
    }
    
    vectorPool.release(normal);
    return force;
  };

  // --- Swim Cycle State for Burst-Glide Pattern ---
  const swimCycleRef = useRef({
    phase: 'glide' as 'burst' | 'glide',
    timer: 0,
    burstDuration: 0.6,
    glideDuration: 1.5,
    intensity: 1.0,
    transitionProgress: 0  // Add smooth transition between phases
  });

  const updateSwimCycle = (delta: number, nearBoundary: boolean) => {
    const cycle = swimCycleRef.current;
    cycle.timer += delta;
    
    // Smooth transition between phases
    const transitionSpeed = 3.0; // How fast to transition between phases
    
    if (nearBoundary) {
      // When near boundaries, use more controlled movement
      cycle.burstDuration = 0.4;
      cycle.glideDuration = 0.8;
      cycle.intensity = 0.7;
    } else {
      // Normal swimming - predictable, non-random
      cycle.burstDuration = 0.6;
      cycle.glideDuration = 1.4;
      cycle.intensity = 1.0;
    }
    
    if (cycle.phase === 'burst') {
      cycle.transitionProgress = Math.min(1, cycle.transitionProgress + delta * transitionSpeed);
      if (cycle.timer >= cycle.burstDuration) {
        cycle.phase = 'glide';
        cycle.timer = 0;
      }
    } else { // glide
      cycle.transitionProgress = Math.max(0, cycle.transitionProgress - delta * transitionSpeed);
      if (cycle.timer >= cycle.glideDuration) {
        cycle.phase = 'burst';
        cycle.timer = 0;
      }
    }
    
    return cycle;
  };

  // Now let's modify the updateMovement function to use vector pooling
  const updateMovement = (delta: number) => {
    const params = wanderParams.current;
    // Use tempVec1 instead of clone for priorPos
    tempVec1.copy(headRef.current!.position);

    if ((innioBehavior.state === InnioState.REST || innioBehavior.state === InnioState.TALK) 
        && innioBehavior.stationaryPosition && innioBehavior.stationaryDirection) {
      const sway = Math.sin(timeRef.current * animationControls.swayFrequency) * animationControls.swayAmount;
      // Get perp vector from pool
      const perp = vectorPool.get();
      perp.set(-innioBehavior.stationaryDirection.y, innioBehavior.stationaryDirection.x, 0);  // Changed for YZ plane
      
      // The center of sway now drifts slowly
      const drift = vectorPool.get()
        .copy(innioBehavior.stationaryDirection)
        .multiplyScalar(0.002 * SCALE_FACTOR * delta);
      innioBehavior.stationaryPosition.add(drift);
      vectorPool.release(drift);

      // Get targetPos from pool
      const targetPos = vectorPool.get();
      targetPos.copy(innioBehavior.stationaryPosition).add(perp.multiplyScalar(sway));
      
      headRef.current!.position.lerp(targetPos, 0.05); // Slower lerp for more fluid motion
      
      // Release vectors back to pool
      vectorPool.release(perp);
      vectorPool.release(targetPos);
    } else if (innioBehavior.state === InnioState.WANDER) {
      
      const desired = vectorPool.get();
      const pos = headRef.current!.position;
      
      // --- Multi-Zone Boundary Avoidance ---
      const boundaryForce = getBoundaryAvoidanceForce(pos, currentVelocity.current, params);
      
      // If we have boundary force, it takes priority
      if (boundaryForce.lengthSq() > 0) {
        desired.copy(boundaryForce);
        
        // Slow down when near boundaries for better control
        const dist = getDistanceToBoundary(pos, params.bounds);
        const speedMultiplier = Math.max(0.3, dist / boundaryZones.awareness);
        desired.clampLength(0, params.maxSpeed * speedMultiplier);
      } else {
        // --- Standard Wander Logic ---
        const forward = vectorPool.get();
        if (currentVelocity.current.lengthSq() > 0.0001) {
          forward.copy(currentVelocity.current).normalize();
        } else {
          forward.set(0, 1, 0);
        }
        
        // Vision-based boundary detection
        const visionPoint = vectorPool.get();
        visionPoint.copy(headRef.current!.position).add(forward.multiplyScalar(params.visionDistance));
        const isVisionOut = Math.abs(visionPoint.x) > params.bounds.max - params.boundaryBuffer || 
                           Math.abs(visionPoint.y) > params.bounds.max - params.boundaryBuffer ||
                           Math.abs(visionPoint.z) > params.bounds.max - params.boundaryBuffer;
        vectorPool.release(visionPoint);

        const currentTarget = vectorPool.get();
        if (nextWanderTargetRef.current.lengthSq() === 0) {
          currentTarget.copy(wanderTargetRef.current);
        } else {
          targetTransitionRef.current = Math.min(targetTransitionRef.current + delta / params.updateInterval * 0.75, 1);
          const smoothT = smoothstep(0, 1, targetTransitionRef.current);
          currentTarget.lerpVectors(wanderTargetRef.current, nextWanderTargetRef.current, smoothT);
          if (targetTransitionRef.current >= 1) {
            wanderTargetRef.current.copy(nextWanderTargetRef.current);
            nextWanderTargetRef.current.set(0, 0, 0);
            targetTransitionRef.current = 0;
          }
        }
        
        setWanderTargetState(tempVec3.copy(currentTarget));
        
        const isTargetOut = Math.abs(currentTarget.x) > params.bounds.max || 
                           Math.abs(currentTarget.y) > params.bounds.max || 
                           Math.abs(currentTarget.z) > params.bounds.max;
        const distToTarget = headRef.current!.position.distanceTo(currentTarget);
        const shouldUpdate = (timeRef.current - lastWanderUpdateRef.current > params.updateInterval) || (distToTarget < params.arrivalThreshold) || isTargetOut || isVisionOut;
        
        if (shouldUpdate && nextWanderTargetRef.current.lengthSq() === 0) {
          const base = vectorPool.get();
          if (isVisionOut) {
            // Steer toward center when vision detects boundary
            const toCenter = vectorPool.get();
            const centerY = (params.bounds.min + params.bounds.max) / 2;  // Calculate actual center
            toCenter.set(0, centerY, 0).sub(headRef.current!.position).normalize();
            base.copy(headRef.current!.position).add(toCenter.multiplyScalar(params.forwardDistance));
            vectorPool.release(toCenter);
          } else {
            base.copy(headRef.current!.position).add(forward.multiplyScalar(params.forwardDistance));
          }
          
          // Generate true 3D wander targets using spherical coordinates
          const phi = Math.random() * Math.PI * 2; // Azimuthal angle (0 to 2π)
          const theta = Math.random() * Math.PI; // Polar angle (0 to π)
          const offsetLen = Math.random() * params.radius;
          const offset = vectorPool.get().set(
            Math.sin(theta) * Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta)
          ).multiplyScalar(offsetLen);
          
          const newTarget = vectorPool.get().copy(base).add(offset);
          applyBounds(newTarget);
          
          if (wanderTargetRef.current.lengthSq() === 0) {
            wanderTargetRef.current.copy(newTarget);
          } else {
            nextWanderTargetRef.current.copy(newTarget);
            targetTransitionRef.current = 0;
          }
          
          lastWanderUpdateRef.current = timeRef.current;
          vectorPool.release(offset);
          vectorPool.release(newTarget);
          vectorPool.release(base);
        }
        
        desired.subVectors(currentTarget, headRef.current!.position);
        const dist = desired.length();
        desired.normalize();
        
        if (dist < params.slowingRadius) {
          desired.multiplyScalar(params.maxSpeed * (dist / params.slowingRadius));
        } else {
          desired.multiplyScalar(params.maxSpeed);
        }
        vectorPool.release(currentTarget);
        vectorPool.release(forward);
      }
      
      // --- Apply Steering ---
      const steer = vectorPool.get().subVectors(desired, currentVelocity.current).clampLength(0, params.maxSteerForce);
      currentVelocity.current.add(steer);
      
      // Adjust speed based on context and swim cycle
      const dist = getDistanceToBoundary(pos, params.bounds);
      const nearBoundary = dist < boundaryZones.awareness;
      
      // Update swim cycle
      const swimCycle = updateSwimCycle(delta, nearBoundary);
      
      let targetSpeed = params.maxSpeed;
      
      if (nearBoundary) {
        // Slow down near boundaries
        targetSpeed *= Math.max(0.3, dist / boundaryZones.awareness);
      } else {
        // Apply burst-glide pattern with smooth transitions
        const swimIntensity = swimCycle.transitionProgress; // 0 = full glide, 1 = full burst
        
        // Base speed is a glide, burst adds to it.
        const glideSpeed = params.maxSpeed * 0.4;
        const burstSpeed = params.maxSpeed * 0.8; // Additional speed
        targetSpeed = glideSpeed + (burstSpeed * swimIntensity);
      }
      
      // Apply smoother drag for more realistic physics
      const drag = 0.015;
      currentVelocity.current.multiplyScalar(1 - drag);
      
      currentVelocity.current.clampLength(0, targetSpeed);
      
      headRef.current!.position.add(currentVelocity.current);
      
      applyBounds(headRef.current!.position); // Final safety clamp
      
      vectorPool.release(steer);
      vectorPool.release(desired);
      vectorPool.release(boundaryForce);
    } else if (innioBehavior.state === InnioState.APPROACH) {
      if (!innioBehavior.target) return;
      const params = wanderParams.current;
      
      // Get desired vector from pool
      const desired = vectorPool.get();
      desired.subVectors(innioBehavior.target, headRef.current!.position);
      const dist = desired.length();
      desired.normalize();
      
      if (dist < params.slowingRadius) {
        desired.multiplyScalar(params.maxSpeed * (dist / params.slowingRadius));
      } else {
        desired.multiplyScalar(params.maxSpeed);
      }
      
      const wiggle = Math.sin(timeRef.current * 2) * 0.2;
      desired.applyAxisAngle(new THREE.Vector3(0, 0, 1), wiggle);  // Changed axis for YZ plane
      
      // Get steer vector from pool
      const steer = vectorPool.get();
      steer.copy(desired).sub(currentVelocity.current);
      steer.clampLength(0, params.maxSteerForce);
      
      currentVelocity.current.add(steer);
      currentVelocity.current.clampLength(0, params.maxSpeed);
      headRef.current!.position.add(currentVelocity.current);
      applyBounds(headRef.current!.position);
      
      // Release vectors back to pool
      vectorPool.release(steer);
      vectorPool.release(desired);
    } else if (innioBehavior.state === InnioState.EAT) {
      // Get velocity copy from pool
      const velocityCopy = vectorPool.get();
      velocityCopy.copy(currentVelocity.current).multiplyScalar(0.98);
      
      headRef.current!.position.add(velocityCopy);
      
      // Release vector back to pool
      vectorPool.release(velocityCopy);
    } else if (innioBehavior.state === InnioState.TALK) {
      console.log("Innio in TALK state - should keep moving");
      // Still apply movement from current state
      if (currentVelocity.current.length() > 0.001) {
        headRef.current!.position.add(currentVelocity.current);
        applyBounds(headRef.current!.position);
      }
    }
    
    // Update velocity based on how far the head has moved in this frame
    // Get displacement vector from pool
    const displacement = vectorPool.get();
    displacement.subVectors(headRef.current!.position, tempVec1);
    
    currentVelocity.current.copy(displacement).clampLength(0, params.maxSpeed);
    prevHeadPos.current.copy(headRef.current!.position);
    
    // Release vector back to pool
    vectorPool.release(displacement);
  }

  const computeTargetDirection = (): THREE.Vector3 => {
    candidateTmp.set(0, 0, 0);
    
    if ((innioBehavior.state === InnioState.REST || innioBehavior.state === InnioState.TALK) && innioBehavior.stationaryDirection) {
      return candidateTmp.copy(innioBehavior.stationaryDirection);
    } else if (innioBehavior.state === InnioState.APPROACH && innioBehavior.target) {
      candidateTmp.subVectors(innioBehavior.target, headRef.current!.position);
    } else if (currentVelocity.current.lengthSq() > 0.0001) {
      candidateTmp.copy(currentVelocity.current);
    } else {
      return lastHeadDir.current;
    }

    if (candidateTmp.lengthSq() > 0.0001) {
      return candidateTmp.normalize();
    }
    
    return lastHeadDir.current;
  }

  const updateTailSegments = (headDirection: THREE.Vector3) => {
    prevPosTmp.copy(headRef.current!.position);
    
    for (let i = 0; i < Math.min(tailCount, tailPositions.current.length); i++) {
      const segProgress = i / tailCount;
      const taperFactor = Math.pow(1 - segProgress, 1.2);
      const spacing = 0.5 * SCALE_FACTOR * taperFactor;
      
      // Reuse basePosTmp instead of creating new vectors
      basePosTmp.copy(prevPosTmp).addScaledVector(headDirection, -spacing);
      
      if (innioBehavior.state === InnioState.REST || innioBehavior.state === InnioState.TALK) {
        const swayPhase = i * 0.2;
        const attenuation = 1 - i / (tailCount * 1.5);
        const sway = Math.sin(timeRef.current * animationControls.swayFrequency + swayPhase) * 
                    (animationControls.swayAmount * attenuation);
        
        // Reuse perpTmp
        perpTmp.set(-headDirection.y, headDirection.x, 0);  // Changed for YZ plane
        basePosTmp.add(perpTmp.multiplyScalar(sway));
      } else {
        const speedFactor = THREE.MathUtils.clamp(currentVelocity.current.length() * 10, 0.2, 1);
        const baseAmp = animationControls.waveBase * (1 - i / tailCount);
        
        // Use the smooth transition progress for wave modulation
        const swimIntensity = swimCycleRef.current.transitionProgress;
        
        // Smoother wave modulation based on swim phase
        let waveAmp = baseAmp * speedFactor * (0.6 + swimIntensity * 0.4);
        let waveSpeed = animationControls.waveSpeed * (0.8 + swimIntensity * 0.2);
        
        const waveOffset = Math.sin(timeRef.current * waveSpeed - i * 5) * waveAmp;
        
        // Reuse perpTmp
        perpTmp.set(-headDirection.y, headDirection.x, 0);  // Changed for YZ plane
        
        // Add lateral motion from turning
        const lateralForce = bodyBankingRef.current.lateralAcceleration * (1 - segProgress) * 0.1;
        basePosTmp.add(perpTmp.multiplyScalar(waveOffset - lateralForce));
        
        // Add banking to tail segments
        if (bodyBankingRef.current.currentBank !== 0) {
          const bankOffset = bodyBankingRef.current.currentBank * 0.02 * (1 - i / tailCount);
          basePosTmp.z += bankOffset; // Use Z for vertical offset in YZ plane
        }
      }
      
      tailPositions.current[i].lerp(basePosTmp, animationControls.tailResponsiveness);
      const curDist = tailPositions.current[i].distanceTo(prevPosTmp);
      
      if (curDist > spacing) {
        tailPositions.current[i].sub(prevPosTmp).setLength(spacing).add(prevPosTmp);
      }
      
      if (tailRefs.current[i]) {
        tailRefs.current[i]!.position.copy(tailPositions.current[i]);
      }
      
      prevPosTmp.copy(tailPositions.current[i]);
    }
  }

  // Add this with other controls
  const cameraControls = useControls('Camera', {
    locked: { value: false, label: 'Lock to Innio' },
    followDistance: { value: 5 * SCALE_FACTOR, min: 2 * SCALE_FACTOR, max: 10 * SCALE_FACTOR, step: 0.1 * SCALE_FACTOR },
    height: { value: 3 * SCALE_FACTOR, min: 1 * SCALE_FACTOR, max: 10 * SCALE_FACTOR, step: 0.1 * SCALE_FACTOR },
  }, { collapsed: true })

  // Add this with other refs
  const positionUpdateVec = useRef(new THREE.Vector3());
  
  // Body banking for realistic turning
  const bodyBankingRef = useRef({
    currentBank: 0,
    targetBank: 0,
    lateralAcceleration: 0
  });

  const { me } = useAccount()
  const { generateResponse, resetForNewEntry } = invokeInnio()

  // Add a loading state for visual feedback
  const [isLoading, setIsLoading] = useState(false)

  // Modify the innio spring to include a loading animation
  const [headSpring, setHeadSpring] = useSpring(() => ({
    scale: 1,
    config: { mass: 1, tension: 180, friction: 12 }
  }))

  // Add this effect to handle the loading animation
  useEffect(() => {
    if (isLoading) {
      // Set up pulsing animation for visual feedback during API calls
      let direction = 1;
      const pulseAnimation = setInterval(() => {
        direction *= -1;
        setHeadSpring({ 
          scale: direction > 0 ? 1.1 : 1,
          config: { duration: 500 }
        });
      }, 500);
      
      return () => clearInterval(pulseAnimation);
    } else {
      // Reset scale when loading completes
      setHeadSpring({ scale: 1 });
    }
  }, [isLoading, setHeadSpring]);

  // --- Additive Pulse Animation State ---
  const activePulseStartTimesRef = useRef<number[]>([]);
  const PULSE_SPEED = 6; // Segments per second
  const PULSE_HALF_WIDTH_SEGMENTS = 1.0; // How many segments the pulse illuminates around its center (e.g., 1.0 means ~2 segments wide)
  const PULSE_INTENSITY_BOOST = 3.5; // Multiplier for base emissive intensity during pulse
  const MAX_PULSES = 10; // Limit simultaneous pulses

  // Update the handleInnioClick function
  const handleInnioClick = useCallback(async (/* e: ThreeEvent<MouseEvent> */) => {
    // --- Trigger Pulse --- 
    const nowSeconds = performance.now() / 1000.0;
    activePulseStartTimesRef.current.push(nowSeconds);
    // Optional: Limit number of active pulses
    if (activePulseStartTimesRef.current.length > MAX_PULSES) {
      activePulseStartTimesRef.current.shift(); // Remove the oldest pulse
    }

    // --- Subtle Bump Animation ---
    setHeadSpring({
      scale: 1.06, // Reduced from 1.2 for a gentler effect
      config: { tension: 280, friction: 20 }, // Faster, less bouncy
      onRest: { scale: () => setHeadSpring({ scale: 1 }) } 
    });
    
    // If innio is already talking OR there's no journal entry, do nothing further.
    const journalEntry = me?.root?.draftEntry?.trim(); // Use optional chaining and provide default
    if (innioBehavior.state === InnioState.TALK || !journalEntry) {
      console.log(`Innio click ignored: State=${innioBehavior.state}, HasEntry=${!!journalEntry}`);
      return; // Don't proceed with API call
    }

    // Reset Innio state for new entry
    resetForNewEntry();

    // --- Proceed with OpenAI call ---
    setIsLoading(true)
    
    try {
      // Send journal entry to OpenAI
      const response = await generateResponse(journalEntry)
      
      // If we got a response, make the innio talk
      if (response && headRef.current) {
        console.log('🐠 Innio received response:', response.substring(0, 50) + '...');
        innioBehavior.startTalking(
          headRef.current.position.clone(),
          currentVelocity.current.clone(),
          response
        )
        
        setCurrentBehavior(InnioState.TALK)
      } else {
        console.warn('🐠 No response from OpenAI:', {
          hasResponse: !!response,
          responseLength: response?.length,
          hasHeadRef: !!headRef.current
        });
      }
    } catch (error) {
      console.error("Error getting innio response:", error)
      
      // Optional: make innio say an error message
      if (headRef.current) {
        innioBehavior.startTalking(
          headRef.current.position.clone(),
          currentVelocity.current.clone(),
          "I seem to be at a loss for words..."
        )
        setCurrentBehavior(InnioState.TALK)
      }
    } finally {
      // Clear loading state
      setIsLoading(false)
    }
  }, [innioBehavior, me, generateResponse, setHeadSpring, resetForNewEntry]) // Added resetForNewEntry to dependencies

  // Update the text display useEffect to respond to loading state changes
  useEffect(() => {
    // Clear any pending text display timeouts when loading state changes
    const highestId = window.setTimeout(() => {}, 0)
    for (let i = 0; i < highestId; i++) {
      window.clearTimeout(i)
    }
  }, [isLoading])

  useFrame((state: RootState, delta: number) => {
    timeRef.current = state.clock.elapsedTime
    const currentTime = state.clock.elapsedTime; // Use consistent clock time
    if (!headRef.current) return

    // Update the innio behavior state machine
    innioBehavior.update(headRef.current.position, currentVelocity.current, delta)
    if (currentBehavior !== innioBehavior.state) {
      setCurrentBehavior(innioBehavior.state)
    }

    // Update movement (head position, steering, and velocity)
    updateMovement(delta)

    // Compute a smoothed intended direction (to drive the tail)
    const newDirCandidate = computeTargetDirection()
    lastHeadDir.current.lerp(newDirCandidate, 0.5)
    const intendedDir = lastHeadDir.current.clone()

    // Update arrow helper (for debugging)
    if (arrowRef.current) {
      arrowRef.current.position.copy(headRef.current.position)
      arrowRef.current.setDirection(intendedDir)
    }

    // Update tail segments so they follow the head smoothly
    updateTailSegments(intendedDir)

    // Synchronize hitbox position with the head
    if (headRef.current && hitboxRef.current) {
      hitboxRef.current.position.copy(headRef.current.position);
    }
    
    // Calculate body banking based on turning
    if (headRef.current && currentVelocity.current.lengthSq() > 0.001) {
      // Calculate lateral acceleration (approximation)
      const velocityDir = currentVelocity.current.clone().normalize();
      const turnRate = 1 - velocityDir.dot(lastHeadDir.current);
      const speed = currentVelocity.current.length();
      
      bodyBankingRef.current.lateralAcceleration = turnRate * speed * 200; // Store for tail physics
      
      // Bank angle proportional to turn rate and speed
      bodyBankingRef.current.targetBank = bodyBankingRef.current.lateralAcceleration * 0.5; // Proportional to lateral accel
      
      // Determine banking direction based on cross product
      const cross = new THREE.Vector3().crossVectors(lastHeadDir.current, velocityDir);
      if (cross.x < 0) bodyBankingRef.current.targetBank *= -1;  // Changed from cross.y to cross.x for YZ plane
      
      // Smooth banking transition
      bodyBankingRef.current.currentBank = THREE.MathUtils.lerp(
        bodyBankingRef.current.currentBank,
        bodyBankingRef.current.targetBank,
        0.1
      );
      
      // Apply banking to head rotation
      headRef.current.rotation.x = bodyBankingRef.current.currentBank * 0.3; // Changed from rotation.z to rotation.x for YZ plane
    }

    // Calculate perspective line
    if (headRef.current) {
      // Get head position in world space
      const headPosition = headRef.current.position.clone()
      
      // Project head position to screen space
      const headScreenSpace = headPosition.clone().project(state.camera)
      
      // Calculate angle based on screen position
      const angleToCenter = Math.atan2(headScreenSpace.x, 1) // 1 is the distance to projection plane
      const maxTilt = 0 // 45 degrees maximum tilt
      const lineLength = 3.5 * SCALE_FACTOR // Fixed line length
      
      // Create a vector pointing up
      const lineVector = new THREE.Vector3(
        Math.sin(angleToCenter) * maxTilt,
        1,
        -Math.abs(Math.sin(angleToCenter)) * 0.5
      ).normalize().multiplyScalar(lineLength)

      // Replace lineEndRef usage with a local variable
      const lineEnd = new THREE.Vector3();
      lineEnd.copy(lineVector);

      if (headRef.current && lineRef.current) {
        const points = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(lineEnd.x, lineEnd.y, lineEnd.z)
        ];
        lineRef.current.geometry.setFromPoints(points);
      }
    }

    // After updating the innio's position,
    // if a callback was provided, report the innio head's current position.
    if (headRef.current && onPositionUpdate) {
      // Reuse the same vector instead of creating a new one
      positionUpdateVec.current.copy(headRef.current.position);
      onPositionUpdate(positionUpdateVec.current);
    }

    // --- Ripple Animation Logic ---
    const now = performance.now();
    const ripplesToRemove: ActiveRipple[] = [];

    activeRipples.current.forEach((ripple) => {
      const elapsed = now - ripple.startTime;
      const progress = Math.min(elapsed / ripple.duration, 1);
      
      // Animate scale: start small, expand outwards
      const currentScale = RIPPLE_INITIAL_SCALE + progress * RIPPLE_EXPANSION_FACTOR;
      ripple.mesh.scale.set(currentScale, currentScale, 1);
      
      // Animate opacity: fade out
      (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = RIPPLE_INITIAL_OPACITY * (1 - progress);
      
      if (progress >= 1) {
        ripplesToRemove.push(ripple);
      }
    });

    // Cleanup completed ripples
    ripplesToRemove.forEach((ripple) => {
      scene.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      (ripple.mesh.material as THREE.MeshBasicMaterial).dispose();
    });

    // Update the active ripples array
    activeRipples.current = activeRipples.current.filter(
      (ripple) => !ripplesToRemove.includes(ripple)
    );

    // --- Pulse Animation Logic ---
    // Calculate base emissive intensities (as defined in JSX)
    const BASE_HEAD_EMISSIVE_INTENSITY = 0.8;
    let headPulseBoost = 0;

    // Calculate boosts from active pulses
    const nextActivePulses: number[] = [];
    for (const pulseStartTime of activePulseStartTimesRef.current) {
      const elapsed = currentTime - pulseStartTime;
      const pulseTravelProgress = elapsed * PULSE_SPEED; // How many segments the pulse center has passed

      // Head (segment index 0)
      const headDist = Math.abs(0 - pulseTravelProgress);
      const headBrightness = Math.max(0, 1 - headDist / PULSE_HALF_WIDTH_SEGMENTS);
      headPulseBoost += headBrightness * PULSE_INTENSITY_BOOST;

      // Tail segments
      for (let i = 0; i < Math.min(tailCount, tailRefs.current.length); i++) {
        if (!tailRefs.current[i]) continue;
        const segmentIndex = i + 1; // Tail starts at index 1
        const tailDist = Math.abs(segmentIndex - pulseTravelProgress);
        const tailBrightness = Math.max(0, 1 - tailDist / PULSE_HALF_WIDTH_SEGMENTS);
        const tailPulseBoost = tailBrightness * PULSE_INTENSITY_BOOST;

        // Apply boost (add to base intensity calculated later)
        // Store boost per segment temporarily (using userData as an example, could use a separate ref/map)
        tailRefs.current[i]!.userData.pulseBoost = (tailRefs.current[i]!.userData.pulseBoost || 0) + tailPulseBoost;
      }

      // Keep pulse if it's still potentially visible
      const pulseVisibleEndProgress = tailCount + 1 + PULSE_HALF_WIDTH_SEGMENTS;
      if (pulseTravelProgress < pulseVisibleEndProgress) {
        nextActivePulses.push(pulseStartTime);
      }
    }
    activePulseStartTimesRef.current = nextActivePulses;

    // Apply final intensity to head
    if (headRef.current) {
      const headMaterial = headRef.current.material as THREE.MeshToonMaterial;
      headMaterial.emissiveIntensity = BASE_HEAD_EMISSIVE_INTENSITY + headPulseBoost;
    }

    // Apply final intensity to tail segments
    for (let i = 0; i < Math.min(tailCount, tailRefs.current.length); i++) {
      if (!tailRefs.current[i]) continue;
      const tailMaterial = tailRefs.current[i]!.material as THREE.MeshToonMaterial;
      const segProgress = i / tailCount;
      const BASE_TAIL_EMISSIVE_INTENSITY = 2.5 - (segProgress * 1.5);
      const totalBoost = tailRefs.current[i]!.userData.pulseBoost || 0;
      tailMaterial.emissiveIntensity = BASE_TAIL_EMISSIVE_INTENSITY + totalBoost;
      // Reset boost for next frame
      tailRefs.current[i]!.userData.pulseBoost = 0;
    }
    // --- End Pulse Animation Logic ---

    // Sync food target state with behavior
    if (innioBehavior.target && !foodTarget) {
      setFoodTarget(innioBehavior.target);
    } else if (!innioBehavior.target && foodTarget) {
      setFoodTarget(null);
    }
    
    // Sync food queue state
    if (innioBehavior.targetQueue.length !== foodQueue.length) {
      setFoodQueue([...innioBehavior.targetQueue]);
    }
  })

  // Add this ref for the Line
  const lineRef = useRef<THREE.Line>(null)

  // Constants for text display
  const PUNCTUATION_PAUSE_EXTENSION = 300;
  const DOUBLE_CLICK_TIME_THRESHOLD = 400;
  const CLICK_MAX_DURATION = 300;
  const CLICK_MOVE_THRESHOLD_SQUARED = 5 * 5; // In world units, not scaled
  const LONG_PRESS_THRESHOLD = 700;

  // State for text display
  const [allWordsForCurrentMessage, setAllWordsForCurrentMessage] = useState<string[]>([]);
  const [displayWords, setDisplayWords] = useState<{ text: string; visible: boolean; position: number }[]>([]);
  const [isTextContainerVisible, setIsTextContainerVisible] = useState(false);

  // Refs for timeouts
  const wordVisibilityTimeoutsRef = useRef<number[]>([]);
  const stopTalkCleanupTimeoutRef = useRef<number | null>(null);

  // Effect 1: Message Orchestration (Handles starting/stopping speech)
  useEffect(() => {
    // Clear all potentially running timeouts whenever this effect runs.
    wordVisibilityTimeoutsRef.current.forEach(clearTimeout);
    wordVisibilityTimeoutsRef.current = [];
    if (stopTalkCleanupTimeoutRef.current) {
      clearTimeout(stopTalkCleanupTimeoutRef.current);
      stopTalkCleanupTimeoutRef.current = null;
    }

    if (innioBehavior.state === InnioState.TALK) {
      const message = innioBehavior.getMessage() || "Hello, dear";
      const currentFullMessage = allWordsForCurrentMessage.join(' ');

      // Only reset and start from scratch if the message content has actually changed.
      if (currentFullMessage !== message) {
        setIsTextContainerVisible(false); // Ensure container is hidden for the new message
        setAllWordsForCurrentMessage(message.split(' '));
        setDisplayWords([]);    // Clear any old words immediately
      }
    } else {
      // Innio is not talking
      setIsTextContainerVisible(false); // Start fading out the text container
      
      // Schedule cleanup of message data after fade-out duration
      // @ts-ignore
      stopTalkCleanupTimeoutRef.current = setTimeout(() => {
        // Double-check state in case innio started talking again very quickly
        if (innioBehavior.state !== InnioState.TALK) {
          setAllWordsForCurrentMessage([]);
          setDisplayWords([]);
        }
        stopTalkCleanupTimeoutRef.current = null;
      }, 500); // Match container fade-out duration
    }

    // General cleanup for this effect
    return () => {
      wordVisibilityTimeoutsRef.current.forEach(clearTimeout);
      if (stopTalkCleanupTimeoutRef.current) clearTimeout(stopTalkCleanupTimeoutRef.current);
    };
  }, [innioBehavior.state, innioBehavior.getMessage()]);

  // Effect 2: Word Animation (Handles rendering all words with animation)
  useEffect(() => {
    // Clear previous word animation timeouts
    wordVisibilityTimeoutsRef.current.forEach(clearTimeout);
    wordVisibilityTimeoutsRef.current = [];

    if (innioBehavior.state !== InnioState.TALK || allWordsForCurrentMessage.length === 0) {
      return;
    }

    // Initialize all words as invisible
    const newWords = allWordsForCurrentMessage.map((word, index) => ({
      text: word,
      visible: false,
      position: index / (allWordsForCurrentMessage.length - 1 || 1),
    }));

    setDisplayWords(newWords);

    // Start animation sequence
    const startAnimationTimeout = setTimeout(() => {
      setIsTextContainerVisible(true);

      let cumulativeDelay = 0;
      const newTimeoutsHolder: number[] = [];

      allWordsForCurrentMessage.forEach((word, index) => {
        const baseDelay = 180;
        const randomFactor = Math.random() * 80;
        const punctuationPause = /[.!?;,]$/.test(word) ? PUNCTUATION_PAUSE_EXTENSION : 0;
        cumulativeDelay += baseDelay + randomFactor + punctuationPause;

        const wordTimeout = setTimeout(() => {
          setDisplayWords(prevDisplayWords =>
            prevDisplayWords.map((w, i) => (i === index ? { ...w, visible: true } : w))
          );

          // If this is the last word
          if (index === allWordsForCurrentMessage.length - 1) {
            // Wait a bit after the last word before stopping
            const finalTimeout = setTimeout(() => {
              if (innioBehavior.state === InnioState.TALK) {
                innioBehavior.stopTalking();
              }
            }, 5000); // Increased from 1000 to 3000 (3 seconds)
            // @ts-ignore
            newTimeoutsHolder.push(finalTimeout);
          }
        }, cumulativeDelay);
        // @ts-ignore
        newTimeoutsHolder.push(wordTimeout);
      });

      wordVisibilityTimeoutsRef.current = newTimeoutsHolder;
    }, 50);

    return () => {
      clearTimeout(startAnimationTimeout);
    };
  }, [allWordsForCurrentMessage, innioBehavior.state]);

  const [innioMessage, setInnioMessage] = useState('')

  // Effect to handle incoming messages and make innio talk
  useEffect(() => {
    console.log("Innio message changed:", innioMessage);
    console.log("Current innio state:", innioBehavior.state);
    
    if (innioMessage && innioBehavior.state !== InnioState.TALK) {
      // Start talking with the new message
      if (headRef.current) {
        console.log("Starting innio talking");
        innioBehavior.startTalking(
          headRef.current.position.clone(),
          currentVelocity.current.clone(),
          innioMessage
        )
        setCurrentBehavior(InnioState.TALK)
      }
    } else if (innioMessage && innioBehavior.state === InnioState.TALK) {
      // Update the message if already talking - this allows dynamic message updates
      console.log("Updating innio message while talking");
      innioBehavior.setMessage(innioMessage)
      // Force re-render of speech display by resetting the message
      setAllWordsForCurrentMessage([]);
      setDisplayWords([]);
    }
  }, [innioMessage, innioBehavior])

  // Add smoothstep function for better easing
  const smoothstep = (min: number, max: number, value: number): number => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
    return x * x * (3 - 2 * x)
  }

  useEffect(() => {
    if (innioBehavior.state === InnioState.WANDER) {
      if (headRef.current) {
        wanderTargetRef.current.copy(headRef.current.position)
        nextWanderTargetRef.current.set(0, 0, 0)
        targetTransitionRef.current = 0
        lastWanderUpdateRef.current = 0
        setWanderTargetState(headRef.current.position.clone())
      }
      setCurrentBehavior(InnioState.WANDER)
    }
  }, [innioBehavior.state])

  // Add cleanup in useEffect for the vector pool and other resources
  useEffect(() => {
    return () => {
      // Clear any remaining vectors in tempVec refs
      tempVec1.set(0, 0, 0);
      tempVec2.set(0, 0, 0);
      tempVec3.set(0, 0, 0);
      
      // Clear all timeouts to prevent memory leaks
      const highestId = window.setTimeout(() => {}, 0);
      for (let i = 0; i < highestId; i++) {
        window.clearTimeout(i);
      }
    };
  }, []);

  // Create pre-computed colors
  const tailColors = useMemo(() => {
    const colors = [];
    for (let i = 0; i < MAX_LENGTH; i++) {
      const segProgress = i / MAX_LENGTH;
      const color = new THREE.Color();
      color.setHSL(0.53, 0.67, 0.9 - (segProgress * 0.05));
      colors.push(color);
    }
    return colors;
  }, []);

  // First, create a color for the head that matches the first tail segment
  // but with RGB values above 1.0 to ensure bloom
  const headColor = useMemo(() => {
    // Create a color in the same purple/lavender family as the tail
    // This uses the same HSL as the tail start but converts to RGB with higher values
    const color = new THREE.Color();
    color.setHSL(0.53, 0.87, 0.9); // Same HSL as tail start
    
    // Scale RGB values to exceed bloom threshold
    return new THREE.Color(
      color.r * 4.0, 
      color.g * 4.0, 
      color.b * 4.0
    );
  }, []);

  // Add useDevice hook to detect mobile
  const { isMobileDevice } = useDevice()
  
  // Add state for tracking long press
  const [pressStartTime, setPressStartTime] = useState<number | null>(null)
  const [pressPosition, setPressPosition] = useState<THREE.Vector3 | null>(null)

  // Function to handle feeding the innio and create ripple
  const handleFeedInnio = (position: THREE.Vector3) => {
    if (foodQueue.length > 10) return;
    
    const pt = position.clone();
    
    if (headRef.current) {
        const headWorldPos = new THREE.Vector3();
        headRef.current.getWorldPosition(headWorldPos);
        pt.y = headWorldPos.y; // Use world Y position
    } else {
        pt.y = 0; // Fallback
    }
    
    if (!foodTarget) {
      innioBehavior.setFoodTarget(pt);
      setFoodTarget(pt); // Update React state for food target
    } else {
      innioBehavior.targetQueue.push(pt);
      setFoodQueue(prev => [...prev, pt]); // Update React state for queue
    }
    createRippleEffect(pt);
  }

  // Function to create and manage a single ripple effect
  const createRippleEffect = (position: THREE.Vector3) => {
    const geometry = new THREE.CircleGeometry(RIPPLE_INITIAL_SCALE, 32); // Start small
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, // White ripple
      transparent: true,
      opacity: RIPPLE_INITIAL_OPACITY,
      side: THREE.DoubleSide // Make sure it's visible from below if needed
    });
    
    const rippleMesh = new THREE.Mesh(geometry, material);
    rippleMesh.position.copy(position);
    rippleMesh.position.y += 0.01; // Slightly above ground
    rippleMesh.rotation.x = -Math.PI / 2; // Lay flat on the ground
    
    // Add to scene immediately
    scene.add(rippleMesh);
    
    // Add to our list for animation in useFrame
    activeRipples.current.push({
      mesh: rippleMesh,
      startTime: performance.now(),
      duration: RIPPLE_DURATION,
    });
  };

  // Inside Innio component:
  const lastPointerDownRef = useRef<{ time: number; point: THREE.Vector3 | null }>({ time: 0, point: null });
  const lastFeedTapTimeRef = useRef<number>(0);
  const foodCountRef = useRef(0);
  const [, setForceRender] = useState(0);

  // Add audio listener ref
  const audioListener = useRef<THREE.AudioListener | null>(null);

  // Initialize audio listener
  useEffect(() => {
    if (headRef.current) {
      audioListener.current = new THREE.AudioListener();
      headRef.current.add(audioListener.current);
    }
    return () => {
      if (audioListener.current && headRef.current) {
        headRef.current.remove(audioListener.current);
      }
    };
  }, []);

  return (
    <InnioMessageContext.Provider value={{ setInnioMessage }}>
      
      {/* Add AmbientAudio component */}
      <AmbientAudio 
        listenerPosition={headRef.current?.position || new THREE.Vector3()}
        radius={12}
        numSources={3}
        debug={false}
        
        audioListener={audioListener.current}
      />

      {/* Move Bloom inside a group with just the Innio elements */}
      <group>
        <EffectComposer enabled={true}>
          <Bloom 
            intensity={2.0}
            luminanceThreshold={1.0}
            luminanceSmoothing={1.3}   // Increased for softer edges
            mipmapBlur={true}
            kernelSize={3}             // Increased for wider bloom (1-7 range)
            resolutionScale={0.5}      // Increased for better quality
          />
          
        </EffectComposer>

        {/* Ground plane for food-click detection - now with double-click and long-press */}
        <mesh
          onClick={(e) => {}}
          onDoubleClick={(e) => {
            if (!isMobileDevice) {
              handleFeedInnio(e.point)
            }
          }}
          onPointerDown={(e) => {
            lastPointerDownRef.current = { time: performance.now(), point: e.point.clone() };

            if (isMobileDevice) {
              setPressStartTime(Date.now())
              setPressPosition(e.point.clone())
            }
          }}
          onPointerUp={(e) => {
            const downDetails = lastPointerDownRef.current;
            const upTime = performance.now();

            const currentPressStartTime = pressStartTime;
            setPressStartTime(null)
            setPressPosition(null)

            if (!downDetails.point) {
                return;
            }

            const duration = upTime - downDetails.time;
            if (duration > CLICK_MAX_DURATION && !isMobileDevice) {
                lastPointerDownRef.current = { time: 0, point: null };
                return;
            }

            const dx = e.point.x - downDetails.point.x;
            const dz = e.point.z - downDetails.point.z;
            const distSq = dx * dx + dz * dz;
            if (distSq > CLICK_MOVE_THRESHOLD_SQUARED) {
                lastPointerDownRef.current = { time: 0, point: null };
                return;
            }

            lastPointerDownRef.current = { time: 0, point: null };

            if (!isMobileDevice) {
                const timeSinceLastTap = upTime - lastFeedTapTimeRef.current;
                if (timeSinceLastTap < DOUBLE_CLICK_TIME_THRESHOLD) {
                    handleFeedInnio(e.point);
                    lastFeedTapTimeRef.current = 0;
                } else {
                    lastFeedTapTimeRef.current = upTime;
                }
            } else if (pressStartTime && Date.now() - pressStartTime > LONG_PRESS_THRESHOLD) {
              handleFeedInnio(downDetails.point);
            }
            setPressStartTime(null);
          }}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
             if (pressPosition && pressPosition.distanceTo(e.point) > 0.5 * SCALE_FACTOR) {
                setPressStartTime(null)
                setPressPosition(null)
             }
           }}
           onPointerLeave={() => {
             setPressStartTime(null)
             setPressPosition(null)
             lastPointerDownRef.current = { time: 0, point: null };
           }}
          position={[0, -0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>

        <group>
          {/* Innio Head with added pointer events for speech interaction */}
          <a.mesh 
            ref={headRef}
            onPointerDown={handleInnioClick}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'default'}
            scale-x={headSpring.scale.to(s => s * 1.2)}
            scale-y={headSpring.scale.to(s => s * 0.85)}
            scale-z={headSpring.scale}
          >
            <sphereGeometry args={[0.05 * SCALE_FACTOR, 16, 16]} />
            <meshToonMaterial 
              color="#1A237E"
              emissive={headColor}
              emissiveIntensity={0.8}
              toneMapped={false}
              gradientMap={gradientMap}
            />
            {(innioBehavior.state === InnioState.TALK) && (
              <Html
                position={[0, 0.5 * SCALE_FACTOR, 0]}
                transform
                distanceFactor={7 * SCALE_FACTOR}
                sprite={true}
              >
                <div className="min-w-[240px] max-w-[240px] flex text-white/70 px-3 pb-6 border-l-2 border-white/5 font-mono font-semibold text-xs" 
                     style={{ 
                       backgroundColor: 'rgba(0,0,0,0.0)',
                       position: 'relative',
                       left: '119px',
                       top: '-70px'
                     }}>
                  <div 
                    className={`flex flex-wrap gap-1 transition-opacity duration-500 ease-in-out ${isTextContainerVisible ? 'opacity-100' : 'opacity-0'}`}>
                    {displayWords.map((word, index) => (
                      <span
                        key={`${word.text}-${index}`}
                        className={`transition-opacity duration-500 ease-in-out ${
                          word.visible ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {word.text}
                      </span>
                    ))}
                  </div>
                </div>
              </Html>
            )}
          </a.mesh>

          <mesh
            ref={hitboxRef}
            onPointerDown={handleInnioClick}
          >
            <sphereGeometry args={[1.1 * SCALE_FACTOR, 16, 2]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {tailPositions.current.map((pos, idx) => {
            const segProgress = idx / tailCount;
            const taperFactor = Math.pow(1 - segProgress, 0.5);
            const baseRadius = 0.15 * SCALE_FACTOR;
            const radius = baseRadius * taperFactor * (1 - (idx + 1) / (tailCount + 2));
            const verticalScale = 0.85 - (segProgress * 0.15);
            return (
              <mesh
                key={idx}
                ref={(el) => tailRefs.current[idx] = el}
                position={pos}
                scale={[1, verticalScale, 1]}
                onPointerDown={handleInnioClick}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'default'}
              >
                <sphereGeometry args={[radius, 12, 12]} />
                <meshToonMaterial 
                  color={tailColors[idx]}
                  emissive={tailColors[idx]}
                  emissiveIntensity={2.5 - (segProgress * 1.5)}
                  toneMapped={false}
                  gradientMap={gradientMap}
                />
              </mesh>
            );
          })}
         
        </group>

        {/* Food Marker */}
        {foodTarget && (
          <mesh
            position={[foodTarget.x, foodTarget.y, foodTarget.z]}
          >
            <sphereGeometry args={[0.035 * SCALE_FACTOR, 12, 12]} />
            <meshToonMaterial 
              color="#FFFFFF"
              emissive="#FFFFFF"
              emissiveIntensity={3.2}
              toneMapped={false}
              gradientMap={gradientMap}
            />
          </mesh>
        )}
        
        {foodQueue.map((ft, idx) => (
          <mesh
            key={`food-${idx}-${ft.x}-${ft.y}-${ft.z}`}
            position={[ft.x, ft.y, ft.z]}
          >
            <sphereGeometry args={[0.035 * SCALE_FACTOR, 12, 12]} />
            <meshToonMaterial 
              color="#FFFFFF"
              emissive="#FFFFFF"
              emissiveIntensity={3.2}
              toneMapped={false}
              gradientMap={gradientMap}
            />
          </mesh>
        ))}

        {/* (Optional) Wander Target Marker */}
        {innioBehavior.state === InnioState.WANDER && (
          <Html
            position={[wanderTargetState.x, wanderTargetState.y, wanderTargetState.z]}
            style={{ pointerEvents: 'none' }}
            key={`${wanderTargetState.x.toFixed(2)}-${wanderTargetState.y.toFixed(2)}-${wanderTargetState.z.toFixed(2)}`}
          >
            <div style={{
              display: 'none',
              color: '#4169E1',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: 0.8,
              transform: 'translate(-50%, -50%)'
            }}>×</div>
          </Html>
        )}
      </group>
    </InnioMessageContext.Provider>
  )
}

export default Innio 