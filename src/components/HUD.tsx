import React, { useEffect } from 'react'
import { motion, useMotionValue } from 'motion/react'
import { pondFadeSignal } from '../hooks/usePondCrossfade'
import { AuthView } from './journal/AuthView'
import { DateTimeDisplay } from './DateTimeDisplay'

export function HUD() {
  const uiOpacity = useMotionValue(1)

  useEffect(() => {
    return pondFadeSignal.subscribe((fade) => {
      // Fades OUT as we zoom in (fade goes 0 -> 1)
      uiOpacity.set(1 - fade)
    })
  }, [uiOpacity])

  return (
    <motion.div 
      style={{ 
        opacity: uiOpacity,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 2000
      }}
    >
      <AuthView />
      <DateTimeDisplay />
    </motion.div>
  )
}
