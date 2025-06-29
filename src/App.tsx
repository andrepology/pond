import * as THREE from 'three'
import { useEffect, useState, Suspense, forwardRef, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useCursor, CameraControls, Text, Preload, AccumulativeShadows, RandomizedLight, Sphere as DreiSphere, Environment, Billboard, Box, Center } from '@react-three/drei'
import { useRoute, useLocation } from 'wouter'
import { suspend } from 'suspend-react'
import CameraControlsImpl from 'camera-controls'
import React, { type CSSProperties } from 'react'
import { Sheet } from './Sheet'
import { Controls } from './Controls'

type FontModule = { default: string }

const regular = import('@pmndrs/assets/fonts/inter_regular.woff') as Promise<FontModule>
const medium = import('@pmndrs/assets/fonts/inter_bold.woff') as Promise<FontModule>

// Pre-create reusable materials for better performance
const MATERIALS = {
  dodgerblue: new THREE.MeshStandardMaterial({ color: 'dodgerblue' }),
  indianred: new THREE.MeshStandardMaterial({ color: 'indianred' }),
  limegreen: new THREE.MeshStandardMaterial({ color: 'limegreen' }),
  hotpink: new THREE.MeshStandardMaterial({ color: 'hotpink' })
}

export default function App() {
  const [sheetPercentage, setSheetPercentage] = useState(0)

  return (
    <>
      <Canvas shadows camera={{ position: [0, 5, 12], fov: 35 }} eventSource={document.getElementById('root')!} eventPrefix="client">
        {/* Background and Environment */}
        <color attach="background" args={['#f0f0f0']} />
        <Environment preset="city" />

        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

        {/* Main Scene Content */}
        <group position={[0, -0.5, 0]}>
          <Focusable id="01" name="Sphere A" position={[-2, 1, 0]}>
            <InteractiveSphere color="dodgerblue" />
          </Focusable>
          <Focusable id="02" name="Box B" position={[0, 1, -2]}>
            <InteractiveBox color="indianred" />
          </Focusable>
          <Focusable id="03" name="Sphere C" position={[2, 1, 0]}>
            <InteractiveSphere color="limegreen" />
          </Focusable>
          
          {/* Shadows and Ground */}
          <AccumulativeShadows temporal frames={60} scale={15}>
            <RandomizedLight amount={8} position={[5, 5, -10]} />
          </AccumulativeShadows>
        </group>

        <Rig sheetPercentage={sheetPercentage} />
        <Preload all />
      </Canvas>
      <Sheet sheetPercentage={sheetPercentage} />
      <Controls onPercentageChange={setSheetPercentage} />
    </>
  )
}

const buttonStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.9)',
  border: 'none',
  color: '#333',
  padding: '8px 16px',
  borderRadius: '99px',
  cursor: 'pointer',
  fontFamily: 'sans-serif',
  fontWeight: 'bold',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
}

interface FocusableProps {
  id: string;
  name: string;
  children: React.ReactElement<InteractiveProps>;
  position: [number, number, number];
}

function Focusable({ id, name, children, ...props }: FocusableProps) {
  const [, setLocation] = useLocation()
  const [hovered, hover] = useState(false)
  const [labelY, setLabelY] = useState(1.2)
  const [, params] = useRoute('/item/:id')
  const active = params?.id === id
  useCursor(hovered)

  const handleCentered = ({ boundingBox }: { boundingBox: THREE.Box3 }) => {
    const height = boundingBox.max.y - boundingBox.min.y
    setLabelY(height / 2 + 0.2) // 0.2 offset from the top
  }

  return (
    <group {...props}>
      <Center
        name={id}
        onCentered={handleCentered}
        onDoubleClick={(e) => (e.stopPropagation(), setLocation('/item/' + id))}
        onPointerOver={(e) => (e.stopPropagation(), hover(true))}
        onPointerOut={(e) => (e.stopPropagation(), hover(false))}>
        {/* Pass hover and active state to children */}
        {React.cloneElement(children, { hovered, active })}
      </Center>
      {(hovered || active) && (
        <Billboard>
          <Suspense fallback={null}>
            <Text
              font={(suspend(medium) as FontModule).default}
              fontSize={0.25}
              anchorY="bottom"
              position={[0, labelY, 0]}
              material-toneMapped={false}>
              {name}
            </Text>
            <Text
              font={(suspend(regular) as FontModule).default}
              fontSize={0.1}
              anchorY="top"
              position={[0, labelY, 0]}
              material-toneMapped={false}>
              /{id}
            </Text>
          </Suspense>
        </Billboard>
      )}
    </group>
  )
}

const InteractiveSphere = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const material = useMemo(() => {
    if (hovered || active) return MATERIALS.hotpink
    return MATERIALS[color as keyof typeof MATERIALS] || new THREE.MeshStandardMaterial({ color })
  }, [color, hovered, active])

  return (
    <DreiSphere {...props} ref={ref} castShadow material={material} />
  )
});

const InteractiveBox = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const material = useMemo(() => {
    if (hovered || active) return MATERIALS.hotpink
    return MATERIALS[color as keyof typeof MATERIALS] || new THREE.MeshStandardMaterial({ color })
  }, [color, hovered, active])

  return (
    <Box {...props} ref={ref} castShadow material={material} />
  )
});

function Rig({ sheetPercentage }: { sheetPercentage: number }) {
  const { controls, scene, viewport } = useThree()
  const [, params] = useRoute('/item/:id')
  const targetPositionRef = useRef(new THREE.Vector3())

  useEffect(() => {
    const cameraControls = controls as CameraControlsImpl | null
    const active = scene.getObjectByName(params?.id!)

    // This factor controls how much the camera moves up when the sheet is open.
    const verticalShiftFactor = -2
    const yOffset = sheetPercentage * verticalShiftFactor

    if (active) {
      // Reuse existing Vector3 instance
      active.getWorldPosition(targetPositionRef.current)
      const { x, y, z } = targetPositionRef.current

      // Adjust distance based on aspect ratio
      const distance = 5 / Math.min(viewport.aspect, 1)

      // Set camera to look at the object from an offset, adjusted for the sheet
      cameraControls?.setLookAt(x, y + 1 + yOffset, z + distance, x, y + yOffset, z, true)
    } else {
      // Adjust distance for the default view, adjusted for the sheet
      const distance = 10 / Math.min(viewport.aspect, 1)
      cameraControls?.setLookAt(0, 2 + yOffset, distance, 0, yOffset, 0, true)
    }
  }, [params?.id, controls, scene, viewport.aspect, sheetPercentage])

  return <CameraControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
}
