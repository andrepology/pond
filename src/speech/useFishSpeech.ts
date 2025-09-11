import { useEffect, useMemo, useRef, useState } from 'react'

export interface WordItem { text: string; visible: boolean }

export interface FishSpeechApi {
  words: WordItem[]
  isVisible: boolean
  setMessage: (m: string) => void
  clear: () => void
}

export function useFishSpeech(): FishSpeechApi {
  const [message, setMessage] = useState('')
  const [words, setWords] = useState<WordItem[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const timeouts = useRef<number[]>([])
  const punctuationPause = 300

  const clear = () => {
    timeouts.current.forEach((id) => window.clearTimeout(id))
    timeouts.current = []
    setWords([])
    setIsVisible(false)
  }

  useEffect(() => {
    clear()
    if (!message) return
    const tokens = message.split(' ')
    const initial = tokens.map((t) => ({ text: t, visible: false }))
    setWords(initial)
    const startId = window.setTimeout(() => setIsVisible(true), 30)
    timeouts.current.push(startId)
    let delay = 0
    tokens.forEach((t, idx) => {
      const base = 180
      const random = Math.random() * 80
      const punct = /[.!?;,]$/.test(t) ? punctuationPause : 0
      delay += base + random + punct
      const id = window.setTimeout(() => {
        setWords((prev) => prev.map((w, i) => (i === idx ? { ...w, visible: true } : w)))
      }, delay)
      timeouts.current.push(id)
    })
    const endId = window.setTimeout(() => setIsVisible(false), delay + 5000)
    timeouts.current.push(endId)
    return clear
  }, [message])

  return { words, isVisible, setMessage, clear }
}


