import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { useRoute } from 'wouter'
import CameraControlsImpl from 'camera-controls'
import ACTION from 'camera-controls'
import { isMobileDevice } from '../helpers/deviceDetection'


CameraControlsImpl.install({ THREE })

interface CameraRigProps {
  isJournalDocked: boolean;
}

export function CameraRig({ isJournalDocked }: CameraRigProps) {
  const { controls, scene, viewport } = useThree()
  const [routeMatch, paramsRaw] = useRoute('/item/:id')
  const params: Record<string, string> = paramsRaw || {}
  const targetPositionRef = useRef(new THREE.Vector3())
  const savedCameraPosition = useRef(new THREE.Vector3())
  const wasActiveRef = useRef(false)

  useEffect(() => {
    const cameraControls = controls as CameraControlsImpl | null
    // Fallback to "pond" if no route match, otherwise use route param
    const active = routeMatch && params.id 
      ? scene.getObjectByName(params.id) 
      : scene.getObjectByName('pond')
    const isActive = !!active

    // This factor controls how much the camera moves up when the journal is undocked.
    const verticalShiftFactor = isMobileDevice() ? -1.0 : -1.8
    const yOffset = isJournalDocked ? 0 : verticalShiftFactor

    if (isActive) {
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

      // Adjust distance based on aspect ratio
      const distance = 6 / Math.min(viewport.aspect < 1 ? 0.9 : viewport.aspect, 1)

      // Set camera to look at the object from an offset, adjusted for the sheet
      cameraControls?.setLookAt(x, y + 0.5 + yOffset, z + distance , x, y + yOffset, z, true)
    } else {
      // Reset zoom limits for the default view
      if (cameraControls) {
        cameraControls.minDistance = 5
        cameraControls.maxDistance = 20
        // not working
        cameraControls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE
      }
      
      // Restore saved position if we had one, otherwise use default
      if (wasActiveRef.current && savedCameraPosition.current.length() > 0) {
        // Restore to saved position, but adjust for sheet offset
        cameraControls?.setLookAt(
          savedCameraPosition.current.x, 
          savedCameraPosition.current.y + yOffset, 
          savedCameraPosition.current.z, 
          0, 0, 0, 
          true
        )
      } else {
        // Fallback to default position
        const distance = 10 / Math.max(viewport.aspect, 2)
        cameraControls?.setLookAt(0, 6 + yOffset, 10, 0, 0, 0, true)
      }
    }

    wasActiveRef.current = isActive
  }, [params.id, controls, scene, viewport.aspect, isJournalDocked])

  return (
    <CameraControls
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      smoothTime={0.8}
      draggingSmoothTime={0.2}
      enabled={true}
      dollySpeed={isMobileDevice ? 0.5 : 0.1}
      truckSpeed={isMobileDevice ? 0.5 : 0.1}
      
      touches={{
        one: ACTION.ACTION.TOUCH_ROTATE,
        two: ACTION.ACTION.TOUCH_ZOOM,
        three: ACTION.ACTION.NONE
      }}
      
    />
  )
} 