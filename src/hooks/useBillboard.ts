import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

interface BillboardOptions {
  damping?: number;        // ROTATION_DAMPING (0.99)
  noiseSpeed?: number;     // NOISE_SPEED (0.3)
  noiseScale?: number;     // NOISE_SCALE (0.2)
  enabled?: boolean;       // Whether billboarding is active
}

export function useBillboard(
  ref: React.RefObject<THREE.Object3D>,
  options: BillboardOptions = {}
) {
  const {
    damping = 0.99,
    noiseSpeed = 0.3,
    noiseScale = 0.2,
    enabled = true
  } = options

  const { camera } = useThree()

  // Refs for billboard calculations
  const currentQuaternion = useRef(new THREE.Quaternion())
  const targetQuaternion = useRef(new THREE.Quaternion())
  const targetMatrix = useRef(new THREE.Matrix4())
  const noiseTimeRef = useRef(0)

  // Reusable vectors to avoid allocations
  const centerPos = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const groupWorldPos = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    if (!ref.current || !enabled) return

    noiseTimeRef.current += delta * noiseSpeed
    ref.current.getWorldPosition(groupWorldPos)

    direction.subVectors(camera.position, groupWorldPos).normalize()
    direction.x += Math.sin(noiseTimeRef.current * 0.9) * noiseScale
    direction.y += Math.cos(noiseTimeRef.current * 0.7) * noiseScale
    direction.normalize()

    targetMatrix.current.lookAt(direction, centerPos, new THREE.Vector3(0, 1, 0))
    targetQuaternion.current.setFromRotationMatrix(targetMatrix.current)
    currentQuaternion.current.slerp(targetQuaternion.current, 1 - damping)
    ref.current.quaternion.copy(currentQuaternion.current)
  })
}
