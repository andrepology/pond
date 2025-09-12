import * as THREE from 'three'

export interface VectorPool {
  get(): THREE.Vector3
  release(v: THREE.Vector3): void
  size(): number
  createdCount(): number
}

export function createVectorPool(initial = 64, max = 256): VectorPool {
  const pool: THREE.Vector3[] = []
  for (let i = 0; i < initial; i++) pool.push(new THREE.Vector3())
  const created = { count: 0 }
  return {
    get() {
      if (pool.length === 0) {
        created.count++
        return new THREE.Vector3()
      }
      return pool.pop()!
    },
    release(v) {
      if (pool.length < max) {
        v.set(0, 0, 0)
        pool.push(v)
      }
    },
    size() { return pool.length },
    createdCount() { return created.count },
  }
}


