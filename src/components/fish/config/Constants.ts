export const MOVEMENT_DEFAULTS = {
  maxSpeed: 0.35,
  maxSteer: 4.0,
  slowingRadius: 2.0,
  visionDistance: 5.0,
  forwardDistance: 1.5,
  wanderRadius: 1.0,
  updateInterval: 0.8,
  arrivalThreshold: 0.3,
  bounds: { min: 30, max:30, buffer: 3 },
}

export const REST_DEFAULTS = {
  restCheckInterval: 10,
  minWanderRest: 2.5,
  maxWanderRest: 8,
}

export const PHYSICS = {
  mass: 2.5, // Increased from 1.0 for more inertia/weight
  drag: 7.5, // Increased from 4.45 for thicker water feel
}

export const SPINE = {
  segments: 12,
  segmentSpacing: 0.08,
}

export const BODY = {
  radialSegments: 24,
  taperPower: 10.0,
  flattenY: 0.5,
}


