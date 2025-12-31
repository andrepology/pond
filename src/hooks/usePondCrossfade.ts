import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { computeFade, classifyRegion, type CrossfadeRegion } from '../helpers/fade'
import { signal } from '@preact/signals-core'
import CameraControlsImpl from 'camera-controls'

// Global signal for UI components outside the Canvas to consume
export const pondFadeSignal = signal(0)

// Global signal to track if the user has interacted with the scene
export const userInteractedSignal = signal(false)

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

  // Listen for user interaction on the controls
  useEffect(() => {
    const cameraControls = controls as unknown as CameraControlsImpl
    if (!cameraControls) return

    const handleInteraction = () => {
      if (!userInteractedSignal.value) {
        const currentAction = (cameraControls as any).currentAction
        
        // As determined by debugging: Action 0 is Zoom
        if (currentAction === 0) {
           userInteractedSignal.value = true
        }
      }
    }

    cameraControls.addEventListener?.('control', handleInteraction)
    
    return () => {
      cameraControls.removeEventListener?.('control', handleInteraction)
    }
  }, [controls])

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
