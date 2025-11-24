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
  
  // Defer camera animation to avoid blocking React UI and Motion animations
  const deferredIsJournalDocked = useDeferredValue(isJournalDocked)

  useEffect(() => {
    const cameraControls = controls as CameraControlsImpl | null

    // Fallback to "pond" if no route match, otherwise use route param
    const active = routeMatch && params.id
      ? scene.getObjectByName(params.id)
      : scene.getObjectByName('pond')

    const isActive = !!active

    if (isActive && active) {
      // Save current camera position before moving to active item
      if (!wasActiveRef.current && cameraControls) {
        cameraControls.getPosition(savedCameraPosition.current)
      }

      // If the object is inspectable, allow closer zoom.
      const inspectable = active.userData.inspectable

      if (cameraControls) {
        cameraControls.minDistance = inspectable ? 1.0 : 5
        cameraControls.maxDistance = 20
        cameraControls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE
      }

      // Reuse existing Vector3 instance
      active.getWorldPosition(targetPositionRef.current)
      const { x, y, z } = targetPositionRef.current

      const isPond = active.name === 'pond'
      const insideMode = isPond && !markersVisible

      if (isPond && cameraControls) {
        // Shared target for both overview and inside poses
        const targetX = x
        const targetY = y
        const targetZ = z

        // Overview pose: outside and above, looking down towards pond center
        const overviewHeight = isMobileDevice() ? 7 : 8
        const overviewDistance = 4
        const overviewX = targetX
        const overviewY = targetY + overviewHeight
        const overviewZ = targetZ + overviewDistance

        // Inside pose: close to pond center, slightly above
        const insideDistance = 0.8
        const insideX = targetX
        const insideY = targetY + 0.5
        const insideZ = targetZ + insideDistance

        // Apply downward tilt when journal is undocked
        const tiltOffset = deferredIsJournalDocked ? 0 : 0.6

        if (insideMode) {
          cameraControls.setLookAt(
            insideX,
            insideY + tiltOffset,
            insideZ,
            targetX,
            targetY,
            targetZ,
            true
          )
        } else {
          // Overview mode: stay outside and above, looking down
          cameraControls.setLookAt(
            overviewX,
            overviewY + tiltOffset,
            overviewZ,
            targetX,
            targetY,
            targetZ,
            true
          )
        }
      } else {
        // Non-pond active object: simple inspectable view similar to original behavior
        const distance = 6 / Math.min(viewport.aspect < 1 ? 0.9 : viewport.aspect, 1)
        cameraControls?.setLookAt(
          x,
          y + 0.5,
          z + distance,
          x,
          y,
          z,
          true
        )
      }
    } else {
      // No active object: fall back to a simple top-down-ish overview of the origin
      if (cameraControls) {
        cameraControls.minDistance = 5
        cameraControls.maxDistance = 20
        cameraControls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE
      }

      if (wasActiveRef.current && savedCameraPosition.current.length() > 0) {
        cameraControls?.setLookAt(
          savedCameraPosition.current.x,
          savedCameraPosition.current.y,
          savedCameraPosition.current.z,
          0,
          0,
          0,
          true
        )
      } else {
        const overviewHeight = isMobileDevice() ? 7 : 8
        const tiltOffset = deferredIsJournalDocked ? 0 : -1.5
        cameraControls?.setLookAt(
          0,
          overviewHeight + tiltOffset,
          0.001,
          0,
          0,
          0,
          true
        )
      }
    }

    wasActiveRef.current = isActive
  }, [params.id, controls, scene, viewport.aspect, markersVisible, deferredIsJournalDocked])

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