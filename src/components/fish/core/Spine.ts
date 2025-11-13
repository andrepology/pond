import * as THREE from 'three'

export interface SpineState {
  points: THREE.Vector3[]
  spacing: number
  falloff: number
}

export function createSpine(segments: number, spacing: number, falloff = 1.15): SpineState {
  const pts: THREE.Vector3[] = []
  // Use exponentially decreasing spacing so segments bunch toward the tail.
  // spacing is the base (head) spacing and decays along the spine.
  let accumulated = 0
  for (let i = 0; i < segments; i++) {
    pts.push(new THREE.Vector3(0, -accumulated, 0))
    const segmentSpacing = getSegmentSpacing(i, segments, spacing, falloff)
    accumulated += segmentSpacing
  }
  return { points: pts, spacing, falloff }
}

// Exponential falloff for per-segment spacing: head wide, tail dense.
function getSegmentSpacing(index: number, totalSegments: number, baseSpacing: number, falloff: number): number {
  if (totalSegments <= 1) return baseSpacing
  const t = index / (totalSegments - 1) // 0 at head, 1 at tail
  const factor = Math.exp(-falloff * t)
  return baseSpacing * factor
}

const scratchPrev = new THREE.Vector3()
const scratchBase = new THREE.Vector3()
const scratchPerp = new THREE.Vector3()

export function updateSpineFollow(spine: SpineState, headPos: THREE.Vector3, headDir: THREE.Vector3, waveOffset: (i: number) => number) {
  scratchPrev.copy(headPos)
  for (let i = 0; i < spine.points.length; i++) {
    const spacing = getSegmentSpacing(i, spine.points.length, spine.spacing, spine.falloff)
    scratchBase.copy(scratchPrev).addScaledVector(headDir, -spacing)
    scratchPerp.set(-headDir.z, 0, headDir.x)
    scratchBase.addScaledVector(scratchPerp, waveOffset(i))
    const cur = spine.points[i]
    cur.lerp(scratchBase, 0.05)
    const dist = cur.distanceTo(scratchPrev)
    if (dist > spacing) cur.sub(scratchPrev).setLength(spacing).add(scratchPrev)
    scratchPrev.copy(cur)
  }
}


