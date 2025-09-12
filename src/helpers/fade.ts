export interface CrossfadeConfig {
  start: number
  end: number
  hysteresis?: number // extra band around thresholds for stable flags
}

export type CrossfadeRegion = 'inside' | 'outside' | 'transition'

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function computeFade(distance: number, { start, end }: CrossfadeConfig): number {
  return 1 - smoothstep(start, end, distance)
}

export function classifyRegion(distance: number, { start, end, hysteresis = 0 }: CrossfadeConfig): CrossfadeRegion {
  const startIn = start - hysteresis
  const endOut = end + hysteresis
  if (distance <= startIn) return 'inside'
  if (distance >= endOut) return 'outside'
  return 'transition'
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}


