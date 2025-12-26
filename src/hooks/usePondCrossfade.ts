import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { computeFade, classifyRegion, type CrossfadeRegion } from '../helpers/fade'
import { signal } from '@preact/signals-core'

// Global signal for UI components outside the Canvas to consume
export const pondFadeSignal = signal(0)

interface CrossfadeConfig {
  start: number
  end: number
  hysteresis?: number
}

interface UsePondCrossfadeReturn {
  fade: number
  region: CrossfadeRegion
}

export function usePondCrossfade(config: CrossfadeConfig): UsePondCrossfadeReturn {
  const { controls } = useThree()
  const [fade, setFade] = useState(0)
  const [region, setRegion] = useState<CrossfadeRegion>('outside')
  const lastTsRef = useRef(0)

  const { start, end, hysteresis = 0.02 } = config

  useFrame(() => {
    const now = performance.now()
    if (now - lastTsRef.current < 1000 / 60) return
    lastTsRef.current = now

    const cameraControls = controls as unknown as { distance?: number } | null
    const d = cameraControls?.distance ?? 0
    const f = computeFade(d, { start, end })

    setFade(f)
    setRegion(classifyRegion(d, { start, end, hysteresis }))

    // Sync to global signal for zero-re-render UI updates
    if (pondFadeSignal.value !== f) {
      pondFadeSignal.value = f
    }
  })

  return {
    fade,
    region
  }
}
