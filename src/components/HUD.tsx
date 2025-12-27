import React, { useEffect, useState } from 'react'
import { motion, useMotionValue } from 'motion/react'
import { pondFadeSignal } from '../hooks/usePondCrossfade'
import { AuthView } from './journal/AuthView'
import { DateTimeDisplay } from './DateTimeDisplay'

export function HUD() {
  const uiOpacity = useMotionValue(1)
  const [isInteractive, setIsInteractive] = useState(true)

  useEffect(() => {
    return pondFadeSignal.subscribe((fade) => {
      // Fades OUT as we zoom in (fade goes 0 -> 1)
      const opacity = 1 - fade
      uiOpacity.set(opacity)
      
      // Disable interaction quickly as we fade out
      setIsInteractive(opacity > 0.1)
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
        pointerEvents: isInteractive ? 'auto' : 'none',
        zIndex: 2000
      }}
    >
      <div className="w-full h-full flex flex-col items-center pointer-events-none relative">
        <AuthView />
        <DateTimeDisplay isInteractive={isInteractive} />
      </div>
    </motion.div>
  )
}
