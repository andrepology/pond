import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { useRoute } from 'wouter'
import CameraControlsImpl from 'camera-controls'

CameraControlsImpl.install({ THREE })

interface CameraRigProps {
  sheetPercentage: number;
}

export function CameraRig({ sheetPercentage }: CameraRigProps) {
  const { controls, scene, viewport } = useThree()
  const [routeMatch, paramsRaw] = useRoute('/item/:id')
  const params: Record<string, string> = paramsRaw || {}
  const targetPositionRef = useRef(new THREE.Vector3())

  useEffect(() => {
    const cameraControls = controls as CameraControlsImpl | null
    const active = routeMatch && params.id ? scene.getObjectByName(params.id) : null

    // This factor controls how much the camera moves up when the sheet is open.
    const verticalShiftFactor = -2
    const yOffset = sheetPercentage * verticalShiftFactor

    if (active) {
      // If the object is inspectable, allow closer zoom.
      const inspectable = active.userData.inspectable
      
      if (cameraControls) {
        cameraControls.minDistance = inspectable ? 0.01 : 5
        cameraControls.maxDistance = 20
        cameraControls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE
      }

      // Reuse existing Vector3 instance
      active.getWorldPosition(targetPositionRef.current)
      const { x, y, z } = targetPositionRef.current

      // Adjust distance based on aspect ratio
      const distance = 6 / Math.min(viewport.aspect < 1 ? 0.9 : viewport.aspect, 1)
      console.log(distance, viewport.aspect)

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
      // Adjust distance for the default view, adjusted for the sheet
      const distance = 10 / Math.max(viewport.aspect, 2)
      cameraControls?.setLookAt(0, 6, 10, 0, 0, 0, true)
    }
  }, [params.id, controls, scene, viewport.aspect, sheetPercentage])

  return (
    <CameraControls
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      smoothTime={0.4}
      draggingSmoothTime={0.2}
    />
  )
} 