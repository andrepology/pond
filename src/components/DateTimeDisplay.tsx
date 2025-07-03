import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'wouter'

// Font loading - same pattern as focusable.tsx
const loadFont = () => {
  return new Promise<void>((resolve) => {
    const font = new FontFace('AlteHaasGroteskBold', 'url(/fonts/AlteHaasGroteskBold.ttf)')
    font.load().then(() => {
      document.fonts.add(font)
      resolve()
    })
  })
}

interface DateTimeState {
  date: string
  time: string
  cycle: number // 0 = date, 1 = "andre's pond"
  fadeClass: string
  hours: number
  minutes: number
}

const formatDate = (date: Date): string => {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  
  const day = date.getDate()
  const month = months[date.getMonth()]
  
  // Add ordinal suffix
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }
  
  return `${month} ${day}${getOrdinal(day)}`
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }).toLowerCase()
}

export function DateTimeDisplay() {
  const [location] = useLocation()
  const [fontLoaded, setFontLoaded] = useState(false)
  const [state, setState] = useState<DateTimeState>({
    date: '',
    time: '',
    cycle: 0,
    fadeClass: 'opacity-100',
    hours: 0,
    minutes: 0
  })
  
  const intervalRef = useRef<number | undefined>(undefined)

  // Load font on mount
  useEffect(() => {
    loadFont().then(() => setFontLoaded(true))
  }, [])

  // Update time and cycle logic
  useEffect(() => {
    if (location !== '/') return

         const updateDateTime = () => {
       const now = new Date()
       const seconds = now.getSeconds()
       
       // Deterministic cycle: each phase lasts 10 seconds
       // 0-9s: date, 10-19s: "andre's pond", 20-29s: date, etc.
       const cyclePosition = Math.floor(seconds / 10) % 2
       
       // Fade transition: last 2 seconds of each phase
       const shouldFade = (seconds % 10) >= 8
      
             setState(prev => ({
         date: formatDate(now),
         time: formatTime(now),
         cycle: cyclePosition,
         fadeClass: shouldFade ? 'opacity-0' : 'opacity-100',
         hours: now.getHours(),
         minutes: now.getMinutes()
       }))
    }

    updateDateTime()
    intervalRef.current = setInterval(updateDateTime, 100) // Update frequently for smooth fading

    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current)
      }
    }
  }, [location])

  // Don't render if not at root or font not loaded
  if (location !== '/' || !fontLoaded) {
    return null
  }

  const getCurrentText = () => {
    switch (state.cycle) {
      case 0:
        return state.date
      case 1:
        return "andre's pond"
      default:
        return ''
    }
  }

  const getClockArmRotation = (value: number, max: number) => {
    return (value / max) * 360 - 90 // -90 to start at 12 o'clock
  }

  const hourAngle = getClockArmRotation(state.hours % 12, 12)
  const minuteAngle = getClockArmRotation(state.minutes, 60)

    return (
    <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="relative flex items-center justify-center">
        {/* Text display - centered with fixed width */}
        <div 
          className="relative backdrop-blur-sm bg-black/3 rounded-full px-8 py-4 w-80 text-center"
          style={{ zIndex: 15 }}
        >
          <div
            className={`text-2xl font-bold transition-opacity duration-1000 ${state.fadeClass}`}
            style={{ 
              fontFamily: 'AlteHaasGroteskBold, sans-serif',
              color: 'rgba(184, 184, 184, 0.9)'
            }}
          >
            {getCurrentText()}
          </div>
        </div>
        
        {/* Clock - positioned to the right */}
        <div className="absolute left-full ml-8 top-1/2 transform -translate-y-1/2">
          <div className="relative w-16 h-16 backdrop-blur-sm bg-black/3 rounded-full flex items-center justify-center">
            {/* Hour arm */}
            <div 
              className="absolute rounded-full"
              style={{
                backgroundColor: 'rgba(204, 204, 204, 0.7)',
                width: '3px',
                height: '18px',
                transform: `rotate(${hourAngle}deg)`,
                transformOrigin: 'bottom center',
                top: 'calc(50% - 18px)',
                left: '50%',
                marginLeft: '-1.5px',
                zIndex: 5
              }}
            />
            
            {/* Minute arm */}
            <div 
              className="absolute rounded-full"
              style={{
                backgroundColor: 'rgba(204, 204, 204, 0.7)',
                width: '2px',
                height: '25px',
                transform: `rotate(${minuteAngle}deg)`,
                transformOrigin: 'bottom center',
                top: 'calc(50% - 25px)',
                left: '50%',
                marginLeft: '-1px',
                zIndex: 5
              }}
            />
            
            {/* Center dot */}
            <div 
              className="absolute rounded-full"
              style={{
                backgroundColor: 'rgba(204, 204, 204, 0.8)',
                width: '4px',
                height: '4px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 