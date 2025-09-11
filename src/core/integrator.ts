import * as THREE from 'three'

export interface PhysicsParams {
  mass: number
  drag: number
}

export function applyForce(velocity: THREE.Vector3, force: THREE.Vector3, dt: number, params: PhysicsParams) {
  const acceleration = force.clone().divideScalar(params.mass)
  velocity.addScaledVector(acceleration, dt)
}

export function applyDrag(velocity: THREE.Vector3, dt: number, params: PhysicsParams) {
  const drag = velocity.clone().multiplyScalar(-params.drag)
  velocity.addScaledVector(drag, dt)
}

export function clampSpeed(velocity: THREE.Vector3, minSpeed: number, maxSpeed: number) {
  const len = velocity.length()
  if (len < minSpeed && len > 1e-6) velocity.setLength(minSpeed)
  else if (len > maxSpeed) velocity.setLength(maxSpeed)
}


