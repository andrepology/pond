import React, { useState, useEffect } from 'react'
import { useLocation, useRoute } from 'wouter'

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
  cycle: number // 0 = date, 1 = "andre's pond"
  fadeClass: string
  promptIndex: number
  promptFadeClass: string
  displayOpacity: string
}

function getOrdinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
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
  
  return `${dayName}, ${month} ${day}${getOrdinalSuffix(day)}`
}

const PROMPTS = [
  'be and it is',
  'what am i grateful for?',
  'how is our world today?',
  'what are you observing today?',
  'what are you avoiding right now?',
  'what can i let go of?',
  'what is your inner story about yourself?',
  'what habits do i want to grow?',
  'what beliefs about self do i want to let go of?',
  'what game am i playing right now?',
]

export function DateTimeDisplay() {
  const [location] = useLocation()
  const [routeMatch] = useRoute('/item/:id')
  const [fontLoaded, setFontLoaded] = useState(false)
  const [state, setState] = useState<DateTimeState>({
    date: '',
    cycle: 0,
    fadeClass: 'opacity-100',
    promptIndex: 0,
    promptFadeClass: 'opacity-100',
    displayOpacity: 'opacity-100'
  })

  const isFocused = !!routeMatch

  // Load font on mount
  useEffect(() => {
    loadFont().then(() => setFontLoaded(true))
  }, [])

  // Handle display opacity when focusing/unfocusing
  useEffect(() => {
    setState(prev => ({
      ...prev,
      displayOpacity: isFocused ? 'opacity-0' : 'opacity-100'
    }))
  }, [isFocused])

  // Update time and cycle logic
  useEffect(() => {
    if (isFocused) return

    const TITLE_PERIOD_MS = 20000
    const TITLE_FADE_MS = 2000
    const PROMPT_PERIOD_MS = 5000
    const PROMPT_FADE_MS = 1000

    let titleFadeTimeout: number | undefined
    let promptFadeTimeout: number | undefined

    const runTitlePhase = () => {
      setState(prev => ({
        ...prev,
        date: formatDate(new Date()),
        cycle: prev.cycle === 0 ? 1 : 0,
        fadeClass: 'opacity-100'
      }))

      if (titleFadeTimeout) clearTimeout(titleFadeTimeout)
      titleFadeTimeout = window.setTimeout(() => {
        setState(prev => ({ ...prev, fadeClass: 'opacity-0' }))
      }, Math.max(0, TITLE_PERIOD_MS - TITLE_FADE_MS))
    }

    const runPromptPhase = () => {
      setState(prev => ({
        ...prev,
        promptIndex: (prev.promptIndex + 1) % PROMPTS.length,
        promptFadeClass: 'opacity-100'
      }))

      if (promptFadeTimeout) clearTimeout(promptFadeTimeout)
      promptFadeTimeout = window.setTimeout(() => {
        setState(prev => ({ ...prev, promptFadeClass: 'opacity-0' }))
      }, Math.max(0, PROMPT_PERIOD_MS - PROMPT_FADE_MS))
    }

    // Kick off immediately to avoid initial delay
    runTitlePhase()
    runPromptPhase()

    const titleInterval = window.setInterval(runTitlePhase, TITLE_PERIOD_MS)
    const promptInterval = window.setInterval(runPromptPhase, PROMPT_PERIOD_MS)

    return () => {
      clearInterval(titleInterval)
      clearInterval(promptInterval)
      if (titleFadeTimeout) clearTimeout(titleFadeTimeout)
      if (promptFadeTimeout) clearTimeout(promptFadeTimeout)
    }
  }, [isFocused])


  // Don't render if font not loaded
  if (!fontLoaded) {
    return null
  }

  const getCurrentText = () => {
    switch (state.cycle) {
      case 0:
        return state.date
      case 1:
        return "andre's pond ☼ ☽ ⚘ "
      default:
        return ''
    }
  }

  return (
    <div className={`fixed bottom-0 left-0 z-50 pointer-events-none p-10 transition-opacity duration-1000 ${state.displayOpacity}`}>
      <div
        className={`text-4xl md:text-3xl tracking-tight transition-opacity duration-1000 ${state.fadeClass}`}
        style={{
          fontFamily: 'AlteHaasGroteskBold, sans-serif',
          color: 'rgba(144, 144, 144, 0.40)'
        }}
      >
        {getCurrentText()}
      </div>
      <div
        className={`mt-0 text-lg md:text-lg tracking-wide transition-opacity duration-1000 ${state.promptFadeClass}`}
        style={{
          fontFamily: 'AlteHaasGroteskBold, sans-serif',
          color: 'rgba(144, 144, 144, 0.40)'
        }}
      >
        {PROMPTS[state.promptIndex]}
      </div>
    </div>
  )
} 