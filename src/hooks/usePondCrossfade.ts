import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { computeFade, classifyRegion, type CrossfadeRegion } from '../helpers/fade'

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

    setFade(computeFade(d, { start, end }))
    setRegion(classifyRegion(d, { start, end, hysteresis }))
  })

  return {
    fade,
    region
  }
}
