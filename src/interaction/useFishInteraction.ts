import { useMemo, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import type { InnioClient } from '../config/types'
import { createDefaultInnioClient } from '../ai/invokeInnio'

export interface FishInteractionApi {
  onFishClick: (point?: THREE.Vector3) => Promise<void>
  isLoading: boolean
  message: string
  clearMessage: () => void
}

export function useFishInteraction(client?: InnioClient): FishInteractionApi {
  const innio = useMemo(() => client ?? createDefaultInnioClient(), [client])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const latestAbortRef = useRef<AbortController | null>(null)

  const clearMessage = useCallback(() => setMessage(''), [])

  const onFishClick = useCallback(async () => {
    if (isLoading) return
    latestAbortRef.current?.abort()
    const ac = new AbortController()
    latestAbortRef.current = ac
    setIsLoading(true)
    try {
      innio.reset()
      const resp = await innio.respond('Say something delightful about the pond.')
      if (!ac.signal.aborted) setMessage(resp)
    } finally {
      if (!ac.signal.aborted) setIsLoading(false)
    }
  }, [innio, isLoading])

  return { onFishClick, isLoading, message, clearMessage }
}


