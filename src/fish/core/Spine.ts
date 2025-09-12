import * as THREE from 'three'

export interface SpineState {
  points: THREE.Vector3[]
  spacing: number
}

export function createSpine(segments: number, spacing: number): SpineState {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < segments; i++) pts.push(new THREE.Vector3(0, -i * spacing, 0))
  return { points: pts, spacing }
}

const scratchPrev = new THREE.Vector3()
const scratchBase = new THREE.Vector3()
const scratchPerp = new THREE.Vector3()

export function updateSpineFollow(spine: SpineState, headPos: THREE.Vector3, headDir: THREE.Vector3, waveOffset: (i: number) => number) {
  scratchPrev.copy(headPos)
  for (let i = 0; i < spine.points.length; i++) {
    const spacing = spine.spacing
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


