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

export function updateSpineFollow(spine: SpineState, headPos: THREE.Vector3, headDir: THREE.Vector3, waveOffset: (i: number) => number) {
  const prev = new THREE.Vector3().copy(headPos)
  const perp = new THREE.Vector3()
  for (let i = 0; i < spine.points.length; i++) {
    const spacing = spine.spacing
    const base = prev.clone().addScaledVector(headDir, -spacing)
    perp.set(-headDir.z, 0, headDir.x)
    base.addScaledVector(perp, waveOffset(i))
    const cur = spine.points[i]
    cur.lerp(base, 0.05)
    const dist = cur.distanceTo(prev)
    if (dist > spacing) cur.sub(prev).setLength(spacing).add(prev)
    prev.copy(cur)
  }
}


