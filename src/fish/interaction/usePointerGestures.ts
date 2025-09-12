import { useRef, useCallback } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type * as THREE from 'three'

export interface PointerGesturesProps {
  isMobile: boolean
  onDoubleTap: (point: THREE.Vector3) => void
  onLongPress: (point: THREE.Vector3) => void
}

export function usePointerGestures({ isMobile, onDoubleTap, onLongPress }: PointerGesturesProps) {
  const lastPointerDownRef = useRef<{ time: number; point: THREE.Vector3 | null }>({ time: 0, point: null })
  const lastTapTimeRef = useRef(0)
  const pressStartRef = useRef<number | null>(null)
  const pressPosRef = useRef<THREE.Vector3 | null>(null)

  const DOUBLE_CLICK_TIME = 400
  const CLICK_MAX_DURATION = 300
  const LONG_PRESS_THRESHOLD = 700
  const MOVE_THRESH_SQ = 25

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    lastPointerDownRef.current = { time: performance.now(), point: e.point.clone() }
    if (isMobile) {
      pressStartRef.current = Date.now()
      pressPosRef.current = e.point.clone()
    }
  }, [isMobile])

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    const down = lastPointerDownRef.current
    const upTime = performance.now()
    const pressStart = pressStartRef.current
    pressStartRef.current = null
    pressPosRef.current = null
    lastPointerDownRef.current = { time: 0, point: null }

    if (!down.point) return
    const duration = upTime - down.time
    if (duration > CLICK_MAX_DURATION && !isMobile) return

    const dx = e.point.x - down.point.x
    const dy = e.point.y - down.point.y
    const dz = e.point.z - down.point.z
    const distSq = dx * dx + dy * dy + dz * dz
    if (distSq > MOVE_THRESH_SQ) return

    if (!isMobile) {
      const since = upTime - lastTapTimeRef.current
      if (since < DOUBLE_CLICK_TIME) {
        onDoubleTap(e.point)
        lastTapTimeRef.current = 0
      } else {
        lastTapTimeRef.current = upTime
      }
    } else {
      if (pressStart && Date.now() - pressStart > LONG_PRESS_THRESHOLD) {
        onLongPress(down.point)
      }
    }
  }, [isMobile, onDoubleTap, onLongPress])

  const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (pressPosRef.current && pressPosRef.current.distanceTo(e.point) > 0.5) {
      pressStartRef.current = null
      pressPosRef.current = null
    }
  }, [])

  const onPointerLeave = useCallback(() => {
    pressStartRef.current = null
    pressPosRef.current = null
    lastPointerDownRef.current = { time: 0, point: null }
  }, [])

  return { onPointerDown, onPointerUp, onPointerMove, onPointerLeave }
}


