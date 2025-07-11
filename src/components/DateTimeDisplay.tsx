import React, { useState, useEffect } from 'react'
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
}

const formatDate = (date: Date): string => {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  
  const day = date.getDate()
  const dayName = days[date.getDay()]
  const month = months[date.getMonth()]
  
  return `${dayName}, ${month} ${day}`
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
    fadeClass: 'opacity-100'
  })

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
        fadeClass: shouldFade ? 'opacity-0' : 'opacity-100'
      }))
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 100) // Update frequently for smooth fading

    return () => clearInterval(interval)
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

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`text-2xl font-bold tracking-wider transition-opacity duration-1000 ${state.fadeClass}`}
        style={{ 
          fontFamily: 'AlteHaasGroteskBold, sans-serif',
          color: 'rgba(144, 144, 144, 0.35)'
        }}
      >
        {getCurrentText()}
      </div>
    </div>
  )
} 