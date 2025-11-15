export const MOVEMENT_DEFAULTS = {
  maxSpeed: 0.5,
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

export const SWIM_CYCLE = {
  burstMin: 0.3,
  burstMax: 0.5,
  glideMin: 0.5,
  glideMax: 1.5,
}

export const PHYSICS = {
  mass: 1.0,
  drag: 4.45,
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


