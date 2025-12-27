import * as THREE from 'three'
import { useEffect, useRef, useDeferredValue } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { useRoute } from 'wouter'
import CameraControlsImpl from 'camera-controls'
import ACTION from 'camera-controls'
import { isMobileDevice } from '../helpers/deviceDetection'

CameraControlsImpl.install({ THREE })

interface CameraRigProps {
  markersVisible: boolean;
  isJournalDocked: boolean;
}

export function CameraRig({ markersVisible, isJournalDocked }: CameraRigProps) {
  const { controls, scene, viewport } = useThree()
  const [routeMatch, paramsRaw] = useRoute('/item/:id')
  const params: Record<string, string> = paramsRaw || {}
  const targetPositionRef = useRef(new THREE.Vector3())
  const savedCameraPosition = useRef(new THREE.Vector3())
  const wasActiveRef = useRef(false)
  const hasLandedRef = useRef(false)
  
  const deferredIsJournalDocked = useDeferredValue(isJournalDocked)

  useEffect(() => {
    const cameraControls = controls as CameraControlsImpl | null
    if (!cameraControls) return

    const active = routeMatch && params.id
      ? scene.getObjectByName(params.id)
      : scene.getObjectByName('pond')

    const isActive = !!active

    if (isActive && active) {
      if (!wasActiveRef.current) {
        cameraControls.getPosition(savedCameraPosition.current)
      }

      const inspectable = active.userData.inspectable
      cameraControls.minDistance = inspectable ? 1.0 : 5
      cameraControls.maxDistance = 20
      cameraControls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE

      const currentAzimuth = cameraControls.azimuthAngle ?? 0
      active.getWorldPosition(targetPositionRef.current)
      const { x, y, z } = targetPositionRef.current

      // Align the camera's internal target with the pond instantly on first load
      // This prevents the "spiral" by ensuring we're already looking straight down 
      // at the correct point before the dolly-in begins.
      if (!hasLandedRef.current) {
        cameraControls.setLookAt(x, 20, z, x, y, z, false)
      }

      const isPond = active.name === 'pond'
      
      // Forced overview on first load, then respect markersVisible for dive-in
      const isOverview = !hasLandedRef.current || markersVisible
      const insideMode = isPond && !isOverview

      const tiltOffset = deferredIsJournalDocked ? 0 : 0.6

      if (isPond) {
        if (insideMode) {
          // Inside pose: close to pond center, slightly above
          const insideDistance = 0.4
          cameraControls.setLookAt(
            x + Math.sin(currentAzimuth) * insideDistance,
            y + 0.5 + tiltOffset,
            z + Math.cos(currentAzimuth) * insideDistance,
            x, y, z,
            true
          )
        } else {
          // Overview pose: directly overhead, dolly in to standard height
          const overviewHeight = isMobileDevice() ? 12 : 8
          cameraControls.setLookAt(
            x, y + overviewHeight + tiltOffset, z,
            x, y, z,
            true
          )
        }
      } else {
        const distance = 6 / Math.min(viewport.aspect < 1 ? 0.9 : viewport.aspect, 1)
        cameraControls.setLookAt(
          x + Math.sin(currentAzimuth) * distance,
          y + 0.5,
          z + Math.cos(currentAzimuth) * distance,
          x, y, z,
          true
        )
      }
      
      hasLandedRef.current = true
    } else {
      cameraControls.minDistance = 5
      cameraControls.maxDistance = 20
      
      if (wasActiveRef.current && savedCameraPosition.current.length() > 0) {
        cameraControls.setLookAt(
          savedCameraPosition.current.x,
          savedCameraPosition.current.y,
          savedCameraPosition.current.z,
          0, 0, 0,
          true
        )
      } else {
        const overviewHeight = isMobileDevice() ? 12 : 8
        const tiltOffset = deferredIsJournalDocked ? 0 : 0.6
        cameraControls.setLookAt(
          0, 2.0 + overviewHeight + tiltOffset, -3,
          0, 2.0, -3,
          true
        )
      }
    }

    wasActiveRef.current = isActive
  }, [params.id, controls, scene, markersVisible, deferredIsJournalDocked])

  return (
    <CameraControls
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      smoothTime={1.2}
      draggingSmoothTime={0.2}
      enabled={true}
      dollySpeed={isMobileDevice() ? 0.6 : 0.5}
      truckSpeed={isMobileDevice() ? 0.6 : 0.5}
      touches={{
        one: ACTION.ACTION.TOUCH_ROTATE,
        two: ACTION.ACTION.TOUCH_DOLLY,
        three: ACTION.ACTION.NONE
      }}
    />
  )
}
